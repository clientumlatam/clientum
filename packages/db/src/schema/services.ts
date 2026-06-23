import { pgTable, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const SERVICE_TYPES = [
  "frappe_erp",
  "whatsapp_bot",
  "instagram_bot",
  "afip_standalone",
] as const;

export const SERVICE_STATUSES = [
  "inactive",
  "requested",
  "provisioning",
  "active",
  "error",
  "cancelled",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export const tenantServicesTable = pgTable(
  "tenant_services",
  {
    id: varchar("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    serviceType: text("service_type").notNull(),
    status: text("status").notNull().default("inactive"),
    subdomain: varchar("subdomain"),
    siteUrl: text("site_url"),
    notes: text("notes"),
    requestedAt: timestamp("requested_at", { withTimezone: true }),
    provisionedAt: timestamp("provisioned_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_tenant_services_user").on(table.userId),
    index("idx_tenant_services_user_type").on(table.userId, table.serviceType),
  ],
);

export type TenantService = typeof tenantServicesTable.$inferSelect;
export type InsertTenantService = typeof tenantServicesTable.$inferInsert;
