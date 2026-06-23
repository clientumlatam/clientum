import { db, chatbotConfigsTable, conversationsTable, messagesTable, ordersTable, appointmentsTable } from "@workspace/db";
import { eq, and, gte, count, isNull } from "drizzle-orm";
import { sendWhatsAppReply } from "./openrouter";
import { logger } from "./logger";

const ARGENTINA_TZ = "America/Argentina/Buenos_Aires";

function getArgentinaTime(): { dayOfWeek: number; hour: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ARGENTINA_TZ,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = parts.find(p => p.type === "weekday")?.value ?? "Mon";
  const hour = parseInt(parts.find(p => p.type === "hour")?.value ?? "0", 10);
  return { dayOfWeek: weekdayMap[weekday] ?? 1, hour };
}

let lastSentDate = "";

async function sendWeeklyReports(): Promise<void> {
  const { dayOfWeek, hour } = getArgentinaTime();
  if (dayOfWeek !== 1 || hour !== 9) return;

  const today = new Date().toISOString().slice(0, 10);
  if (lastSentDate === today) return;
  lastSentDate = today;

  logger.info("Sending weekly WhatsApp reports...");

  const configs = await db.select({
    userId: chatbotConfigsTable.userId,
    evolutionApiUrl: chatbotConfigsTable.evolutionApiUrl,
    evolutionApiKey: chatbotConfigsTable.evolutionApiKey,
    evolutionInstance: chatbotConfigsTable.evolutionInstance,
    weeklyReportPhone: chatbotConfigsTable.weeklyReportPhone,
  })
    .from(chatbotConfigsTable)
    .where(eq(chatbotConfigsTable.weeklyReportEnabled, true));

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  for (const cfg of configs) {
    if (!cfg.evolutionApiUrl || !cfg.evolutionInstance || !cfg.weeklyReportPhone) continue;

    try {
      const [[newLeads], [totalMsgs], [newOrders], [newAppts], convRows] = await Promise.all([
        db.select({ total: count() }).from(conversationsTable).where(and(
          eq(conversationsTable.userId, cfg.userId),
          gte(conversationsTable.createdAt, sevenDaysAgo),
          isNull(conversationsTable.deletedAt),
        )),
        db.select({ total: count() }).from(messagesTable)
          .innerJoin(conversationsTable, eq(messagesTable.conversationId, conversationsTable.id))
          .where(and(
            eq(conversationsTable.userId, cfg.userId),
            gte(messagesTable.createdAt, sevenDaysAgo),
          )),
        db.select({ total: count() }).from(ordersTable).where(and(
          eq(ordersTable.userId, cfg.userId),
          gte(ordersTable.createdAt, sevenDaysAgo),
          isNull(ordersTable.deletedAt),
        )),
        db.select({ total: count() }).from(appointmentsTable).where(and(
          eq(appointmentsTable.userId, cfg.userId),
          gte(appointmentsTable.scheduledAt, sevenDaysAgo),
          isNull(appointmentsTable.deletedAt),
        )),
        db.select({ handoffMode: conversationsTable.handoffMode }).from(conversationsTable).where(and(
          eq(conversationsTable.userId, cfg.userId),
          gte(conversationsTable.lastMessageAt, sevenDaysAgo),
          isNull(conversationsTable.deletedAt),
        )),
      ]);

      const totalConvs = convRows.length;
      const handoffs = convRows.filter(c => c.handoffMode).length;
      const handoffRate = totalConvs > 0 ? Math.round((handoffs / totalConvs) * 100) : 0;

      const fmtDate = (d: Date) => d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", timeZone: ARGENTINA_TZ });
      const from = fmtDate(sevenDaysAgo);
      const to = fmtDate(new Date());

      const message = [
        `📊 *Reporte semanal Clientum*`,
        `📅 Período: ${from} – ${to}`,
        ``,
        `👥 Leads nuevos: *${Number(newLeads?.total ?? 0)}*`,
        `💬 Mensajes procesados: *${Number(totalMsgs?.total ?? 0)}*`,
        `🛒 Pedidos generados: *${Number(newOrders?.total ?? 0)}*`,
        `📅 Turnos agendados: *${Number(newAppts?.total ?? 0)}*`,
        `🤝 Handoffs al operador: *${handoffRate}%*`,
        ``,
        `_Generado automáticamente por Clientum IA_`,
      ].join("\n");

      await sendWhatsAppReply({
        evolutionApiUrl: cfg.evolutionApiUrl,
        evolutionApiKey: cfg.evolutionApiKey ?? "",
        instance: cfg.evolutionInstance,
        to: cfg.weeklyReportPhone,
        text: message,
      });

      logger.info({ userId: cfg.userId }, "Weekly report sent successfully");
    } catch (err) {
      logger.error({ err, userId: cfg.userId }, "Failed to send weekly report");
    }
  }
}

const INTERVAL_MS = 60 * 60 * 1000;

export function startWeeklyReportScheduler(): void {
  logger.info({ intervalHoras: 1 }, "Weekly report scheduler started");

  setInterval(async () => {
    try {
      await sendWeeklyReports();
    } catch (err) {
      logger.error({ err }, "Weekly report scheduler error");
    }
  }, INTERVAL_MS);
}
