import { Router, type IRouter, type Request, type Response } from "express";
import { db, tenantServicesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

const SERVICE_CATALOG = [
  {
    type: "frappe_erp",
    name: "Kit Frappe",
    tagline: "ERP completo con facturación AFIP",
    description:
      "Instancia ERPNext dedicada con subdominio propio. Incluye contabilidad, stock, compras, RRHH, CRM y facturación electrónica AFIP/ARCA.",
    icon: "🏭",
    color: "#0D2461",
    features: [
      "ERPNext v16 dedicado",
      "Subdominio propio (empresa.clientum.com.ar)",
      "Facturación electrónica AFIP/ARCA",
      "CRM Frappe incluido",
      "Backups diarios",
      "SSL automático vía Cloudflare",
    ],
    price: "A consultar",
    available: true,
  },
  {
    type: "whatsapp_bot",
    name: "WhatsApp Bot IA",
    tagline: "Chatbot con IA para WhatsApp Business",
    description:
      "Bot inteligente con IA entrenada en tu negocio. Responde automáticamente, califica leads y hace handoff a un operador humano.",
    icon: "💬",
    color: "#22c55e",
    features: [
      "IA entrenada en tu negocio",
      "Respuestas 24/7",
      "Human handoff",
      "Flow builder",
      "CRM de conversaciones",
    ],
    price: "Incluido en plan",
    available: true,
  },
  {
    type: "instagram_bot",
    name: "Bot Instagram / Facebook",
    tagline: "Automatizá tus DMs en Meta",
    description:
      "Respondé automáticamente mensajes directos de Instagram y Facebook con la misma IA de tu WhatsApp Bot.",
    icon: "📸",
    color: "#E1306C",
    features: [
      "Instagram DMs automáticos",
      "Facebook Messenger",
      "Misma IA que WhatsApp",
      "Panel unificado",
    ],
    price: "Próximamente",
    available: false,
  },
  {
    type: "afip_standalone",
    name: "Facturación AFIP",
    tagline: "Facturación electrónica sin ERP",
    description:
      "Módulo standalone de facturación electrónica AFIP/ARCA. Ideal si ya tenés tu propio sistema y solo necesitás el CAE.",
    icon: "🧾",
    color: "#7C3AED",
    features: [
      "CAE automático",
      "Facturas A, B y C",
      "QR de verificación AFIP",
      "API REST para integrar",
      "Notas de crédito y débito",
    ],
    price: "Próximamente",
    available: false,
  },
] as const;

router.get("/services", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const userServices = await db
    .select()
    .from(tenantServicesTable)
    .where(eq(tenantServicesTable.userId, req.user.id));

  const serviceMap = new Map(userServices.map((s) => [s.serviceType, s]));

  const result = SERVICE_CATALOG.map((svc) => ({
    ...svc,
    tenantService: serviceMap.get(svc.type) ?? null,
  }));

  res.json({ services: result });
});

router.post("/services/request", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const { serviceType, subdomain, notes } = req.body as {
    serviceType: string;
    subdomain?: string;
    notes?: string;
  };

  const validTypes = SERVICE_CATALOG.map((s) => s.type) as string[];
  if (!validTypes.includes(serviceType)) {
    res.status(400).json({ error: "Tipo de servicio inválido" });
    return;
  }

  const existing = await db
    .select({ id: tenantServicesTable.id, status: tenantServicesTable.status })
    .from(tenantServicesTable)
    .where(
      and(
        eq(tenantServicesTable.userId, req.user.id),
        eq(tenantServicesTable.serviceType, serviceType),
      ),
    )
    .limit(1);

  if (existing.length > 0 && existing[0].status !== "inactive" && existing[0].status !== "cancelled") {
    res.status(409).json({ error: "Ya existe una solicitud para este servicio" });
    return;
  }

  const id = crypto.randomUUID();
  await db
    .insert(tenantServicesTable)
    .values({
      id,
      userId: req.user.id,
      serviceType,
      status: "requested",
      subdomain: subdomain ?? null,
      notes: notes ?? null,
      requestedAt: new Date(),
    })
    .onConflictDoNothing();

  const [created] = await db
    .select()
    .from(tenantServicesTable)
    .where(eq(tenantServicesTable.id, id))
    .limit(1);

  res.status(201).json({ service: created });
});

router.patch("/services/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const isAdmin = req.user.email?.endsWith("@clientum.com.ar") && req.user.email !== "demo@clientum.com.ar";
  if (!isAdmin) {
    res.status(403).json({ error: "Solo administradores pueden actualizar servicios" });
    return;
  }

  const id = String(req.params["id"]);
  const { status, siteUrl, subdomain, notes } = req.body as {
    status?: string;
    siteUrl?: string;
    subdomain?: string;
    notes?: string;
  };

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (siteUrl !== undefined) updates.siteUrl = siteUrl;
  if (subdomain !== undefined) updates.subdomain = subdomain;
  if (notes !== undefined) updates.notes = notes;
  if (status === "active") updates.provisionedAt = new Date();

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nada que actualizar" });
    return;
  }

  await db
    .update(tenantServicesTable)
    .set(updates)
    .where(eq(tenantServicesTable.id, id));

  const [updated] = await db
    .select()
    .from(tenantServicesTable)
    .where(eq(tenantServicesTable.id, id))
    .limit(1);

  res.json({ service: updated });
});

router.get("/services/admin/all", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const isAdmin = req.user.email?.endsWith("@clientum.com.ar") && req.user.email !== "demo@clientum.com.ar";
  if (!isAdmin) {
    res.status(403).json({ error: "Solo administradores" });
    return;
  }

  const rows = await db
    .select({
      service: tenantServicesTable,
      userEmail: usersTable.email,
      userFirstName: usersTable.firstName,
      userLastName: usersTable.lastName,
    })
    .from(tenantServicesTable)
    .leftJoin(usersTable, eq(tenantServicesTable.userId, usersTable.id))
    .orderBy(tenantServicesTable.requestedAt);

  res.json({ services: rows });
});

export default router;
