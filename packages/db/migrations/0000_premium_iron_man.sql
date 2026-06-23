CREATE TABLE "password_reset_tokens" (
	"token" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"password_hash" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"mp_payment_id" varchar,
	"plan" text NOT NULL,
	"amount" integer,
	"status" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_events_mp_payment_id_unique" UNIQUE("mp_payment_id")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"mp_payment_id" varchar,
	"mp_preference_id" varchar,
	"current_period_end" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbot_configs" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"evolution_api_url" text DEFAULT '' NOT NULL,
	"evolution_api_key" text DEFAULT '' NOT NULL,
	"evolution_instance" text DEFAULT '' NOT NULL,
	"openrouter_model" text DEFAULT 'meta-llama/llama-3.3-70b:free' NOT NULL,
	"system_prompt" text DEFAULT 'Sos un asistente de atención al cliente amable y profesional. Respondé siempre en español argentino, de forma clara y concisa.' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"openai_api_key" text DEFAULT '' NOT NULL,
	"openrouter_api_key" text DEFAULT '' NOT NULL,
	"api_provider" text DEFAULT 'openrouter' NOT NULL,
	"agent_mode" text DEFAULT 'support' NOT NULL,
	"max_history" integer DEFAULT 20 NOT NULL,
	"widget_token" varchar,
	"widget_name" text DEFAULT 'Asistente' NOT NULL,
	"widget_color" text DEFAULT '#1A3A80' NOT NULL,
	"widget_welcome" text DEFAULT '¡Hola! ¿En qué te puedo ayudar hoy? 👋' NOT NULL,
	"guardrails_json" text DEFAULT '{"promptInjectionShield":true,"piiRedaction":false,"contentFilter":true,"ragHallucinationThreshold":true,"bannedWords":""}' NOT NULL,
	"business_hours_json" text DEFAULT '{"enabled":false,"timezone":"America/Argentina/Buenos_Aires","schedule":{"mon":{"open":"09:00","close":"18:00","active":true},"tue":{"open":"09:00","close":"18:00","active":true},"wed":{"open":"09:00","close":"18:00","active":true},"thu":{"open":"09:00","close":"18:00","active":true},"fri":{"open":"09:00","close":"18:00","active":true},"sat":{"open":"09:00","close":"13:00","active":false},"sun":{"open":"09:00","close":"13:00","active":false}},"outsideHoursMessage":"¡Hola! Nuestro horario de atención es de lunes a viernes de 9 a 18hs. Te respondemos en cuanto abramos. ¡Gracias por escribirnos! 🙏","respectHolidays":true}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chatbot_configs_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "chatbot_configs_widget_token_unique" UNIQUE("widget_token")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"phone_number" varchar NOT NULL,
	"contact_name" varchar,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"lead_status" text DEFAULT 'new' NOT NULL,
	"lead_notes" text DEFAULT '' NOT NULL,
	"handoff_mode" boolean DEFAULT false NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_items" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY NOT NULL,
	"conversation_id" varchar NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_configs" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar,
	"products_url" text DEFAULT '' NOT NULL,
	"brand_name" text DEFAULT '' NOT NULL,
	"brand_subtitle" text DEFAULT '' NOT NULL,
	"primary_color" text DEFAULT '#002266' NOT NULL,
	"secondary_color" text DEFAULT '#0052CC' NOT NULL,
	"logo_url" text DEFAULT '' NOT NULL,
	"hero_image" text DEFAULT '' NOT NULL,
	"hero_badge" text DEFAULT '' NOT NULL,
	"hero_title" text DEFAULT '' NOT NULL,
	"hero_title_accent" text DEFAULT '' NOT NULL,
	"hero_description" text DEFAULT '' NOT NULL,
	"catalog_title" text DEFAULT 'Nuestro Catálogo' NOT NULL,
	"catalog_subtitle" text DEFAULT 'Explorá nuestros productos por categoría.' NOT NULL,
	"search_placeholder" text DEFAULT '¿Qué producto buscás?' NOT NULL,
	"currency" text DEFAULT '$' NOT NULL,
	"whatsapp" text DEFAULT '' NOT NULL,
	"instagram" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"hours" text DEFAULT '' NOT NULL,
	"footer_desc" text DEFAULT '' NOT NULL,
	"facebook" text DEFAULT '' NOT NULL,
	"maps_url" text DEFAULT '' NOT NULL,
	"features_json" text DEFAULT '[]' NOT NULL,
	"faq_json" text DEFAULT '[]' NOT NULL,
	"reseller_json" text DEFAULT '{"enabled":false,"title":"","subtitle":"","description":"","buttonText":"Consultar por Mayor"}' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_configs_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "catalog_configs_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "flows" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar(255) DEFAULT 'Nuevo flow' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"trigger_keywords" text DEFAULT '' NOT NULL,
	"match_type" text DEFAULT 'contains' NOT NULL,
	"nodes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"triggered_count" integer DEFAULT 0 NOT NULL,
	"resolved_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_services" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"service_type" text NOT NULL,
	"status" text DEFAULT 'inactive' NOT NULL,
	"subdomain" varchar,
	"site_url" text,
	"notes" text,
	"requested_at" timestamp with time zone,
	"provisioned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"contact_name" varchar(255) NOT NULL,
	"contact_phone" varchar(50) NOT NULL,
	"contact_email" varchar(255),
	"service_type" varchar(255) DEFAULT 'Consulta' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reminder_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_messages" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"conversation_id" varchar,
	"phone_number" varchar(50) NOT NULL,
	"contact_name" varchar(255),
	"message" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"type" text DEFAULT 'reminder' NOT NULL,
	"follow_up_step" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" varchar PRIMARY KEY NOT NULL,
	"order_id" varchar NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" integer DEFAULT 0 NOT NULL,
	"total_price" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" varchar PRIMARY KEY NOT NULL,
	"order_id" varchar NOT NULL,
	"from_status" text NOT NULL,
	"to_status" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"contact_name" varchar(255) NOT NULL,
	"contact_phone" varchar(50) NOT NULL,
	"contact_email" varchar(255),
	"status" text DEFAULT 'pending' NOT NULL,
	"total_amount" integer DEFAULT 0 NOT NULL,
	"currency" varchar(10) DEFAULT 'ARS' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"delivery_address" text DEFAULT '' NOT NULL,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"source" varchar(100) DEFAULT 'landing' NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	"unsubscribed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_configs" ADD CONSTRAINT "chatbot_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_configs" ADD CONSTRAINT "catalog_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flows" ADD CONSTRAINT "flows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_services" ADD CONSTRAINT "tenant_services_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_prt_user" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_payment_events_user" ON "payment_events" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_subscriptions_user_unique" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_user_status" ON "subscriptions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_conversations_user_phone" ON "conversations" USING btree ("user_id","phone_number");--> statement-breakpoint
CREATE INDEX "idx_conversations_user_last" ON "conversations" USING btree ("user_id","last_message_at");--> statement-breakpoint
CREATE INDEX "idx_knowledge_items_user" ON "knowledge_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_messages_conv_created" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_tenant_services_user" ON "tenant_services" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_services_user_type" ON "tenant_services" USING btree ("user_id","service_type");--> statement-breakpoint
CREATE INDEX "idx_appointments_user_id" ON "appointments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_scheduled" ON "appointments" USING btree ("user_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_appointments_status" ON "appointments" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_scheduled_msgs_user" ON "scheduled_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_scheduled_msgs_scheduled" ON "scheduled_messages" USING btree ("scheduled_at","status");--> statement-breakpoint
CREATE INDEX "idx_order_items_order_id" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_history_order_id" ON "order_status_history" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_orders_user_id" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_orders_created" ON "orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_newsletter_email" ON "newsletter_subscribers" USING btree ("email");