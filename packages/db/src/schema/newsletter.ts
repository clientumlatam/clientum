import { pgTable, varchar, text, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";

export const newsletterSubscribersTable = pgTable(
  "newsletter_subscribers",
  {
    id: varchar("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }),
    source: varchar("source", { length: 100 }).notNull().default("landing"),
    confirmed: boolean("confirmed").notNull().default(false),
    unsubscribed: boolean("unsubscribed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_newsletter_email").on(table.email),
  ],
);

export type NewsletterSubscriber = typeof newsletterSubscribersTable.$inferSelect;
