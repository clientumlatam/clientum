import { pgTable, varchar, text, timestamp, boolean, integer, index } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const appointmentsTable = pgTable(
  "appointments",
  {
    id: varchar("id").primaryKey(),
    userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    contactName: varchar("contact_name", { length: 255 }).notNull(),
    contactPhone: varchar("contact_phone", { length: 50 }).notNull(),
    contactEmail: varchar("contact_email", { length: 255 }),
    serviceType: varchar("service_type", { length: 255 }).notNull().default("Consulta"),
    notes: text("notes").notNull().default(""),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(60),
    status: text("status").notNull().default("pending"),
    reminderSent: boolean("reminder_sent").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_appointments_user_id").on(table.userId),
    index("idx_appointments_scheduled").on(table.userId, table.scheduledAt),
    index("idx_appointments_status").on(table.userId, table.status),
  ],
);

export const scheduledMessagesTable = pgTable(
  "scheduled_messages",
  {
    id: varchar("id").primaryKey(),
    userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    conversationId: varchar("conversation_id"),
    phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
    contactName: varchar("contact_name", { length: 255 }),
    message: text("message").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    status: text("status").notNull().default("pending"),
    type: text("type").notNull().default("reminder"),
    followUpStep: integer("follow_up_step"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_scheduled_msgs_user").on(table.userId),
    index("idx_scheduled_msgs_scheduled").on(table.scheduledAt, table.status),
  ],
);

export type Appointment = typeof appointmentsTable.$inferSelect;
export type InsertAppointment = typeof appointmentsTable.$inferInsert;
export type ScheduledMessage = typeof scheduledMessagesTable.$inferSelect;
