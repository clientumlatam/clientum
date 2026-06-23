import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { db, appointmentsTable, scheduledMessagesTable, subscriptionsTable, chatbotConfigsTable } from "@workspace/db";
import { eq, and, or, desc, gte, lte, isNull, count } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendWhatsAppReply } from "../lib/openrouter";
import { normalizeArgPhone } from "../lib/phone";

const router: IRouter = Router();

router.get("/appointments", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const { status, from, to, limit: limitParam, offset: offsetParam } = req.query as { status?: string; from?: string; to?: string; limit?: string; offset?: string };
  const limit = Math.min(Math.max(parseInt(limitParam ?? "50", 10) || 50, 1), 200);
  const offset = Math.max(parseInt(offsetParam ?? "0", 10) || 0, 0);

  const conditions = [eq(appointmentsTable.userId, req.user.id), isNull(appointmentsTable.deletedAt)];
  if (status && status !== "all") conditions.push(eq(appointmentsTable.status, status));
  if (from) conditions.push(gte(appointmentsTable.scheduledAt, new Date(from)));
  if (to) conditions.push(lte(appointmentsTable.scheduledAt, new Date(to)));

  const [[{ total }], appointments] = await Promise.all([
    db.select({ total: count() }).from(appointmentsTable).where(and(...conditions)),
    db.select().from(appointmentsTable).where(and(...conditions))
      .orderBy(desc(appointmentsTable.scheduledAt))
      .limit(limit)
      .offset(offset),
  ]);

  res.json({ appointments, total: Number(total), limit, offset, hasMore: offset + limit < Number(total) });
});

router.post("/appointments", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const [sub] = await db.select({ plan: subscriptionsTable.plan })
    .from(subscriptionsTable)
    .where(and(
      eq(subscriptionsTable.userId, req.user.id),
      or(eq(subscriptionsTable.status, "active"), eq(subscriptionsTable.status, "trialing")),
    )).limit(1);

  if (!sub || sub.plan === "free") {
    res.status(403).json({ error: "Turnos disponible desde plan Starter" });
    return;
  }

  const { contactName, contactPhone, contactEmail, serviceType, notes, scheduledAt, durationMinutes } = req.body as {
    contactName: string;
    contactPhone: string;
    contactEmail?: string;
    serviceType?: string;
    notes?: string;
    scheduledAt: string;
    durationMinutes?: number;
  };

  if (!contactName || !contactPhone || !scheduledAt) {
    res.status(400).json({ error: "Nombre, teléfono y fecha son requeridos" });
    return;
  }

  const id = crypto.randomUUID();
  await db.insert(appointmentsTable).values({
    id,
    userId: req.user.id,
    contactName,
    contactPhone: normalizeArgPhone(contactPhone),
    contactEmail: contactEmail ?? null,
    serviceType: serviceType ?? "Consulta",
    notes: notes ?? "",
    scheduledAt: new Date(scheduledAt),
    durationMinutes: durationMinutes ?? 60,
    status: "pending",
  });

  const [appointment] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id)).limit(1);

  const reminderDate = new Date(new Date(scheduledAt).getTime() - 24 * 60 * 60 * 1000);
  if (reminderDate > new Date()) {
    await db.insert(scheduledMessagesTable).values({
      id: crypto.randomUUID(),
      userId: req.user.id,
      phoneNumber: normalizeArgPhone(contactPhone),
      contactName,
      message: `Hola ${contactName}! Te recordamos que tenés un turno mañana para *${serviceType ?? "Consulta"}*. ¿Confirmás tu asistencia? 📅`,
      scheduledAt: reminderDate,
      type: "appointment_reminder",
    });
  }

  res.json({ appointment });
});

router.patch("/appointments/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const id = String(req.params["id"]);
  const [existing] = await db.select({ id: appointmentsTable.id, userId: appointmentsTable.userId })
    .from(appointmentsTable).where(eq(appointmentsTable.id, id)).limit(1);

  if (!existing || existing.userId !== req.user.id) {
    res.status(404).json({ error: "Turno no encontrado" });
    return;
  }

  const { status, notes, scheduledAt, serviceType, contactName, contactPhone } = req.body as {
    status?: string;
    notes?: string;
    scheduledAt?: string;
    serviceType?: string;
    contactName?: string;
    contactPhone?: string;
  };

  const fields: Record<string, unknown> = {};
  if (status) fields.status = status;
  if (notes !== undefined) fields.notes = notes;
  if (scheduledAt) fields.scheduledAt = new Date(scheduledAt);
  if (serviceType) fields.serviceType = serviceType;
  if (contactName) fields.contactName = contactName;
  if (contactPhone) fields.contactPhone = normalizeArgPhone(contactPhone);

  await db.update(appointmentsTable).set(fields).where(eq(appointmentsTable.id, id));

  if (status === "confirmed") {
    const [appt] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id)).limit(1);
    const [config] = await db.select({
      evolutionApiUrl: chatbotConfigsTable.evolutionApiUrl,
      evolutionApiKey: chatbotConfigsTable.evolutionApiKey,
      evolutionInstance: chatbotConfigsTable.evolutionInstance,
    }).from(chatbotConfigsTable).where(eq(chatbotConfigsTable.userId, req.user.id)).limit(1);

    if (config?.evolutionInstance && appt) {
      const dateStr = new Date(appt.scheduledAt).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });
      const msg = `✅ Tu turno para *${appt.serviceType}* ha sido *confirmado* para el ${dateStr}. ¡Te esperamos!`;
      await sendWhatsAppReply({
        evolutionApiUrl: config.evolutionApiUrl,
        evolutionApiKey: config.evolutionApiKey,
        instance: config.evolutionInstance,
        to: appt.contactPhone,
        text: msg,
      }).catch((e: unknown) => logger.warn({ err: e }, "No se pudo enviar confirmación WA"));
    }
  }

  res.json({ ok: true });
});

router.delete("/appointments/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const id = String(req.params["id"]);
  const [existing] = await db.select({ userId: appointmentsTable.userId })
    .from(appointmentsTable).where(eq(appointmentsTable.id, id)).limit(1);

  if (!existing || existing.userId !== req.user.id) {
    res.status(404).json({ error: "Turno no encontrado" });
    return;
  }

  await db.update(appointmentsTable)
    .set({ deletedAt: new Date() })
    .where(eq(appointmentsTable.id, id));

  await db.update(scheduledMessagesTable)
    .set({ cancelledAt: new Date(), status: "cancelled" })
    .where(and(
      eq(scheduledMessagesTable.userId, req.user.id),
      eq(scheduledMessagesTable.type, "appointment_reminder"),
    ));

  res.json({ ok: true });
});

router.get("/appointments/stats", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const all = await db.select({ status: appointmentsTable.status })
    .from(appointmentsTable).where(eq(appointmentsTable.userId, req.user.id));

  const stats = {
    total: all.length,
    pending: all.filter(a => a.status === "pending").length,
    confirmed: all.filter(a => a.status === "confirmed").length,
    completed: all.filter(a => a.status === "completed").length,
    cancelled: all.filter(a => a.status === "cancelled").length,
  };

  res.json({ stats });
});

export default router;
