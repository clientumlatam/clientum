import { db, subscriptionsTable, usersTable } from "@workspace/db";
import { eq, and, lte, gte, or } from "drizzle-orm";
import { sendTrialExpiringEmail, sendPlanExpiredEmail } from "./email";
import { logger } from "./logger";

const SENT_CACHE = new Set<string>();

export async function checkAndSendTrialAlerts(): Promise<void> {
  try {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const in72h = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    const expiringSoon = await db
      .select({
        subId: subscriptionsTable.id,
        userId: subscriptionsTable.userId,
        trialEnd: subscriptionsTable.currentPeriodEnd,
        email: usersTable.email,
        firstName: usersTable.firstName,
      })
      .from(subscriptionsTable)
      .innerJoin(usersTable, eq(subscriptionsTable.userId, usersTable.id))
      .where(
        and(
          eq(subscriptionsTable.status, "trialing"),
          gte(subscriptionsTable.currentPeriodEnd, in48h),
          lte(subscriptionsTable.currentPeriodEnd, in72h)
        )
      );

    for (const row of expiringSoon) {
      if (!row.email) continue;
      const cacheKey = `${row.subId}-2d`;
      if (SENT_CACHE.has(cacheKey)) continue;

      const daysLeft = Math.ceil(
        (new Date(row.trialEnd!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      await sendTrialExpiringEmail(row.email, row.firstName ?? "", daysLeft);
      SENT_CACHE.add(cacheKey);
      logger.info({ userId: row.userId, daysLeft }, "Trial expiry alert sent");
    }
  } catch (err) {
    logger.error({ err }, "Error checking trial alerts");
  }
}

export async function checkAndDowngradeExpiredSubscriptions(): Promise<void> {
  try {
    const now = new Date();

    const expired = await db
      .select({
        subId: subscriptionsTable.id,
        userId: subscriptionsTable.userId,
        plan: subscriptionsTable.plan,
        email: usersTable.email,
        firstName: usersTable.firstName,
      })
      .from(subscriptionsTable)
      .innerJoin(usersTable, eq(subscriptionsTable.userId, usersTable.id))
      .where(
        and(
          or(
            eq(subscriptionsTable.status, "active"),
            eq(subscriptionsTable.status, "trialing"),
          ),
          lte(subscriptionsTable.currentPeriodEnd, now),
        )
      );

    for (const row of expired) {
      const cacheKey = `expired-${row.subId}`;
      if (SENT_CACHE.has(cacheKey)) continue;

      await db
        .update(subscriptionsTable)
        .set({ status: "expired" })
        .where(eq(subscriptionsTable.id, row.subId));

      logger.info({ userId: row.userId, plan: row.plan }, "Subscription expired — downgraded to Free");

      if (row.email) {
        await sendPlanExpiredEmail(row.email, row.firstName ?? "", row.plan);
        logger.info({ userId: row.userId }, "Plan expired email sent");
      }

      SENT_CACHE.add(cacheKey);
    }
  } catch (err) {
    logger.error({ err }, "Error checking expired subscriptions");
  }
}

export function startTrialAlertScheduler(): void {
  const INTERVAL_MS = 6 * 60 * 60 * 1000; // cada 6 horas
  checkAndSendTrialAlerts();
  checkAndDowngradeExpiredSubscriptions();
  setInterval(() => {
    checkAndSendTrialAlerts();
    checkAndDowngradeExpiredSubscriptions();
  }, INTERVAL_MS);
  logger.info("Trial alert scheduler started");
}
