import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  db,
  conversationsTable,
  appointmentsTable,
} from "@workspace/db";
import {
  eq,
  desc,
  and,
  gte,
  lte,
  ilike,
  or,
} from "drizzle-orm";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name:    "clientum",
    version: "1.0.0",
  });

  server.tool(
    "list_leads",
    {
      stage:  z.string().optional().describe("Filtrar por etapa: nuevo, contactado, calificado, propuesta, negociacion, cerrado_ganado"),
      search: z.string().optional().describe("Buscar por nombre o teléfono"),
      limit:  z.number().int().min(1).max(100).optional().default(20),
    },
    async ({ stage, search, limit }) => {
      const conditions: ReturnType<typeof eq>[] = [];
      if (stage) conditions.push(eq(conversationsTable.leadStatus, stage));
      if (search) {
        conditions.push(
          or(
            ilike(conversationsTable.contactName, `%${search}%`),
            ilike(conversationsTable.phoneNumber, `%${search}%`),
          ) as ReturnType<typeof eq>,
        );
      }

      const rows = await db.select({
        id:          conversationsTable.id,
        nombre:      conversationsTable.contactName,
        telefono:    conversationsTable.phoneNumber,
        etapa:       conversationsTable.leadStatus,
        notas:       conversationsTable.leadNotes,
        creadoEn:    conversationsTable.createdAt,
      })
        .from(conversationsTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(conversationsTable.createdAt))
        .limit(limit ?? 20);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ leads: rows, total: rows.length }, null, 2),
        }],
      };
    },
  );

  server.tool(
    "create_lead",
    {
      nombre:   z.string().describe("Nombre del lead"),
      telefono: z.string().describe("Número de teléfono con código de país (ej: 5491112345678)"),
      etapa:    z.enum(["nuevo", "contactado", "calificado", "propuesta", "negociacion", "cerrado_ganado"]).optional().default("nuevo"),
      notas:    z.string().optional(),
    },
    async ({ nombre, telefono, etapa, notas }) => {
      const [row] = await db.insert(conversationsTable).values({
        contactName: nombre,
        phoneNumber: telefono,
        leadStatus:  etapa ?? "nuevo",
        leadNotes:   notas ?? null,
        userId:      "mcp",
        status:      "active",
      }).returning({ id: conversationsTable.id });

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ ok: true, id: row.id, mensaje: `Lead "${nombre}" creado en etapa "${etapa}"` }),
        }],
      };
    },
  );

  server.tool(
    "update_lead_stage",
    {
      id:    z.number().int().describe("ID del lead"),
      etapa: z.enum(["nuevo", "contactado", "calificado", "propuesta", "negociacion", "cerrado_ganado"]),
      notas: z.string().optional().describe("Notas adicionales (opcional)"),
    },
    async ({ id, etapa, notas }) => {
      const update: Record<string, unknown> = { leadStatus: etapa };
      if (notas !== undefined) update.leadNotes = notas;

      const [updated] = await db.update(conversationsTable)
        .set(update)
        .where(eq(conversationsTable.id, id))
        .returning({ id: conversationsTable.id, nombre: conversationsTable.contactName });

      if (!updated) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ ok: false, error: "Lead no encontrado" }) }] };
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ ok: true, mensaje: `Lead "${updated.nombre}" movido a "${etapa}"` }),
        }],
      };
    },
  );

  server.tool(
    "list_appointments",
    {
      desde:  z.string().optional().describe("Fecha de inicio YYYY-MM-DD"),
      hasta:  z.string().optional().describe("Fecha de fin YYYY-MM-DD"),
      estado: z.enum(["pendiente", "confirmado", "cancelado", "completado"]).optional(),
      limit:  z.number().int().min(1).max(50).optional().default(20),
    },
    async ({ desde, hasta, estado, limit }) => {
      const conditions: ReturnType<typeof eq>[] = [];
      if (desde) conditions.push(gte(appointmentsTable.date, desde) as ReturnType<typeof eq>);
      if (hasta) conditions.push(lte(appointmentsTable.date, hasta) as ReturnType<typeof eq>);
      if (estado) conditions.push(eq(appointmentsTable.status, estado));

      const rows = await db.select({
        id:       appointmentsTable.id,
        cliente:  appointmentsTable.clientName,
        telefono: appointmentsTable.clientPhone,
        fecha:    appointmentsTable.date,
        hora:     appointmentsTable.time,
        servicio: appointmentsTable.service,
        estado:   appointmentsTable.status,
      })
        .from(appointmentsTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(appointmentsTable.date, appointmentsTable.time)
        .limit(limit ?? 20);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ turnos: rows, total: rows.length }, null, 2),
        }],
      };
    },
  );

  server.tool(
    "create_appointment",
    {
      cliente:  z.string().describe("Nombre del cliente"),
      telefono: z.string().describe("Teléfono del cliente"),
      fecha:    z.string().describe("Fecha del turno YYYY-MM-DD"),
      hora:     z.string().describe("Hora del turno HH:MM"),
      servicio: z.string().optional().describe("Descripción del servicio"),
      notas:    z.string().optional(),
    },
    async ({ cliente, telefono, fecha, hora, servicio, notas }) => {
      const [row] = await db.insert(appointmentsTable).values({
        userId:      "mcp",
        clientName:  cliente,
        clientPhone: telefono,
        date:        fecha,
        time:        hora,
        service:     servicio ?? "Consulta",
        notes:       notas ?? null,
        status:      "pendiente",
      }).returning({ id: appointmentsTable.id });

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ ok: true, id: row.id, mensaje: `Turno creado para ${cliente} el ${fecha} a las ${hora}` }),
        }],
      };
    },
  );

  server.tool(
    "get_crm_summary",
    {},
    async () => {
      const leads = await db.select({
        etapa: conversationsTable.leadStatus,
      }).from(conversationsTable);

      const por_etapa: Record<string, number> = {};
      for (const l of leads) {
        const e = l.etapa ?? "sin_etapa";
        por_etapa[e] = (por_etapa[e] ?? 0) + 1;
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ total_leads: leads.length, por_etapa }, null, 2),
        }],
      };
    },
  );

  server.tool(
    "get_appointments_summary",
    {},
    async () => {
      const today = new Date().toISOString().slice(0, 10);

      const proximos = await db.select({
        id:      appointmentsTable.id,
        cliente: appointmentsTable.clientName,
        fecha:   appointmentsTable.date,
        hora:    appointmentsTable.time,
        estado:  appointmentsTable.status,
      })
        .from(appointmentsTable)
        .where(gte(appointmentsTable.date, today))
        .orderBy(appointmentsTable.date, appointmentsTable.time)
        .limit(5);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ proximos_turnos: proximos, fecha_actual: today }, null, 2),
        }],
      };
    },
  );

  return server;
}
