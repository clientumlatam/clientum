import { pgTable, serial, text, integer, boolean, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";

export const tenantsTable = pgTable("tenants", {
  id:                   text("id").primaryKey(),
  storeName:            text("store_name").notNull(),
  wcBaseUrl:            text("wc_base_url").notNull().default(""),
  wcKey:                text("wc_key").notNull().default(""),
  wcSecret:             text("wc_secret").notNull().default(""),
  openrouterKey:        text("openrouter_key").notNull().default(""),
  openrouterModel:      text("openrouter_model"),
  groqKey:              text("groq_key"),
  openaiKey:            text("openai_key"),
  storeLanguage:        text("store_language").default("es-AR"),
  evolutionInstance:    text("evolution_instance"),
  evolutionApiUrl:      text("evolution_api_url"),
  evolutionApiKey:      text("evolution_api_key"),
  systemPromptOverride: text("system_prompt_override"),
  agentNotifyJid:       text("agent_notify_jid"),
  active:               boolean("active").default(true),
  createdAt:            timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const wcAgentSessionsTable = pgTable(
  "wc_agent_sessions",
  {
    id:                    serial("id").primaryKey(),
    tenantId:              text("tenant_id").notNull(),
    waJid:                 text("wa_jid").notNull(),
    customerId:            integer("customer_id"),
    history:               jsonb("history").default([]),
    mode:                  text("mode").default("bot"),
    pendingIdentification: boolean("pending_identification").default(false),
    updatedAt:             timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_wc_sessions_tenant_jid").on(table.tenantId, table.waJid),
  ],
);

export const agentHandoffsTable = pgTable(
  "wc_agent_handoffs",
  {
    id:         serial("id").primaryKey(),
    tenantId:   text("tenant_id").notNull(),
    sessionId:  integer("session_id").notNull(),
    waJid:      text("wa_jid").notNull(),
    reason:     text("reason"),
    status:     text("status").default("pending"),
    takenBy:    text("taken_by"),
    takenAt:    timestamp("taken_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    summary:    text("summary"),
    createdAt:  timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_handoffs_tenant_status").on(table.tenantId, table.status),
    index("idx_handoffs_status_created").on(table.status, table.createdAt),
  ],
);

export const wcAiConversationsTable = pgTable(
  "wc_ai_chat_conversations",
  {
    id:          serial("id").primaryKey(),
    tenantId:    text("tenant_id").notNull(),
    customerId:  integer("customer_id"),
    sessionId:   text("session_id").notNull(),
    userMessage: text("user_message").notNull(),
    aiResponse:  text("ai_response").notNull(),
    intent:      text("intent"),
    sentiment:   text("sentiment"),
    provider:    text("provider"),
    model:       text("model"),
    metadata:    jsonb("metadata"),
    createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_wc_conv_tenant").on(table.tenantId, table.createdAt),
    index("idx_wc_conv_session").on(table.sessionId),
  ],
);

export type Tenant          = typeof tenantsTable.$inferSelect;
export type WcAgentSession  = typeof wcAgentSessionsTable.$inferSelect;
export type AgentHandoff    = typeof agentHandoffsTable.$inferSelect;
export type WcAiConversation = typeof wcAiConversationsTable.$inferSelect;
