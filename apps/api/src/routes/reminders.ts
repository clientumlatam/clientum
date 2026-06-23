import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { db, scheduledMessagesTable, chatbotConfigsTable, subscriptionsTable, conversationsTable } from "@workspace/db";
import { eq, and, or, desc, gte } from "drizzle-orm";
import { sendWhatsAppReply } from "../lib/openrouter";
import { logger } from "../lib/logger";
import { normalizeArgPhone } from "../lib/phone";

const router: IRouter = Router();

router.get("/reminders", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const msgs = await db.select().from(scheduledMessagesTable)
    .where(and(
      eq(scheduledMessagesTable.userId, req.user.id),
      or(eq(scheduledMessagesTable.type, "reminder"), eq(scheduledMessagesTable.type, "follow_up")),
    ))
    .orderBy(desc(scheduledMessagesTable.createdAt))
    .limit(200);

  res.json({ reminders: msgs });
});

router.post("/reminders", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const [sub] = await db.select({ plan: subscriptionsTable.plan })
    .from(subscriptionsTable)
    .where(and(
      eq(subscriptionsTable.userId, req.user.id),
      or(eq(subscriptionsTable.status, "active"), eq(subscriptionsTable.status, "trialing")),
    )).limit(1);

  if (!sub || sub.plan === "free") {
    res.status(403).json({ error: "Recordatorios disponibles desde plan Starter" });
    return;
  }

  const { phoneNumber, contactName, message, scheduledAt, type } = req.body as {
    phoneNumber: string;
    contactName?: string;
    message: string;
    scheduledAt: string;
    type?: string;
  };

  if (!phoneNumber || !message || !scheduledAt) {
    res.status(400).json({ error: "Teléfono, mensaje y fecha son requeridos" });
    return;
  }

  if (new Date(scheduledAt) <= new Date()) {
    res.status(400).json({ error: "La fecha debe ser en el futuro" });
    return;
  }

  const id = crypto.randomUUID();
  await db.insert(scheduledMessagesTable).values({
    id,
    userId: req.user.id,
    phoneNumber: normalizeArgPhone(phoneNumber),
    contactName: contactName ?? null,
    message,
    scheduledAt: new Date(scheduledAt),
    type: type ?? "reminder",
    status: "pending",
  });

  const [reminder] = await db.select().from(scheduledMessagesTable).where(eq(scheduledMessagesTable.id, id)).limit(1);
  res.json({ reminder });
});

router.delete("/reminders/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const id = String(req.params["id"]);
  const [existing] = await db.select({ userId: scheduledMessagesTable.userId, status: scheduledMessagesTable.status })
    .from(scheduledMessagesTable).where(eq(scheduledMessagesTable.id, id)).limit(1);

  if (!existing || existing.userId !== req.user.id) {
    res.status(404).json({ error: "Recordatorio no encontrado" });
    return;
  }

  if (existing.status === "sent") {
    res.status(400).json({ error: "No se puede cancelar un recordatorio ya enviado" });
    return;
  }

  await db.update(scheduledMessagesTable)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(eq(scheduledMessagesTable.id, id));

  res.json({ ok: true });
});

router.post("/reminders/follow-up/:conversationId", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const conversationId = String(req.params["conversationId"]);
  const [conv] = await db.select({
    id: conversationsTable.id,
    userId: conversationsTable.userId,
    phoneNumber: conversationsTable.phoneNumber,
    contactName: conversationsTable.contactName,
  }).from(conversationsTable).where(eq(conversationsTable.id, conversationId)).limit(1);

  if (!conv || conv.userId !== req.user.id) {
    res.status(404).json({ error: "Conversación no encontrada" });
    return;
  }

  const { messages } = req.body as { messages?: { delay: string; text: string }[] };
  const defaultSequence = [
    { delayHours: 1, text: `Hola ${conv.contactName ?? ""}! Te escribimos del equipo. ¿Pudimos resolver tu consulta? 😊` },
    { delayHours: 24, text: `Hola ${conv.contactName ?? ""}! Queríamos saber si necesitás algo más de nuestra parte. ¡Estamos a tu disposición!` },
    { delayHours: 72, text: `Hola ${conv.contactName ?? ""}! Última vez que te contactamos. Si en algún momento necesitás ayuda, ¡acá estamos! 🙌` },
  ];

  const now = new Date();
  for (let i = 0; i < defaultSequence.length; i++) {
    const step = defaultSequence[i];
    const scheduledAt = new Date(now.getTime() + step.delayHours * 60 * 60 * 1000);
    await db.insert(scheduledMessagesTable).values({
      id: crypto.randomUUID(),
      userId: req.user.id,
      conversationId: conv.id,
      phoneNumber: conv.phoneNumber,
      contactName: conv.contactName ?? undefined,
      message: step.text,
      scheduledAt,
      type: "follow_up",
      followUpStep: i + 1,
      status: "pending",
    });
  }

  res.json({ ok: true, scheduled: defaultSequence.length });
});

export async function processScheduledMessages(): Promise<void> {
  const due = await db.select().from(scheduledMessagesTable)
    .where(and(
      eq(scheduledMessagesTable.status, "pending"),
      gte(scheduledMessagesTable.scheduledAt, new Date(0)),
    )).limit(50);

  const now = new Date();
  const toSend = due.filter(m => new Date(m.scheduledAt) <= now);

  for (const msg of toSend) {
    try {
      const [config] = await db.select({
        evolutionApiUrl: chatbotConfigsTable.evolutionApiUrl,
        evolutionApiKey: chatbotConfigsTable.evolutionApiKey,
        evolutionInstance: chatbotConfigsTable.evolutionInstance,
      }).from(chatbotConfigsTable).where(eq(chatbotConfigsTable.userId, msg.userId)).limit(1);

      if (!config?.evolutionInstance) {
        await db.update(scheduledMessagesTable).set({ status: "failed" }).where(eq(scheduledMessagesTable.id, msg.id));
        continue;
      }

      await sendWhatsAppReply({
        evolutionApiUrl: config.evolutionApiUrl,
        evolutionApiKey: config.evolutionApiKey,
        instance: config.evolutionInstance,
        to: msg.phoneNumber,
        text: msg.message,
      });

      await db.update(scheduledMessagesTable)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(scheduledMessagesTable.id, msg.id));

      if (msg.type === "follow_up" && msg.conversationId) {
        const laterSteps = await db.select({ id: scheduledMessagesTable.id })
          .from(scheduledMessagesTable)
          .where(and(
            eq(scheduledMessagesTable.conversationId, msg.conversationId),
            eq(scheduledMessagesTable.type, "follow_up"),
            eq(scheduledMessagesTable.status, "pending"),
          ));
        logger.info({ count: laterSteps.length, convId: msg.conversationId }, "Follow-up sent, later steps still pending");
      }

      logger.info({ id: msg.id, type: msg.type, to: msg.phoneNumber }, "Scheduled message sent");
    } catch (err) {
      logger.error({ err, id: msg.id }, "Failed to send scheduled message");
      await db.update(scheduledMessagesTable).set({ status: "failed" }).where(eq(scheduledMessagesTable.id, msg.id));
    }
  }
}

export async function cancelFollowUpsForConversation(conversationId: string): Promise<void> {
  await db.update(scheduledMessagesTable)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(and(
      eq(scheduledMessagesTable.conversationId, conversationId),
      eq(scheduledMessagesTable.type, "follow_up"),
      eq(scheduledMessagesTable.status, "pending"),
    ));
}

export default router;
