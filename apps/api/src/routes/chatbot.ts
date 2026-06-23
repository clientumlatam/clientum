import { Router, type IRouter, type Request, type Response } from "express";
import { cancelFollowUpsForConversation } from "./reminders";
import crypto from "crypto";
import { parse as parseCSV } from "csv-parse/sync";
import { db, chatbotConfigsTable, conversationsTable, messagesTable, subscriptionsTable, usersTable, flowsTable, knowledgeItemsTable } from "@workspace/db";
import { sendWidgetActivatedEmail } from "../lib/email";
import { eq, desc, and, or, ilike, count, gte } from "drizzle-orm";
import type { FlowNode } from "@workspace/db";
import { chatCompletion, sendWhatsAppReply, sendWhatsAppTyping, modelForPlan, openaiModelForPlan } from "../lib/openrouter";
import { transcribeAudioBase64 } from "../lib/audio.js";
import { logger } from "../lib/logger.js";
import { normalizeArgPhone } from "../lib/phone.js";

const router: IRouter = Router();

const PLAN_MONTHLY_LIMITS: Record<string, number> = {
  free: 50,
  starter: 500,
  pro: 2000,
  business: 10000,
  enterprise: Infinity,
};


const INJECTION_PATTERNS: { pattern: RegExp; type: string }[] = [
  { pattern: /ignore (your |all )?(previous |prior )?instructions/gi, type: "instruction_override" },
  { pattern: /you are now (a |in )?(developer|admin|root|jailbreak|DAN|unrestricted)/gi, type: "persona_switch" },
  { pattern: /\[system\]|\[INST\]|\[\/INST\]|<\|system\|>/gi, type: "template_injection" },
  { pattern: /act as (an? )?(unfiltered|unrestricted|evil|malicious)/gi, type: "persona_switch" },
  { pattern: /forget (your |all )?(previous |prior )?instructions/gi, type: "instruction_override" },
];

function detectPromptInjection(text: string): string | null {
  for (const { pattern, type } of INJECTION_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) return type;
  }
  return null;
}

async function resolveOpenRouterKey(ownerUserId: string): Promise<string> {
  const clientumKey = process.env.OPENROUTER_API_KEY_CLIENTUM;
  if (clientumKey) {
    const [owner] = await db.select({ email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, ownerUserId)).limit(1);
    if (owner?.email?.endsWith("@clientum.com.ar")) {
      return clientumKey;
    }
  }
  return process.env.OPENROUTER_API_KEY ?? "";
}


function agentSuffix(mode: string): string {
  if (mode === "sales") {
    return `\n\nTu objetivo principal es CALIFICAR LEADS y guiar al cliente hacia una venta. Seguí estos pasos en la conversación:
1. Entendé la necesidad del cliente con preguntas abiertas.
2. Identificá si tiene presupuesto y urgencia.
3. Presentá la solución más adecuada con beneficios concretos.
4. Ofrecé una consulta gratuita o demo.
5. Cerrá el contacto con un WhatsApp o turno.
Sé amable, consultivo y orientado a resultados. Nunca seas agresivo.`;
  }
  return "";
}

router.get("/chatbot/config", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  let [config] = await db.select().from(chatbotConfigsTable)
    .where(eq(chatbotConfigsTable.userId, req.user.id)).limit(1);

  if (config && !config.widgetToken) {
    const token = crypto.randomUUID().replace(/-/g, "");
    await db.update(chatbotConfigsTable)
      .set({ widgetToken: token })
      .where(eq(chatbotConfigsTable.userId, req.user.id));
    config = { ...config, widgetToken: token };
  }

  const [sub] = await db.select({ plan: subscriptionsTable.plan })
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.userId, req.user.id), or(eq(subscriptionsTable.status, "active"), eq(subscriptionsTable.status, "trialing"))))
    .limit(1);

  const plan = sub?.plan ?? "free";

  res.json({
    config: config ?? null,
    suggestedModel: modelForPlan(plan),
    suggestedOpenaiModel: openaiModelForPlan(plan),
    plan,
  });
});

router.get("/chatbot/status", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const [config] = await db.select({
    active: chatbotConfigsTable.active,
    evolutionInstance: chatbotConfigsTable.evolutionInstance,
  }).from(chatbotConfigsTable)
    .where(eq(chatbotConfigsTable.userId, req.user.id)).limit(1);

  const [kbResult] = await db.select({ n: count() }).from(knowledgeItemsTable)
    .where(eq(knowledgeItemsTable.userId, req.user.id));

  const [convResult] = await db.select({ n: count() }).from(conversationsTable)
    .where(eq(conversationsTable.userId, req.user.id));

  const [sub] = await db.select({ plan: subscriptionsTable.plan })
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.userId, req.user.id), or(eq(subscriptionsTable.status, "active"), eq(subscriptionsTable.status, "trialing"))))
    .limit(1);

  const plan = sub?.plan ?? "free";
  const monthlyLimit = PLAN_MONTHLY_LIMITS[plan] ?? PLAN_MONTHLY_LIMITS.free;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [msgResult] = await db
    .select({ n: count() })
    .from(messagesTable)
    .innerJoin(conversationsTable, eq(messagesTable.conversationId, conversationsTable.id))
    .where(and(
      eq(conversationsTable.userId, req.user.id),
      eq(messagesTable.role, "assistant"),
      gte(messagesTable.createdAt, monthStart),
    ));

  res.json({
    configured: !!(config?.evolutionInstance),
    active: config?.active ?? false,
    knowledgeCount: Number(kbResult?.n ?? 0),
    conversationCount: Number(convResult?.n ?? 0),
    plan,
    monthlyMessages: Number(msgResult?.n ?? 0),
    monthlyLimit: isFinite(monthlyLimit) ? monthlyLimit : null,
  });
});

router.put("/chatbot/config", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const {
    evolutionApiUrl, evolutionApiKey, evolutionInstance,
    systemPrompt, active, openaiApiKey, apiProvider, openrouterApiKey,
    agentMode, maxHistory, widgetName, widgetColor, widgetWelcome, guardrailsJson, businessHoursJson,
    weeklyReportEnabled, weeklyReportPhone,
  } = req.body as {
    evolutionApiUrl?: string;
    evolutionApiKey?: string;
    evolutionInstance?: string;
    systemPrompt?: string;
    active?: boolean;
    openaiApiKey?: string;
    apiProvider?: "openrouter" | "openai";
    openrouterApiKey?: string;
    agentMode?: string;
    maxHistory?: number;
    widgetName?: string;
    widgetColor?: string;
    widgetWelcome?: string;
    guardrailsJson?: string;
    businessHoursJson?: string;
    weeklyReportEnabled?: boolean;
    weeklyReportPhone?: string;
  };

  const [existing] = await db.select({
    id: chatbotConfigsTable.id,
    widgetToken: chatbotConfigsTable.widgetToken,
    active: chatbotConfigsTable.active,
  })
    .from(chatbotConfigsTable)
    .where(eq(chatbotConfigsTable.userId, req.user.id))
    .limit(1);

  const fields = {
    ...(evolutionApiUrl !== undefined && { evolutionApiUrl }),
    ...(evolutionApiKey !== undefined && { evolutionApiKey }),
    ...(evolutionInstance !== undefined && { evolutionInstance }),
    ...(systemPrompt !== undefined && { systemPrompt }),
    ...(active !== undefined && { active }),
    ...(openaiApiKey !== undefined && { openaiApiKey }),
    ...(apiProvider !== undefined && { apiProvider }),
    ...(openrouterApiKey !== undefined && { openrouterApiKey }),
    ...(agentMode !== undefined && { agentMode }),
    ...(maxHistory !== undefined && { maxHistory }),
    ...(widgetName !== undefined && { widgetName }),
    ...(widgetColor !== undefined && { widgetColor }),
    ...(widgetWelcome !== undefined && { widgetWelcome }),
    ...(guardrailsJson !== undefined && { guardrailsJson }),
    ...(businessHoursJson !== undefined && { businessHoursJson }),
    ...(weeklyReportEnabled !== undefined && { weeklyReportEnabled }),
    ...(weeklyReportPhone !== undefined && { weeklyReportPhone }),
  };

  const wasInactive = existing ? !existing.active : false;
  const becomesActive = active === true;

  if (existing) {
    await db.update(chatbotConfigsTable).set(fields)
      .where(eq(chatbotConfigsTable.userId, req.user.id));
  } else {
    const newToken = crypto.randomUUID().replace(/-/g, "");
    await db.insert(chatbotConfigsTable).values({
      id: crypto.randomUUID(),
      userId: req.user.id,
      widgetToken: newToken,
      evolutionApiUrl: evolutionApiUrl ?? "",
      evolutionApiKey: evolutionApiKey ?? "",
      evolutionInstance: evolutionInstance ?? "",
      systemPrompt: systemPrompt ?? "Sos un asistente de atención al cliente amable y profesional. Respondé siempre en español argentino, de forma clara y concisa.",
      active: active ?? true,
      openaiApiKey: openaiApiKey ?? "",
      apiProvider: apiProvider ?? "openrouter",
      openrouterApiKey: openrouterApiKey ?? "",
      agentMode: agentMode ?? "support",
      maxHistory: maxHistory ?? 20,
      widgetName: widgetName ?? "Asistente",
      widgetColor: widgetColor ?? "#1A3A80",
      widgetWelcome: widgetWelcome ?? "¡Hola! ¿En qué te puedo ayudar hoy? 👋",
      guardrailsJson: guardrailsJson ?? '{"promptInjectionShield":true,"piiRedaction":false,"contentFilter":true,"ragHallucinationThreshold":true,"bannedWords":""}',
    });
  }

  // Si el usuario acaba de activar el chatbot por primera vez → email de bienvenida
  if (wasInactive && becomesActive && req.user.email) {
    sendWidgetActivatedEmail(req.user.email, req.user.firstName ?? "").catch((e: unknown) => {
      logger.warn({ err: e }, "No se pudo enviar email de activación del widget");
    });
  }

  res.json({ ok: true });
});

router.post("/chatbot/evolution/test-connection", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }
  const { url, apiKey } = req.body as { url: string; apiKey: string };
  if (!url || !apiKey) { res.json({ ok: false, error: "URL y API Key son requeridos" }); return; }
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/instance/fetchInstances`, {
      headers: { apikey: apiKey },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) { res.json({ ok: false, error: `Error ${r.status} — verificá la URL y la API Key` }); return; }
    const data = await r.json() as Array<{ instance?: { instanceName?: string; state?: string } }>;
    const instances = Array.isArray(data)
      ? data.map((i) => ({ name: i.instance?.instanceName ?? "", state: i.instance?.state ?? "close" })).filter((i) => i.name)
      : [];
    res.json({ ok: true, instances });
  } catch {
    res.json({ ok: false, error: `No se pudo conectar a ${url} — verificá que esté accesible` });
  }
});

router.post("/chatbot/evolution/create-instance", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }
  const { url, apiKey, instanceName } = req.body as { url: string; apiKey: string; instanceName: string };
  if (!url || !apiKey || !instanceName) { res.json({ ok: false, error: "Faltan datos" }); return; }
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/instance/create`, {
      method: "POST",
      headers: { apikey: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS" }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await r.json() as { qrcode?: { base64?: string }; error?: string };
    if (!r.ok) { res.json({ ok: false, error: data.error ?? `Error ${r.status}` }); return; }
    res.json({ ok: true, qrCode: data.qrcode?.base64 ?? null });
  } catch {
    res.json({ ok: false, error: "No se pudo crear la instancia" });
  }
});

router.post("/chatbot/evolution/qr", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }
  const { url, apiKey, instanceName } = req.body as { url: string; apiKey: string; instanceName: string };
  if (!url || !apiKey || !instanceName) { res.json({ ok: false, error: "Faltan datos" }); return; }
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/instance/connect/${encodeURIComponent(instanceName)}`, {
      headers: { apikey: apiKey },
      signal: AbortSignal.timeout(8000),
    });
    const data = await r.json() as { base64?: string; code?: string; error?: string; message?: string };
    if (!r.ok) { res.json({ ok: false, error: data.error ?? data.message ?? `Error ${r.status}` }); return; }
    res.json({ ok: true, qrCode: data.base64 ?? null, code: data.code ?? null });
  } catch {
    res.json({ ok: false, error: "No se pudo obtener el QR" });
  }
});

router.post("/chatbot/evolution/connection-state", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }
  const { url, apiKey, instanceName } = req.body as { url: string; apiKey: string; instanceName: string };
  if (!url || !apiKey || !instanceName) { res.json({ ok: false, state: "close", error: "Faltan datos" }); return; }
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/instance/connectionState/${encodeURIComponent(instanceName)}`, {
      headers: { apikey: apiKey },
      signal: AbortSignal.timeout(8000),
    });
    const data = await r.json() as {
      instance?: { state?: string; wuid?: string; profileName?: string };
      profile?: { id?: { user?: string }; name?: string };
      error?: string; message?: string;
    };
    if (!r.ok) { res.json({ ok: false, state: "close", error: data.error ?? data.message ?? `Error ${r.status}` }); return; }
    /* intentar extraer número de teléfono de distintos formatos de respuesta */
    const rawPhone = data.instance?.wuid?.replace("@s.whatsapp.net", "")
      ?? data.profile?.id?.user
      ?? null;
    const profileName = data.instance?.profileName ?? data.profile?.name ?? null;
    res.json({ ok: true, state: data.instance?.state ?? "close", phone: rawPhone, profileName });
  } catch {
    res.json({ ok: false, state: "close" });
  }
});

router.post("/chatbot/evolution/send-test", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }
  const { url, apiKey, instanceName, to } = req.body as { url: string; apiKey: string; instanceName: string; to: string };
  if (!url || !apiKey || !instanceName || !to) { res.json({ ok: false, error: "Faltan datos" }); return; }
  /* normalizar número — quitar caracteres no numéricos */
  const phone = to.replace(/\D/g, "");
  if (!phone) { res.json({ ok: false, error: "Número inválido" }); return; }
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/message/sendText/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      headers: { apikey: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        number: phone,
        textMessage: { text: "✅ ¡Hola! Esta es una prueba de conexión de *Clientum IA*. Tu WhatsApp está vinculado y el chatbot está listo para responder mensajes 🚀" },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await r.json() as { key?: unknown; error?: string; message?: string };
    if (!r.ok) { res.json({ ok: false, error: data.error ?? data.message ?? `Error ${r.status}` }); return; }
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : "Error al enviar" });
  }
});

router.post("/chatbot/evolution/setup-webhook", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }
  const { url, apiKey, instanceName, webhookUrl } = req.body as { url: string; apiKey: string; instanceName: string; webhookUrl: string };
  if (!url || !apiKey || !instanceName || !webhookUrl) { res.json({ ok: false, error: "Faltan datos" }); return; }
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/webhook/set/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      headers: { apikey: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: false,
          webhookBase64: false,
          events: ["MESSAGES_UPSERT"],
        },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) { res.json({ ok: false, error: `Error ${r.status}` }); return; }
    res.json({ ok: true });
  } catch {
    res.json({ ok: false, error: "No se pudo configurar el webhook" });
  }
});

router.post("/chatbot/webhook", async (req: Request, res: Response) => {
  res.status(200).json({ ok: true });

  try {
    const body = req.body as {
      instance?: string;
      data?: {
        key?: { remoteJid?: string; fromMe?: boolean };
        message?: {
          conversation?: string;
          extendedTextMessage?: { text?: string };
          imageMessage?: { caption?: string };
          audioMessage?: { base64?: string; mimetype?: string; [key: string]: unknown };
          pttMessage?: { base64?: string; mimetype?: string; [key: string]: unknown };
          documentMessage?: { title?: string; caption?: string };
          videoMessage?: { caption?: string };
        };
        messageType?: string;
        pushName?: string;
      };
    };

    if (body.data?.key?.fromMe) return;

    const phone = normalizeArgPhone(body.data?.key?.remoteJid?.replace("@s.whatsapp.net", "") ?? "");
    const msgType = body.data?.messageType ?? "conversation";
    const contactName = body.data?.pushName ?? "";
    const instance = body.instance ?? "";

    if (!phone) return;

    let text = "";
    let mediaNote = "";

    if (msgType === "conversation" || msgType === "extendedTextMessage") {
      text = body.data?.message?.conversation
        ?? body.data?.message?.extendedTextMessage?.text ?? "";
    } else if (msgType === "imageMessage") {
      text = body.data?.message?.imageMessage?.caption ?? "[imagen]";
      mediaNote = "[El cliente envió una imagen]";
    } else if (msgType === "audioMessage" || msgType === "pttMessage") {
      const audioMsg = body.data?.message?.audioMessage ?? body.data?.message?.pttMessage;
      const b64 = audioMsg?.base64;
      const transcription = b64 ? await transcribeAudioBase64(b64, audioMsg?.mimetype) : null;
      if (transcription) {
        text = transcription;
        mediaNote = `[El cliente envió una nota de voz. Transcripción: "${transcription.slice(0, 120)}${transcription.length > 120 ? "…" : ""}"]`;
      } else {
        text = "[audio]";
        mediaNote = "[El cliente envió un audio/nota de voz]";
      }
    } else if (msgType === "documentMessage") {
      text = body.data?.message?.documentMessage?.caption
        ?? body.data?.message?.documentMessage?.title ?? "[documento]";
      mediaNote = "[El cliente envió un documento]";
    } else if (msgType === "videoMessage") {
      text = body.data?.message?.videoMessage?.caption ?? "[video]";
      mediaNote = "[El cliente envió un video]";
    }

    if (!phone || !text) return;

    // Prompt injection detection — block and reply without reaching the LLM
    const injectionType = detectPromptInjection(text);
    if (injectionType) {
      logger.warn({ phone, injectionType, text: text.slice(0, 100) }, "[chatbot] prompt injection blocked");
      return;
    }

    const [config] = await db.select().from(chatbotConfigsTable)
      .where(and(
        eq(chatbotConfigsTable.evolutionInstance, instance),
        eq(chatbotConfigsTable.active, true),
      )).limit(1);

    if (!config) return;

    // — Business hours check —
    if (config.businessHoursJson) {
      try {
        const bh = JSON.parse(config.businessHoursJson) as {
          enabled?: boolean;
          timezone?: string;
          schedule?: Record<string, { open: string; close: string; active: boolean }>;
          outsideHoursMessage?: string;
          respectHolidays?: boolean;
        };
        if (bh.enabled) {
          const tz = bh.timezone ?? "America/Argentina/Buenos_Aires";
          const now = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
          const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
          const dayKey = days[now.getDay()];
          const daySchedule = bh.schedule?.[dayKey];
          let isOpen = false;
          if (daySchedule?.active) {
            const [openH, openM] = daySchedule.open.split(":").map(Number);
            const [closeH, closeM] = daySchedule.close.split(":").map(Number);
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            const openMinutes = openH * 60 + openM;
            const closeMinutes = closeH * 60 + closeM;
            isOpen = nowMinutes >= openMinutes && nowMinutes < closeMinutes;
          }
          if (!isOpen && bh.outsideHoursMessage) {
            await sendWhatsAppReply({
              evolutionApiUrl: config.evolutionApiUrl,
              evolutionApiKey: config.evolutionApiKey,
              instance: config.evolutionInstance,
              to: phone,
              text: bh.outsideHoursMessage,
            });
            return;
          }
        }
      } catch { /* ignore parse errors */ }
    }
    // — End business hours check —

    const [sub] = await db.select({ plan: subscriptionsTable.plan })
      .from(subscriptionsTable)
      .where(and(eq(subscriptionsTable.userId, config.userId), or(eq(subscriptionsTable.status, "active"), eq(subscriptionsTable.status, "trialing"))))
      .limit(1);

    const plan = sub?.plan ?? "free";
    const provider = (config.apiProvider as "openrouter" | "openai") ?? "openrouter";
    const model = config.openrouterModel || modelForPlan(plan);
    const maxHistory = config.maxHistory ?? 20;

    // — Monthly message limit check —
    const monthlyLimit = PLAN_MONTHLY_LIMITS[plan] ?? PLAN_MONTHLY_LIMITS.free;
    if (isFinite(monthlyLimit)) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const [{ value: monthlyCount }] = await db
        .select({ value: count() })
        .from(messagesTable)
        .innerJoin(conversationsTable, eq(messagesTable.conversationId, conversationsTable.id))
        .where(and(
          eq(conversationsTable.userId, config.userId),
          eq(messagesTable.role, "assistant"),
          gte(messagesTable.createdAt, monthStart),
        ));
      if ((monthlyCount as number) >= monthlyLimit) {
        logger.warn({ userId: config.userId, plan, monthlyCount, monthlyLimit }, "[chatbot] monthly message limit reached");
        return;
      }
    }
    // — End monthly message limit check —

    let [conv] = await db.select().from(conversationsTable)
      .where(and(
        eq(conversationsTable.userId, config.userId),
        eq(conversationsTable.phoneNumber, phone),
      )).limit(1);

    if (!conv) {
      const [inserted] = await db.insert(conversationsTable).values({
        id: crypto.randomUUID(),
        userId: config.userId,
        phoneNumber: phone,
        contactName: contactName || null,
        lastMessageAt: new Date(),
        leadStatus: "new",
        leadNotes: "",
      }).returning();
      conv = inserted;
    } else {
      await db.update(conversationsTable)
        .set({ lastMessageAt: new Date(), contactName: contactName || conv.contactName })
        .where(eq(conversationsTable.id, conv.id));
      // Cancel pending follow-ups when user replies
      await cancelFollowUpsForConversation(conv.id);
    }

    if (conv.handoffMode) {
      await db.insert(messagesTable).values({
        id: crypto.randomUUID(),
        conversationId: conv.id,
        role: "user",
        content: text,
      });
      return;
    }

    // — Flow matching: check active flows before calling LLM —
    const activeFlows = await db
      .select()
      .from(flowsTable)
      .where(and(eq(flowsTable.userId, config.userId), eq(flowsTable.active, true)))
      .orderBy(flowsTable.priority, flowsTable.createdAt);

    const incomingNorm = text.toLowerCase().trim();
    let matchedFlow: (typeof activeFlows)[0] | null = null;
    for (const flow of activeFlows) {
      const keywords = flow.triggerKeywords
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);
      if (keywords.length === 0) continue;
      const hit = keywords.some((kw) => {
        if (flow.matchType === "exact") return incomingNorm === kw;
        if (flow.matchType === "startsWith") return incomingNorm.startsWith(kw);
        return incomingNorm.includes(kw);
      });
      if (hit) { matchedFlow = flow; break; }
    }

    if (matchedFlow) {
      const nodes = (matchedFlow.nodes as FlowNode[]) ?? [];
      let shouldEscalate = false;
      const flowMessages: string[] = [];
      for (const node of nodes) {
        if (node.type === "sendMessage" && node.content) {
          flowMessages.push(node.content);
        } else if (node.type === "escalate") {
          shouldEscalate = true;
        }
      }
      await db.insert(messagesTable).values({
        id: crypto.randomUUID(),
        conversationId: conv.id,
        role: "user",
        content: text,
      });
      for (const msg of flowMessages) {
        await db.insert(messagesTable).values({
          id: crypto.randomUUID(),
          conversationId: conv.id,
          role: "assistant",
          content: msg,
        });
        await sendWhatsAppReply({
          evolutionApiUrl: config.evolutionApiUrl,
          evolutionApiKey: config.evolutionApiKey,
          instance: config.evolutionInstance,
          to: phone,
          text: msg,
        });
      }
      if (shouldEscalate) {
        await db.update(conversationsTable)
          .set({ handoffMode: true })
          .where(eq(conversationsTable.id, conv.id));
      }
      await db.update(flowsTable)
        .set({ triggeredCount: (matchedFlow.triggeredCount ?? 0) + 1, updatedAt: new Date() })
        .where(eq(flowsTable.id, matchedFlow.id));
      return;
    }
    // — End flow matching —

    if ((msgType === "audioMessage" || msgType === "pttMessage") && text === "[audio]") {
      const audioReply = "¡Hola! Recibí tu nota de voz 🎙️ Por el momento no puedo procesar audios en este canal. Por favor escribí tu consulta en texto y te respondo enseguida. ¡Gracias!";
      await db.insert(messagesTable).values([
        { id: crypto.randomUUID(), conversationId: conv.id, role: "user", content: "[audio]" },
        { id: crypto.randomUUID(), conversationId: conv.id, role: "assistant", content: audioReply },
      ]);
      await sendWhatsAppReply({
        evolutionApiUrl: config.evolutionApiUrl,
        evolutionApiKey: config.evolutionApiKey,
        instance: config.evolutionInstance,
        to: phone,
        text: audioReply,
      });
      return;
    }

    const keywords = text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 3);
    let knowledgeContext = "";
    if (keywords.length > 0) {
      const conditions = keywords.slice(0, 5).map((kw) =>
        or(
          ilike(knowledgeItemsTable.title, `%${kw}%`),
          ilike(knowledgeItemsTable.content, `%${kw}%`),
        )
      );
      const hits = await db.select({ title: knowledgeItemsTable.title, content: knowledgeItemsTable.content })
        .from(knowledgeItemsTable)
        .where(and(
          eq(knowledgeItemsTable.userId, config.userId),
          or(...conditions.filter(Boolean)),
        ))
        .limit(3);

      if (hits.length > 0) {
        knowledgeContext = "\n\n--- Base de conocimiento ---\n"
          + hits.map((h, i) => `[Fuente ${i + 1}: ${h.title}]\n${h.content}`).join("\n\n")
          + "\n---\n"
          + "Si usás información de la base de conocimiento para responder, podés mencionar brevemente la fuente (ej: 'Según nuestras políticas…'). Solo citá si es relevante — no menciones números de fuente directamente.";
      }
    }

    const history = await db.select({ role: messagesTable.role, content: messagesTable.content })
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conv.id))
      .orderBy(desc(messagesTable.createdAt))
      .limit(maxHistory);

    const systemContent = config.systemPrompt
      + agentSuffix(config.agentMode ?? "support")
      + knowledgeContext
      + (mediaNote ? `\n\nNota interna: ${mediaNote}` : "");

    const userContent = msgType === "imageMessage"
      ? `[El cliente envió una imagen${text !== "[imagen]" ? ` con el texto: "${text}"` : ""}]`
      : text;

    const messages = [
      { role: "system" as const, content: systemContent },
      ...history.reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: userContent },
    ];

    await db.insert(messagesTable).values({
      id: crypto.randomUUID(),
      conversationId: conv.id,
      role: "user",
      content: userContent,
    });

    // Send typing indicator before calling LLM (best-effort, non-blocking)
    if (config.evolutionApiUrl && config.evolutionInstance) {
      void sendWhatsAppTyping({
        evolutionApiUrl: config.evolutionApiUrl,
        evolutionApiKey: config.evolutionApiKey,
        instance: config.evolutionInstance,
        to: phone,
        durationMs: 3000,
      });
    }

    const systemApiKey = await resolveOpenRouterKey(config.userId);
    const userOpenrouterKey = config.openrouterApiKey || undefined;
    const reply = await chatCompletion({
      model,
      messages,
      apiKey: userOpenrouterKey ?? systemApiKey,
      provider,
      openaiApiKey: config.openaiApiKey || undefined,
      plan,
    });

    await db.insert(messagesTable).values({
      id: crypto.randomUUID(),
      conversationId: conv.id,
      role: "assistant",
      content: reply,
    });

    await sendWhatsAppReply({
      evolutionApiUrl: config.evolutionApiUrl,
      evolutionApiKey: config.evolutionApiKey,
      instance: config.evolutionInstance,
      to: phone,
      text: reply,
    });
  } catch (err) {
    req.log?.error({ err }, "Chatbot webhook error");
  }
});

router.post("/chatbot/test", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const { messages } = req.body as { messages?: { role: "user" | "assistant"; content: string }[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages requerido" }); return;
  }

  const [config] = await db.select().from(chatbotConfigsTable)
    .where(eq(chatbotConfigsTable.userId, req.user.id))
    .limit(1);

  const [sub] = await db.select({ plan: subscriptionsTable.plan })
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.userId, req.user.id), or(eq(subscriptionsTable.status, "active"), eq(subscriptionsTable.status, "trialing"))))
    .limit(1);

  const plan = sub?.plan ?? "free";
  const provider = (config?.apiProvider as "openrouter" | "openai") ?? "openrouter";
  const model = modelForPlan(plan);
  const basePrompt = config?.systemPrompt ?? "Sos un asistente de atención al cliente amable y profesional. Respondé siempre en español argentino, de forma clara y concisa.";
  const systemPrompt = basePrompt + agentSuffix(config?.agentMode ?? "support");

  const systemApiKey = await resolveOpenRouterKey(req.user.id);
  const userOpenrouterKey = config?.openrouterApiKey || undefined;

  try {
    const reply = await chatCompletion({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      apiKey: userOpenrouterKey ?? systemApiKey,
      provider,
      openaiApiKey: config?.openaiApiKey || undefined,
      plan,
    });

    const modelLabel = provider === "openai"
      ? `openai/${openaiModelForPlan(plan)}`
      : model;

    res.json({ reply, model: modelLabel });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    res.status(503).json({ error: msg });
  }
});

router.get("/chatbot/conversations", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const convs = await db.select().from(conversationsTable)
    .where(eq(conversationsTable.userId, req.user.id))
    .orderBy(desc(conversationsTable.lastMessageAt))
    .limit(50);

  res.json({ conversations: convs });
});

router.get("/chatbot/conversations/:id/messages", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const id = String(req.params["id"]);
  const [conv] = await db.select({ userId: conversationsTable.userId })
    .from(conversationsTable).where(eq(conversationsTable.id, id)).limit(1);

  if (!conv || conv.userId !== req.user.id) {
    res.status(403).json({ error: "Acceso denegado" }); return;
  }

  const msgs = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .orderBy(messagesTable.createdAt);

  res.json({ messages: msgs });
});

router.patch("/chatbot/conversations/:id/lead", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const id = String(req.params["id"]);
  const { leadStatus, leadNotes } = req.body as { leadStatus?: string; leadNotes?: string };

  if (leadStatus === undefined && leadNotes === undefined) {
    res.status(400).json({ error: "leadStatus o leadNotes requerido" }); return;
  }

  const [conv] = await db.select({ userId: conversationsTable.userId })
    .from(conversationsTable).where(eq(conversationsTable.id, id)).limit(1);

  if (!conv || conv.userId !== req.user.id) {
    res.status(403).json({ error: "Acceso denegado" }); return;
  }

  await db.update(conversationsTable).set({
    ...(leadStatus !== undefined && { leadStatus }),
    ...(leadNotes !== undefined && { leadNotes }),
  }).where(eq(conversationsTable.id, id));

  res.json({ ok: true });
});

router.patch("/chatbot/conversations/:id/handoff", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const id = String(req.params["id"]);
  const { handoffMode } = req.body as { handoffMode: boolean };

  const [conv] = await db.select({ userId: conversationsTable.userId })
    .from(conversationsTable).where(eq(conversationsTable.id, id)).limit(1);

  if (!conv || conv.userId !== req.user.id) {
    res.status(403).json({ error: "Acceso denegado" }); return;
  }

  await db.update(conversationsTable).set({ handoffMode }).where(eq(conversationsTable.id, id));
  res.json({ ok: true, handoffMode });
});

router.post("/chatbot/conversations/:id/reply", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const id = String(req.params["id"]);
  const { text } = req.body as { text?: string };
  if (!text?.trim()) { res.status(400).json({ error: "text es requerido" }); return; }

  const [conv] = await db.select().from(conversationsTable)
    .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, req.user.id))).limit(1);

  if (!conv) { res.status(403).json({ error: "Acceso denegado" }); return; }

  const [config] = await db.select().from(chatbotConfigsTable)
    .where(eq(chatbotConfigsTable.userId, req.user.id)).limit(1);

  const [msg] = await db.insert(messagesTable).values({
    id: crypto.randomUUID(),
    conversationId: id,
    role: "assistant",
    content: text.trim(),
  }).returning();

  await db.update(conversationsTable).set({ lastMessageAt: new Date() }).where(eq(conversationsTable.id, id));

  if (config?.evolutionApiUrl && config?.evolutionInstance && conv.channel === "whatsapp" && conv.phoneNumber) {
    try {
      await sendWhatsAppReply({
        evolutionApiUrl: config.evolutionApiUrl,
        evolutionApiKey: config.evolutionApiKey,
        instance: config.evolutionInstance,
        to: conv.phoneNumber,
        text: text.trim(),
      });
    } catch (err) {
      req.log?.warn({ err }, "Manual reply: could not send via Evolution API");
    }
  }

  res.json({ ok: true, message: msg });
});

router.get("/chatbot/knowledge", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const items = await db.select().from(knowledgeItemsTable)
    .where(eq(knowledgeItemsTable.userId, req.user.id))
    .orderBy(desc(knowledgeItemsTable.createdAt))
    .limit(100);

  res.json({ items });
});

router.post("/chatbot/knowledge", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const { title, content } = req.body as { title?: string; content?: string };
  if (!title?.trim() || !content?.trim()) {
    res.status(400).json({ error: "title y content son requeridos" }); return;
  }

  const [item] = await db.insert(knowledgeItemsTable).values({
    id: crypto.randomUUID(),
    userId: req.user.id,
    title: title.trim(),
    content: content.trim(),
  }).returning();

  res.json({ item });
});

router.delete("/chatbot/knowledge/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const id = String(req.params["id"]);
  const [item] = await db.select({ userId: knowledgeItemsTable.userId })
    .from(knowledgeItemsTable).where(eq(knowledgeItemsTable.id, id)).limit(1);

  if (!item || item.userId !== req.user.id) {
    res.status(403).json({ error: "Acceso denegado" }); return;
  }

  await db.delete(knowledgeItemsTable).where(eq(knowledgeItemsTable.id, id));
  res.json({ ok: true });
});


router.post("/chatbot/knowledge/import-url", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const { url } = req.body as { url?: string };
  if (!url?.trim()) { res.status(400).json({ error: "URL requerida" }); return; }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.trim());
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      res.status(400).json({ error: "Solo se permiten URLs http/https" }); return;
    }
  } catch {
    res.status(400).json({ error: "URL inválida" }); return;
  }

  // SSRF protection: block private/loopback IP ranges
  const hostname = parsedUrl.hostname;
  const privatePatterns = [
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/i,
    /^fe80:/i,
    /^localhost$/i,
    /^0\.0\.0\.0$/,
  ];
  if (privatePatterns.some((p) => p.test(hostname))) {
    res.status(400).json({ error: "URL no permitida" }); return;
  }

  try {
    const resp = await fetch(url.trim(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ClientumBot/1.0)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) {
      res.status(400).json({ error: `Error al acceder a la URL: ${resp.status} ${resp.statusText}` }); return;
    }
    const html = await resp.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/\s+/g, " ").trim();

    if (text.length < 100) {
      res.status(400).json({ error: "No se pudo extraer contenido útil de la URL" }); return;
    }

    const domain = parsedUrl.hostname;
    const CHUNK = 1500;
    const inserted = [];
    for (let i = 0; i < Math.min(text.length, CHUNK * 8); i += CHUNK) {
      const chunk = text.slice(i, i + CHUNK).trim();
      if (chunk.length < 50) continue;
      const [item] = await db.insert(knowledgeItemsTable).values({
        id: crypto.randomUUID(),
        userId: req.user.id,
        title: `${domain} — parte ${Math.floor(i / CHUNK) + 1}`,
        content: chunk,
      }).returning();
      inserted.push(item);
    }
    res.json({ items: inserted, count: inserted.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al obtener la URL";
    res.status(400).json({ error: msg });
  }
});

router.post("/chatbot/knowledge/import-file", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const { content, format, filename } = req.body as { content?: string; format?: string; filename?: string };
  if (!content?.trim() || !format) { res.status(400).json({ error: "content y format son requeridos" }); return; }

  const baseName = (filename ?? "Importado").replace(/\.[^.]+$/, "");
  const inserted = [];

  if (format === "csv") {
    let rows: string[][];
    try {
      rows = parseCSV(content, {
        delimiter: [",", ";"],
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true,
        bom: true,
      }) as string[][];
    } catch {
      res.status(400).json({ error: "El archivo CSV tiene un formato inválido" }); return;
    }
    if (rows.length < 2) { res.status(400).json({ error: "El CSV necesita encabezado y al menos una fila de datos" }); return; }
    const headers = rows[0];
    for (let i = 1; i < Math.min(rows.length, 100); i++) {
      const vals = rows[i];
      const title = vals[0]?.trim() || `${baseName} #${i}`;
      const body = headers.map((h, idx) => `${h}: ${vals[idx] ?? ""}`.trim()).filter((s) => s.length > 3).join("\n");
      if (body.length < 10) continue;
      const [item] = await db.insert(knowledgeItemsTable).values({
        id: crypto.randomUUID(), userId: req.user.id, title, content: body,
      }).returning();
      inserted.push(item);
    }
  } else if (format === "xml") {
    const tagRe = /<([a-zA-Z][a-zA-Z0-9_:-]*)[^>]*>([\s\S]*?)<\/\1>/g;
    const entries: { tag: string; text: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(content)) !== null) {
      const innerText = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (innerText.length >= 20 && innerText.length <= 2000) {
        entries.push({ tag: m[1], text: innerText });
      }
    }
    if (entries.length === 0) { res.status(400).json({ error: "No se encontraron datos útiles en el XML" }); return; }
    const CHUNK = 8;
    for (let i = 0; i < Math.min(entries.length, 80); i += CHUNK) {
      const group = entries.slice(i, i + CHUNK);
      const title = `${baseName} (${i + 1}–${i + group.length})`;
      const body = group.map((e) => `[${e.tag}]: ${e.text}`).join("\n\n");
      const [item] = await db.insert(knowledgeItemsTable).values({
        id: crypto.randomUUID(), userId: req.user.id, title, content: body,
      }).returning();
      inserted.push(item);
    }
  } else {
    res.status(400).json({ error: "Formato no soportado. Usá 'csv' o 'xml'" }); return;
  }

  res.json({ items: inserted, count: inserted.length });
});

export default router;
