import { pgTable, varchar, text, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export type FlowNode =
  | { type: "sendMessage"; content: string }
  | { type: "escalate" };

export const flowsTable = pgTable("flows", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull().default("Nuevo flow"),
  active: boolean("active").notNull().default(true),
  triggerKeywords: text("trigger_keywords").notNull().default(""),
  matchType: text("match_type").notNull().default("contains"),
  nodes: jsonb("nodes").notNull().default([]),
  priority: integer("priority").notNull().default(0),
  triggeredCount: integer("triggered_count").notNull().default(0),
  resolvedCount: integer("resolved_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
