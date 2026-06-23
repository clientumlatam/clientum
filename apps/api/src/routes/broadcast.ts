import { Router, type IRouter, type Request, type Response } from "express";
import { db, chatbotConfigsTable, conversationsTable, subscriptionsTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Max recipients per broadcast, per plan (WhatsApp safety limits)
const BROADCAST_LIMITS: Record<string, number> = {
  starter: 100,
  pro: 300,
  business: 500,
  enterprise: 1000,
};

// Delay between messages in ms — keeps WhatsApp happy (~80 msg/min cap)
const BROADCAST_DELAY_MS = 750;

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 && /^[1-9]/.test(digits);
}

router.get("/broadcast/contacts", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const [sub] = await db
    .select({ plan: subscriptionsTable.plan })
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.userId, req.user.id),
        or(eq(subscriptionsTable.status, "active"), eq(subscriptionsTable.status, "trialing")),
      ),
    )
    .limit(1);

  if (!sub || sub.plan === "free") {
    res.status(403).json({ error: "Broadcast disponible desde plan Starter" });
    return;
  }

  const convs = await db
    .select({
      id: conversationsTable.id,
      phoneNumber: conversationsTable.phoneNumber,
      contactName: conversationsTable.contactName,
      channel: conversationsTable.channel,
      leadStatus: conversationsTable.leadStatus,
    })
    .from(conversationsTable)
    .where(and(eq(conversationsTable.userId, req.user.id), eq(conversationsTable.channel, "whatsapp")))
    .orderBy(conversationsTable.lastMessageAt);

  res.json({ contacts: convs });
});

router.post("/broadcast/send", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const [sub] = await db
    .select({ plan: subscriptionsTable.plan })
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.userId, req.user.id),
        or(eq(subscriptionsTable.status, "active"), eq(subscriptionsTable.status, "trialing")),
      ),
    )
    .limit(1);

  if (!sub || sub.plan === "free") {
    res.status(403).json({ error: "Broadcast disponible desde plan Starter" });
    return;
  }

  const plan = sub.plan as string;
  const maxRecipients = BROADCAST_LIMITS[plan] ?? 100;

  const { message, contactIds } = req.body as { message?: string; contactIds?: string[] };
  if (!message?.trim()) {
    res.status(400).json({ error: "Mensaje requerido" });
    return;
  }
  if (!contactIds || contactIds.length === 0) {
    res.status(400).json({ error: "Seleccioná al menos un contacto" });
    return;
  }

  // Rate limit: cap recipients per broadcast
  if (contactIds.length > maxRecipients) {
    res.status(400).json({
      error: `Tu plan ${plan} permite enviar hasta ${maxRecipients} mensajes por broadcast. Seleccioná menos contactos.`,
    });
    return;
  }

  const [config] = await db
    .select()
    .from(chatbotConfigsTable)
    .where(eq(chatbotConfigsTable.userId, req.user.id))
    .limit(1);

  if (!config?.evolutionApiUrl || !config?.evolutionApiKey || !config?.evolutionInstance) {
    res.status(400).json({ error: "Configurá la API de WhatsApp (Evolution API) en la sección Chatbot antes de hacer broadcast" });
    return;
  }

  const allContacts = await db
    .select({ id: conversationsTable.id, phoneNumber: conversationsTable.phoneNumber })
    .from(conversationsTable)
    .where(and(eq(conversationsTable.userId, req.user.id), eq(conversationsTable.channel, "whatsapp")));

  const targets = allContacts.filter((c) => contactIds.includes(c.id));

  const results: { phone: string; ok: boolean; error?: string }[] = [];

  for (const contact of targets) {
    const phone = contact.phoneNumber.replace(/\D/g, "");

    // Skip invalid phone numbers
    if (!isValidPhone(phone)) {
      results.push({ phone, ok: false, error: "Número de teléfono inválido" });
      continue;
    }

    const url = `${config.evolutionApiUrl.replace(/\/$/, "")}/message/sendText/${config.evolutionInstance}`;
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: config.evolutionApiKey,
        },
        body: JSON.stringify({ number: phone, text: message }),
        signal: AbortSignal.timeout(10000),
      });
      results.push({ phone, ok: r.ok });
      if (!r.ok) {
        logger.warn({ phone, status: r.status }, "[broadcast] send failed");
      }
    } catch (err) {
      results.push({ phone, ok: false, error: err instanceof Error ? err.message : "Error" });
      logger.warn({ phone, err }, "[broadcast] send error");
    }

    // Throttle: wait between messages to respect WhatsApp rate limits
    await new Promise((resolve) => setTimeout(resolve, BROADCAST_DELAY_MS));
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  logger.info({ userId: req.user.id, sent, failed, plan }, "[broadcast] completed");

  res.json({ sent, failed, results });
});

export default router;
