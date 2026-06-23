import { pgTable, varchar, text, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const healthAlertLogsTable = pgTable(
  "health_alert_logs",
  {
    id:        varchar("id").primaryKey(),
    type:      text("type").notNull(),
    status:    text("status").notNull(),
    message:   text("message").notNull(),
    phone:     text("phone").notNull().default(""),
    sent:      boolean("sent").notNull().default(false),
    error:     text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_health_alert_logs_created").on(t.createdAt)],
);
