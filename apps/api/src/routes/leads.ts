import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { db, conversationsTable, chatbotConfigsTable } from "@workspace/db";
import { eq, and, desc, isNull, count } from "drizzle-orm";
import { sendWhatsAppReply } from "../lib/openrouter";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const STAGE_MESSAGES: Record<string, string> = {
  propuesta:
    "¡Hola {name}! 👋 Queremos hacerte llegar una propuesta personalizada para tu negocio. ¿Cuándo sería un buen momento para conversar? Podés respondernos por acá 🙌",
  cerrado_ganado:
    "¡{name}, bienvenido/a a bordo! 🎉 Gracias por confiar en nosotros. En breve nos ponemos en contacto para arrancar juntos. ¡Vamos a crecer!",
};

async function sendLeadNotification(
  userId: string,
  phone: string,
  name: string | null,
  stage: string
): Promise<void> {
  const msgTemplate = STAGE_MESSAGES[stage];
  if (!msgTemplate) return;

  const [config] = await db
    .select({
      evolutionApiUrl: chatbotConfigsTable.evolutionApiUrl,
      evolutionApiKey: chatbotConfigsTable.evolutionApiKey,
      evolutionInstance: chatbotConfigsTable.evolutionInstance,
    })
    .from(chatbotConfigsTable)
    .where(eq(chatbotConfigsTable.userId, userId))
    .limit(1);

  if (!config?.evolutionInstance || !config.evolutionApiUrl) return;

  const firstName = (name ?? "").split(" ")[0] || "hola";
  const msg = msgTemplate.replace("{name}", firstName);

  await sendWhatsAppReply({
    evolutionApiUrl: config.evolutionApiUrl,
    evolutionApiKey: config.evolutionApiKey,
    instance: config.evolutionInstance,
    to: phone,
    text: msg,
  });
}

router.get("/leads/stats", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const all = await db.select({ leadStatus: conversationsTable.leadStatus })
    .from(conversationsTable)
    .where(and(eq(conversationsTable.userId, req.user.id), isNull(conversationsTable.deletedAt)));

  const byStatus: Record<string, number> = {};
  for (const row of all) {
    byStatus[row.leadStatus] = (byStatus[row.leadStatus] ?? 0) + 1;
  }

  res.json({ total: all.length, byStatus });
});

router.get("/leads", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const { limit: limitParam, offset: offsetParam } = req.query as { limit?: string; offset?: string };
  const limit = Math.min(Math.max(parseInt(limitParam ?? "50", 10) || 50, 1), 200);
  const offset = Math.max(parseInt(offsetParam ?? "0", 10) || 0, 0);

  const whereClause = and(eq(conversationsTable.userId, req.user.id), isNull(conversationsTable.deletedAt));

  const [[{ total }], leads] = await Promise.all([
    db.select({ total: count() }).from(conversationsTable).where(whereClause),
    db.select().from(conversationsTable).where(whereClause)
      .orderBy(desc(conversationsTable.lastMessageAt))
      .limit(limit)
      .offset(offset),
  ]);

  res.json({ leads, total: Number(total), limit, offset, hasMore: offset + limit < Number(total) });
});

router.post("/leads", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const { contactName, phoneNumber, channel, leadStatus, leadNotes } = req.body as {
    contactName?: string;
    phoneNumber?: string;
    channel?: string;
    leadStatus?: string;
    leadNotes?: string;
  };

  const id = crypto.randomUUID();
  const phone = phoneNumber?.trim() || `manual_${id.slice(0, 8)}`;

  try {
    const [lead] = await db.insert(conversationsTable).values({
      id,
      userId: req.user.id,
      phoneNumber: phone,
      contactName: contactName?.trim() || "Sin nombre",
      channel: channel ?? "manual",
      leadStatus: leadStatus ?? "nuevo",
      leadNotes: leadNotes ?? "",
    }).returning();

    res.status(201).json({ lead });
  } catch (e: unknown) {
    logger.error({ err: e }, "Error creando lead");
    res.status(500).json({ error: "Error al crear el lead" });
  }
});

router.patch("/leads/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const id = String(req.params["id"]);
  const { leadStatus, leadNotes, contactName } = req.body as {
    leadStatus?: string;
    leadNotes?: string;
    contactName?: string;
  };

  const updates: Record<string, unknown> = {};
  if (leadStatus !== undefined) updates["leadStatus"] = leadStatus;
  if (leadNotes !== undefined) updates["leadNotes"] = leadNotes;
  if (contactName !== undefined) updates["contactName"] = contactName;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nada que actualizar" }); return;
  }

  const [before] = await db.select({
    leadStatus: conversationsTable.leadStatus,
    phoneNumber: conversationsTable.phoneNumber,
    contactName: conversationsTable.contactName,
  })
    .from(conversationsTable)
    .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, req.user.id)))
    .limit(1);

  if (!before) { res.status(404).json({ error: "Lead no encontrado" }); return; }

  const [updated] = await db.update(conversationsTable)
    .set(updates)
    .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, req.user.id)))
    .returning();

  res.json({ lead: updated });

  const stageChanged = leadStatus && leadStatus !== before.leadStatus;
  const isNotifiableStage = leadStatus === "propuesta" || leadStatus === "cerrado_ganado";
  const phoneIsReal = !before.phoneNumber.startsWith("manual_") && !before.phoneNumber.startsWith("sin-tel-");

  if (stageChanged && isNotifiableStage && phoneIsReal) {
    const name = (contactName ?? before.contactName) ?? null;
    sendLeadNotification(req.user.id, before.phoneNumber, name, leadStatus)
      .catch((e: unknown) => logger.warn({ err: e }, `No se pudo enviar notif WA de lead (stage: ${leadStatus})`));
  }
});

router.get("/leads/export", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  try {
    const leads = await db.select().from(conversationsTable)
      .where(eq(conversationsTable.userId, req.user.id))
      .orderBy(desc(conversationsTable.lastMessageAt));

    const escape = (v: string | null | undefined) => {
      const s = v ?? "";
      if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const header = "Nombre,Teléfono,Canal,Estado,Notas,Último mensaje,Creado";
    const rows = leads.map(l =>
      [
        escape(l.contactName),
        escape(l.phoneNumber),
        escape(l.channel),
        escape(l.leadStatus),
        escape(l.leadNotes),
        escape(l.lastMessageAt?.toISOString() ?? ""),
        escape(l.createdAt?.toISOString() ?? ""),
      ].join(",")
    );

    const csv = [header, ...rows].join("\n");
    const filename = `leads-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + csv);
  } catch (err) {
    logger.error({ err }, "Error exportando leads");
    res.status(500).json({ error: "Error al exportar leads" });
  }
});

router.delete("/leads/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const id = String(req.params["id"]);

  const [updated] = await db.update(conversationsTable)
    .set({ deletedAt: new Date() })
    .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, req.user.id), isNull(conversationsTable.deletedAt)))
    .returning({ id: conversationsTable.id });

  if (!updated) { res.status(404).json({ error: "Lead no encontrado" }); return; }

  res.json({ ok: true });
});

export default router;
