import { pgTable, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const catalogConfigsTable = pgTable("catalog_configs", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  token: varchar("token").unique(),
  productsUrl: text("products_url").notNull().default(""),
  brandName: text("brand_name").notNull().default(""),
  brandSubtitle: text("brand_subtitle").notNull().default(""),
  primaryColor: text("primary_color").notNull().default("#002266"),
  secondaryColor: text("secondary_color").notNull().default("#0052CC"),
  logoUrl: text("logo_url").notNull().default(""),
  heroImage: text("hero_image").notNull().default(""),
  heroBadge: text("hero_badge").notNull().default(""),
  heroTitle: text("hero_title").notNull().default(""),
  heroTitleAccent: text("hero_title_accent").notNull().default(""),
  heroDescription: text("hero_description").notNull().default(""),
  catalogTitle: text("catalog_title").notNull().default("Nuestro Catálogo"),
  catalogSubtitle: text("catalog_subtitle").notNull().default("Explorá nuestros productos por categoría."),
  searchPlaceholder: text("search_placeholder").notNull().default("¿Qué producto buscás?"),
  currency: text("currency").notNull().default("$"),
  whatsapp: text("whatsapp").notNull().default(""),
  instagram: text("instagram").notNull().default(""),
  address: text("address").notNull().default(""),
  hours: text("hours").notNull().default(""),
  footerDesc: text("footer_desc").notNull().default(""),
  facebook: text("facebook").notNull().default(""),
  mapsUrl: text("maps_url").notNull().default(""),
  featuresJson: text("features_json").notNull().default("[]"),
  faqJson: text("faq_json").notNull().default("[]"),
  resellerJson: text("reseller_json").notNull().default('{"enabled":false,"title":"","subtitle":"","description":"","buttonText":"Consultar por Mayor"}'),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type CatalogConfig = typeof catalogConfigsTable.$inferSelect;
