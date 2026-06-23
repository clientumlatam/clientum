import { pgTable, serial, text, integer, timestamp, numeric, boolean } from "drizzle-orm/pg-core";

export const afipConfigsTable = pgTable("afip_configs", {
  id:             serial("id").primaryKey(),
  userId:         text("user_id").notNull().unique(),
  cuit:           text("cuit"),
  razonSocial:    text("razon_social"),
  puntoVenta:     integer("punto_venta"),
  certPem:        text("cert_pem"),
  privateKeyPem:  text("private_key_pem"),
  environment:    text("environment").notNull().default("homologacion"),
  token:          text("token"),
  sign:           text("sign"),
  tokenExpiry:    timestamp("token_expiry"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

export const afipComprobantesTable = pgTable("afip_comprobantes", {
  id:          serial("id").primaryKey(),
  userId:      text("user_id").notNull(),
  tipo:        integer("tipo").notNull(),
  numero:      integer("numero").notNull(),
  puntoVenta:  integer("punto_venta").notNull(),
  fecha:       text("fecha").notNull(),
  cae:         text("cae"),
  caeFchVto:   text("cae_fch_vto"),
  docTipo:     integer("doc_tipo").notNull().default(99),
  docNro:      text("doc_nro").notNull().default("0"),
  impTotal:    numeric("imp_total", { precision: 12, scale: 2 }).notNull(),
  impNeto:     numeric("imp_neto", { precision: 12, scale: 2 }).notNull().default("0"),
  impIva:      numeric("imp_iva", { precision: 12, scale: 2 }).notNull().default("0"),
  concepto:    integer("concepto").notNull().default(2),
  status:      text("status").notNull().default("emitida"),
  descripcion: text("descripcion"),
  rawResponse: text("raw_response"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});
