import app from "./app";
import { logger } from "./lib/logger";
import { startTrialAlertScheduler } from "./lib/trialAlerts";
import { startReminderScheduler } from "./lib/reminderScheduler";
import { startAfipTokenScheduler } from "./lib/afipTokenScheduler";
import { startHealthAlertScheduler } from "./lib/healthAlerts";
import { startWeeklyReportScheduler } from "./lib/weeklyReportScheduler";
import { runMigrations } from "./lib/migrate";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

if (process.env["NODE_ENV"] === "production") {
  try {
    await runMigrations();
  } catch (err) {
    logger.error({ err }, "Migration failed — aborting startup");
    process.exit(1);
  }
}

// Warn if MP_WEBHOOK_SECRET is not set — without it anyone can trigger subscription activation
if (!process.env["MP_WEBHOOK_SECRET"]) {
  if (process.env["NODE_ENV"] === "production") {
    throw new Error(
      "MP_WEBHOOK_SECRET is required in production. Set it in Replit Secrets to secure the MercadoPago webhook.",
    );
  } else {
    logger.warn("MP_WEBHOOK_SECRET is not set. MercadoPago webhook signature verification is DISABLED. Set this secret before going to production.");
  }
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startTrialAlertScheduler();
  startReminderScheduler();
  startAfipTokenScheduler();
  startHealthAlertScheduler();
  startWeeklyReportScheduler();
});
