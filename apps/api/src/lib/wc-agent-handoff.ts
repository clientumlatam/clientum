import { db, wcAgentSessionsTable, agentHandoffsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sendWhatsAppMessage } from "./wc-agent-whatsapp.js";
import type { TenantConfig } from "./woocommerce-ai-agent.js";

export type SessionMode = "bot" | "human" | "identifying";

export interface HandoffTrigger {
  reason: "refund" | "escalation" | "manual" | "keyword";
  summary?: string;
}

const HANDOFF_KEYWORDS = [
  "hablar con una persona", "hablar con un humano", "quiero un agente",
  "operador", "asesor", "supervisor", "no me ayudás",
  "esto no funciona", "estoy harto", "me están estafando",
];

export function detectHandoffTrigger(message: string): HandoffTrigger | null {
  const m = message.toLowerCase();
  if (HANDOFF_KEYWORDS.some(kw => m.includes(kw))) return { reason: "escalation" };
  if (/\b(devoluci[oó]n|reembolso|refund)\b/.test(m)) return { reason: "refund" };
  return null;
}

async function summarizeConversation(history: { role: string; content: string }[], openrouterKey: string): Promise<string> {
  if (!history.length) return "Sin historial.";
  const transcript = history.map(m => `${m.role === "user" ? "Cliente" : "Bot"}: ${m.content}`).join("\n");
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openrouterKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://clientum.com.ar", "X-Title": "Clientum Handoff" },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1:free",
        messages: [
          { role: "system", content: "Resumí la conversación en máximo 3 oraciones para el agente humano que tomará el caso. Incluí el problema principal y el estado actual." },
          { role: "user",   content: transcript },
        ],
        max_tokens: 200,
      }),
    });
    const data: any = await res.json();
    return data.choices?.[0]?.message?.content ?? transcript.slice(0, 300);
  } catch { return transcript.slice(0, 300); }
}

export async function triggerHandoff(params: {
  tenantId:          string;
  sessionId:         number;
  waJid:             string;
  trigger:           HandoffTrigger;
  history:           { role: string; content: string }[];
  openrouterKey:     string;
  evolutionApiUrl:   string;
  evolutionApiKey:   string;
  evolutionInstance: string;
  agentNotifyJid?:   string;
}): Promise<void> {
  const { tenantId, sessionId, waJid, trigger, history, openrouterKey, evolutionApiUrl, evolutionApiKey, evolutionInstance, agentNotifyJid } = params;

  await db.update(wcAgentSessionsTable).set({ mode: "human", updatedAt: new Date() }).where(eq(wcAgentSessionsTable.id, sessionId));

  const summary = await summarizeConversation(history, openrouterKey);

  await db.insert(agentHandoffsTable).values({ tenantId, sessionId, waJid, reason: trigger.reason, status: "pending", summary });

  const clientMsg = trigger.reason === "refund"
    ? "✅ Entendido. Para gestionar tu devolución necesito pasarte con un agente. Te contactan en los próximos minutos."
    : "👋 Te conecto con un agente ahora. Un momento por favor.";
  await sendWhatsAppMessage(evolutionApiUrl, evolutionApiKey, evolutionInstance, waJid, clientMsg);

  if (agentNotifyJid) {
    const phone = waJid.replace("@s.whatsapp.net", "");
    const agentMsg = `🔔 *Nuevo caso — ${trigger.reason === "refund" ? "Devolución" : "Escalación"}*\n\n*Cliente:* +${phone}\n*Resumen:* ${summary}\n\nRespondele directamente o tomá el caso desde el panel.`;
    await sendWhatsAppMessage(evolutionApiUrl, evolutionApiKey, evolutionInstance, agentNotifyJid, agentMsg);
  }
}

export async function startIdentificationFlow(params: {
  sessionId:       number;
  waJid:           string;
  storeName:       string;
  evolutionApiUrl: string;
  evolutionApiKey: string;
  instance:        string;
}): Promise<void> {
  await db.update(wcAgentSessionsTable)
    .set({ mode: "identifying", pendingIdentification: true, updatedAt: new Date() })
    .where(eq(wcAgentSessionsTable.id, params.sessionId));
  const msg = `¡Hola! 👋 Soy el asistente de ${params.storeName}.\n\nPara ayudarte mejor con tu pedido, ¿me podés decir tu *email* con el que compraste?`;
  await sendWhatsAppMessage(params.evolutionApiUrl, params.evolutionApiKey, params.instance, params.waJid, msg);
}

export async function handleIdentificationResponse(params: {
  message:         string;
  session:         any;
  tenantConfig:    TenantConfig;
  evolutionApiUrl: string;
  evolutionApiKey: string;
  instance:        string;
}): Promise<boolean> {
  const { message, session, tenantConfig, evolutionApiUrl, evolutionApiKey, instance } = params;
  const emailMatch = message.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  if (!emailMatch) return false;

  const email = emailMatch[0].toLowerCase();
  const auth  = `Basic ${Buffer.from(`${tenantConfig.wcKey}:${tenantConfig.wcSecret}`).toString("base64")}`;
  try {
    const res = await fetch(`${tenantConfig.wcBaseUrl}/customers?email=${encodeURIComponent(email)}`, { headers: { Authorization: auth } });
    const customers: any[] = await res.json();
    if (!customers.length) {
      await sendWhatsAppMessage(evolutionApiUrl, evolutionApiKey, instance, session.waJid, "No encontré una cuenta con ese email. ¿Podés verificarlo o continuamos sin cuenta?");
      await db.update(wcAgentSessionsTable).set({ mode: "bot", pendingIdentification: false, updatedAt: new Date() }).where(eq(wcAgentSessionsTable.id, session.id));
      return true;
    }
    const customer = customers[0];
    await db.update(wcAgentSessionsTable)
      .set({ customerId: customer.id, mode: "bot", pendingIdentification: false, updatedAt: new Date() })
      .where(eq(wcAgentSessionsTable.id, session.id));
    await sendWhatsAppMessage(evolutionApiUrl, evolutionApiKey, instance, session.waJid, `¡Perfecto, ${customer.first_name || "cliente"}! Ya te reconocí. ¿En qué te puedo ayudar hoy?`);
    return true;
  } catch { return false; }
}

export async function routeIncomingMessage(params: {
  userText:        string;
  session:         any;
  tenantConfig:    TenantConfig;
  tenantRow:       any;
  agentNotifyJid?: string;
}): Promise<"handled" | "passthrough"> {
  const { userText, session, tenantConfig, tenantRow, agentNotifyJid } = params;
  const evo = { url: tenantRow.evolutionApiUrl as string, key: tenantRow.evolutionApiKey as string, instance: tenantRow.evolutionInstance as string };

  if (session.mode === "identifying") {
    const resolved = await handleIdentificationResponse({ message: userText, session, tenantConfig, evolutionApiUrl: evo.url, evolutionApiKey: evo.key, instance: evo.instance });
    return resolved ? "handled" : "passthrough";
  }

  if (session.mode === "human") {
    if (agentNotifyJid) {
      const phone = session.waJid.replace("@s.whatsapp.net", "");
      await sendWhatsAppMessage(evo.url, evo.key, evo.instance, agentNotifyJid, `📩 Nuevo mensaje de +${phone}:\n"${userText}"`);
    }
    return "handled";
  }

  const handoffTrigger = detectHandoffTrigger(userText);
  if (handoffTrigger) {
    await triggerHandoff({
      tenantId:          tenantConfig.tenantId,
      sessionId:         session.id,
      waJid:             session.waJid,
      trigger:           handoffTrigger,
      history:           session.history ?? [],
      openrouterKey:     tenantConfig.openrouterKey,
      evolutionApiUrl:   evo.url,
      evolutionApiKey:   evo.key,
      evolutionInstance: evo.instance,
      agentNotifyJid,
    });
    return "handled";
  }

  if (!session.customerId && !((session.history as unknown as any[]) ?? []).length) {
    await startIdentificationFlow({ sessionId: session.id, waJid: session.waJid, storeName: tenantConfig.storeName, evolutionApiUrl: evo.url, evolutionApiKey: evo.key, instance: evo.instance });
    return "handled";
  }

  return "passthrough";
}
