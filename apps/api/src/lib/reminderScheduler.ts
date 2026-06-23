import { processScheduledMessages } from "../routes/reminders";
import { logger } from "./logger";

const INTERVAL_MS = 60 * 1000;

export function startReminderScheduler(): void {
  logger.info("Reminder scheduler started (interval: 60s)");

  setInterval(async () => {
    try {
      await processScheduledMessages();
    } catch (err) {
      logger.error({ err }, "Reminder scheduler error");
    }
  }, INTERVAL_MS);

  processScheduledMessages().catch((err) => {
    logger.error({ err }, "Reminder scheduler initial run error");
  });
}
