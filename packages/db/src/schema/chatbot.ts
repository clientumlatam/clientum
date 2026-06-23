import { pgTable, varchar, text, timestamp, boolean, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const chatbotConfigsTable = pgTable("chatbot_configs", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  evolutionApiUrl: text("evolution_api_url").notNull().default(""),
  evolutionApiKey: text("evolution_api_key").notNull().default(""),
  evolutionInstance: text("evolution_instance").notNull().default(""),
  openrouterModel: text("openrouter_model").notNull().default("meta-llama/llama-3.3-70b:free"),
  systemPrompt: text("system_prompt").notNull().default("Sos un asistente de atención al cliente amable y profesional. Respondé siempre en español argentino, de forma clara y concisa."),
  active: boolean("active").notNull().default(true),
  openaiApiKey: text("openai_api_key").notNull().default(""),
  openrouterApiKey: text("openrouter_api_key").notNull().default(""),
  apiProvider: text("api_provider").notNull().default("openrouter"),
  agentMode: text("agent_mode").notNull().default("support"),
  maxHistory: integer("max_history").notNull().default(20),
  widgetToken: varchar("widget_token").unique(),
  widgetName: text("widget_name").notNull().default("Asistente"),
  widgetColor: text("widget_color").notNull().default("#1A3A80"),
  widgetWelcome: text("widget_welcome").notNull().default("¡Hola! ¿En qué te puedo ayudar hoy? 👋"),
  guardrailsJson: text("guardrails_json").notNull().default('{"promptInjectionShield":true,"piiRedaction":false,"contentFilter":true,"ragHallucinationThreshold":true,"bannedWords":""}'),
  businessHoursJson: text("business_hours_json").notNull().default('{"enabled":false,"timezone":"America/Argentina/Buenos_Aires","schedule":{"mon":{"open":"09:00","close":"18:00","active":true},"tue":{"open":"09:00","close":"18:00","active":true},"wed":{"open":"09:00","close":"18:00","active":true},"thu":{"open":"09:00","close":"18:00","active":true},"fri":{"open":"09:00","close":"18:00","active":true},"sat":{"open":"09:00","close":"13:00","active":false},"sun":{"open":"09:00","close":"13:00","active":false}},"outsideHoursMessage":"¡Hola! Nuestro horario de atención es de lunes a viernes de 9 a 18hs. Te respondemos en cuanto abramos. ¡Gracias por escribirnos! 🙏","respectHolidays":true}'),
  googleMapsApiKey: text("google_maps_api_key").notNull().default(""),
  groqApiKey: text("groq_api_key").notNull().default(""),
  mpAccessToken: text("mp_access_token").notNull().default(""),
  mpWebhookSecret: text("mp_webhook_secret").notNull().default(""),
  resendApiKey: text("resend_api_key").notNull().default(""),
  resendFrom: text("resend_from").notNull().default(""),
  smtpHost: text("smtp_host").notNull().default(""),
  smtpPort: text("smtp_port").notNull().default(""),
  smtpUser: text("smtp_user").notNull().default(""),
  smtpPass: text("smtp_pass").notNull().default(""),
  smtpFrom: text("smtp_from").notNull().default(""),
  weeklyReportEnabled: boolean("weekly_report_enabled").notNull().default(false),
  weeklyReportPhone: text("weekly_report_phone").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const conversationsTable = pgTable(
  "conversations",
  {
    id: varchar("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    phoneNumber: varchar("phone_number").notNull(),
    contactName: varchar("contact_name"),
    channel: text("channel").notNull().default("whatsapp"),
    leadStatus: text("lead_status").notNull().default("new"),
    leadNotes: text("lead_notes").notNull().default(""),
    handoffMode: boolean("handoff_mode").notNull().default(false),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_conversations_user_phone").on(table.userId, table.phoneNumber),
    index("idx_conversations_user_last").on(table.userId, table.lastMessageAt),
  ],
);

export const messagesTable = pgTable(
  "messages",
  {
    id: varchar("id").primaryKey(),
    conversationId: varchar("conversation_id")
      .notNull()
      .references(() => conversationsTable.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_messages_conv_created").on(table.conversationId, table.createdAt),
  ],
);

export const knowledgeItemsTable = pgTable(
  "knowledge_items",
  {
    id: varchar("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_knowledge_items_user").on(table.userId),
  ],
);

export type ChatbotConfig = typeof chatbotConfigsTable.$inferSelect;
export type Conversation = typeof conversationsTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;
export type KnowledgeItem = typeof knowledgeItemsTable.$inferSelect;
