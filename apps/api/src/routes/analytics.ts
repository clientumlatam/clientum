import { Router, type IRouter, type Request, type Response } from "express";
import { db, conversationsTable, messagesTable, subscriptionsTable, paymentEventsTable } from "@workspace/db";
import { eq, and, or, gte, sql, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/analytics", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const userId = req.user.id;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const [
      convRows,
      msgRows,
      leadStatusRows,
      channelRows,
      msgByDayRows,
      paymentRows,
      outcomeRows,
    ] = await Promise.all([
      db
        .select({ total: count() })
        .from(conversationsTable)
        .where(eq(conversationsTable.userId, userId)),

      db
        .select({ total: count() })
        .from(messagesTable)
        .innerJoin(conversationsTable, eq(messagesTable.conversationId, conversationsTable.id))
        .where(eq(conversationsTable.userId, userId)),

      db
        .select({ leadStatus: conversationsTable.leadStatus, total: count() })
        .from(conversationsTable)
        .where(eq(conversationsTable.userId, userId))
        .groupBy(conversationsTable.leadStatus),

      db
        .select({ channel: conversationsTable.channel, total: count() })
        .from(conversationsTable)
        .where(eq(conversationsTable.userId, userId))
        .groupBy(conversationsTable.channel),

      db.execute(sql`
        SELECT
          DATE_TRUNC('day', m.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires') AS day,
          COUNT(*) AS total
        FROM messages m
        INNER JOIN conversations c ON m.conversation_id = c.id
        WHERE c.user_id = ${userId}
          AND m.created_at >= ${thirtyDaysAgo}
        GROUP BY day
        ORDER BY day ASC
      `),

      db
        .select()
        .from(paymentEventsTable)
        .where(eq(paymentEventsTable.userId, userId))
        .orderBy(paymentEventsTable.createdAt),

      db.execute(sql`
        SELECT
          SUM(CASE WHEN handoff_mode = true THEN 1 ELSE 0 END) AS escalated,
          SUM(CASE WHEN lead_status = 'closed' THEN 1 ELSE 0 END) AS resolved,
          SUM(CASE WHEN handoff_mode = false AND lead_status != 'closed' THEN 1 ELSE 0 END) AS ai_active
        FROM conversations
        WHERE user_id = ${userId}
      `),
    ]);

    const [sub] = await db
      .select({ plan: subscriptionsTable.plan, status: subscriptionsTable.status })
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.userId, userId),
          or(eq(subscriptionsTable.status, "active"), eq(subscriptionsTable.status, "trialing")),
        ),
      )
      .limit(1);

    const totalConversations = Number(convRows[0]?.total ?? 0);
    const totalMessages = Number(msgRows[0]?.total ?? 0);

    const leadsByStatus = leadStatusRows.map((r) => ({
      status: r.leadStatus,
      count: Number(r.total),
    }));

    const channelBreakdown = channelRows.map((r) => ({
      channel: r.channel,
      count: Number(r.total),
    }));

    const messagesByDay = (msgByDayRows.rows as { day: string | Date; total: string | number }[]).map((r) => ({
      date: typeof r.day === "string" ? r.day.slice(0, 10) : (r.day as Date).toISOString().slice(0, 10),
      count: Number(r.total),
    }));

    const qualifiedLeads = leadsByStatus
      .filter((l) => ["qualified", "closed"].includes(l.status))
      .reduce((s, l) => s + l.count, 0);

    const conversionRate = totalConversations > 0 ? Math.round((qualifiedLeads / totalConversations) * 100) : 0;

    const avgTurnsPerSession = totalConversations > 0 ? Math.round((totalMessages / totalConversations) * 10) / 10 : 0;

    const outRow = (outcomeRows.rows as { escalated: string; resolved: string; ai_active: string }[])[0];
    const outcomeBreakdown = {
      aiActive: Number(outRow?.ai_active ?? 0),
      resolved: Number(outRow?.resolved ?? 0),
      escalated: Number(outRow?.escalated ?? 0),
    };

    const resolutionRate = totalConversations > 0 ? Math.round((outcomeBreakdown.resolved / totalConversations) * 100) : 0;

    const convsWithMessages = (
      await db.execute(sql`
        SELECT COUNT(DISTINCT c.id) AS n
        FROM conversations c
        INNER JOIN messages m ON m.conversation_id = c.id
        WHERE c.user_id = ${userId}
      `)
    ).rows[0] as { n: string | number } | undefined;
    const conversationsWithMessages = Number(convsWithMessages?.n ?? 0);

    const funnelStages = [
      { label: "Conversaciones", value: totalConversations },
      { label: "Con mensajes", value: conversationsWithMessages },
      { label: "Interesados+", value: leadsByStatus.filter((l) => ["interested", "qualified", "closed"].includes(l.status)).reduce((s, l) => s + l.count, 0) },
      { label: "Calificados", value: qualifiedLeads },
    ];

    res.json({
      plan: sub?.plan ?? "free",
      totalConversations,
      totalMessages,
      leadsByStatus,
      channelBreakdown,
      messagesByDay,
      qualifiedLeads,
      conversionRate,
      avgTurnsPerSession,
      outcomeBreakdown,
      resolutionRate,
      funnelStages,
      paymentHistory: paymentRows,
    });
  } catch (err) {
    req.log.error({ err }, "Analytics error");
    res.status(500).json({ error: "Error al obtener analytics" });
  }
});

export default router;
