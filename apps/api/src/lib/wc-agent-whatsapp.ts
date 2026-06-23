import { db, tenantsTable, wcAgentSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { WooCommerceAIAgent, type TenantConfig } from "./woocommerce-ai-agent.js";

export async function getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
  const rows = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
  if (!rows.length || !rows[0].active) return null;
  const t = rows[0];
  return {
    tenantId:             t.id,
    storeName:            t.storeName,
    wcBaseUrl:            t.wcBaseUrl,
    wcKey:                t.wcKey,
    wcSecret:             t.wcSecret,
    openrouterKey:        t.openrouterKey,
    openrouterModel:      t.openrouterModel ?? undefined,
    groqKey:              t.groqKey ?? undefined,
    openaiKey:            t.openaiKey ?? undefined,
    storeLanguage:        t.storeLanguage ?? "es-AR",
    systemPromptOverride: t.systemPromptOverride ?? null,
  };
}

export async function getTenantByEvolutionInstance(instance: string): Promise<string | null> {
  const rows = await db.select({ id: tenantsTable.id }).from(tenantsTable).where(eq(tenantsTable.evolutionInstance, instance)).limit(1);
  return rows[0]?.id ?? null;
}

export async function getOrCreateSession(tenantId: string, waJid: string) {
  const rows = await db.select().from(wcAgentSessionsTable)
    .where(eq(wcAgentSessionsTable.tenantId, tenantId))
    .limit(100);
  const existing = rows.find((r) => r.waJid === waJid);
  if (existing) return existing;

  const inserted = await db.insert(wcAgentSessionsTable)
    .values({ tenantId, waJid, history: [], mode: "bot" })
    .returning();
  return inserted[0];
}

export async function sendWhatsAppMessage(
  evolutionApiUrl: string,
  evolutionApiKey: string,
  instance: string,
  to: string,
  text: string,
): Promise<void> {
  const chunks = text.match(/.{1,1000}(\s|$)/gs) ?? [text];
  for (const chunk of chunks) {
    await fetch(`${evolutionApiUrl}/message/sendText/${instance}`, {
      method: "POST",
      headers: { apikey: evolutionApiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ number: to, text: chunk.trim(), delay: 500 }),
    }).catch(err => console.error("[EVO] sendWhatsAppMessage failed:", err));
  }
}

export async function sendTypingPresence(
  evolutionApiUrl: string,
  evolutionApiKey: string,
  instance: string,
  jid: string,
): Promise<void> {
  await fetch(`${evolutionApiUrl}/chat/sendPresence/${instance}`, {
    method: "POST",
    headers: { apikey: evolutionApiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ number: jid, presence: "composing", delay: 2000 }),
  }).catch(() => {});
}

export async function evolutionWebhookHandler(req: any, res: any): Promise<void> {
  res.status(200).json({ ok: true });

  const payload = req.body;
  if (payload.event !== "messages.upsert") return;
  if (payload.data?.key?.fromMe) return;
  if (!["conversation", "extendedTextMessage"].includes(payload.data?.messageType)) return;

  const userText: string = payload.data?.message?.conversation ?? payload.data?.message?.extendedTextMessage?.text ?? "";
  if (!userText.trim()) return;

  const instance: string = payload.instance ?? req.params["instance"];
  const waJid: string    = payload.data.key.remoteJid;

  try {
    const tenantId = await getTenantByEvolutionInstance(instance);
    if (!tenantId) { console.warn(`[WCAgent] Instancia sin tenant: ${instance}`); return; }

    const [tenantConfig, tenantRows] = await Promise.all([
      getTenantConfig(tenantId),
      db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1),
    ]);
    const tenantRow = tenantRows[0];
    if (!tenantConfig || !tenantRow) return;

    const session = await getOrCreateSession(tenantId, waJid);

    if (tenantRow.evolutionApiUrl && tenantRow.evolutionApiKey) {
      await sendTypingPresence(tenantRow.evolutionApiUrl, tenantRow.evolutionApiKey, instance, waJid);
    }

    const { routeIncomingMessage } = await import("./wc-agent-handoff.js");
    const routeResult = await routeIncomingMessage({
      userText,
      session,
      tenantConfig,
      tenantRow,
      agentNotifyJid: tenantRow.agentNotifyJid ?? undefined,
    });

    if (routeResult === "handled") return;

    const agent     = new WooCommerceAIAgent(tenantConfig);
    const aiResponse = await agent.handleCustomerQuery(userText, session.customerId ?? 0, String(session.id));

    const newHistory = [
      ...(session.history as any[] ?? []),
      { role: "user",      content: userText },
      { role: "assistant", content: aiResponse },
    ].slice(-10);

    await db.update(wcAgentSessionsTable)
      .set({ history: newHistory, updatedAt: new Date() })
      .where(eq(wcAgentSessionsTable.id, session.id));

    if (tenantRow.evolutionApiUrl && tenantRow.evolutionApiKey) {
      await sendWhatsAppMessage(tenantRow.evolutionApiUrl, tenantRow.evolutionApiKey, instance, waJid, aiResponse);
    }
  } catch (err) {
    console.error("[WCAgent] Webhook error:", err);
  }
}
