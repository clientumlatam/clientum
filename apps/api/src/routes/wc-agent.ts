import { Router, type IRouter, type Request, type Response } from "express";
import { db, tenantsTable, wcAgentSessionsTable, agentHandoffsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { evolutionWebhookHandler, getTenantConfig } from "../lib/wc-agent-whatsapp.js";
import { WooCommerceAIAgent } from "../lib/woocommerce-ai-agent.js";

const router: IRouter = Router();

// ── POST /api/webhooks/evolution/:instance ─────────────────────────────────────
// Registrar esta URL en cada instancia de Evolution API
router.post("/webhooks/evolution/:instance", evolutionWebhookHandler);

// ── POST /api/tenants/:tenantId/wc-agent/chat ──────────────────────────────────
// Chat directo para testing desde el panel admin
router.post("/tenants/:tenantId/wc-agent/chat", async (req: Request, res: Response) => {
  const tenantId = String(req.params["tenantId"]);
  const { message, customerId = 0, sessionId } = req.body as { message?: string; customerId?: number; sessionId?: string };

  if (!message) { res.status(422).json({ error: "message requerido" }); return; }

  const tenantConfig = await getTenantConfig(tenantId);
  if (!tenantConfig) { res.status(404).json({ error: `Tenant no encontrado: ${tenantId}` }); return; }

  const agent   = new WooCommerceAIAgent(tenantConfig);
  const response = await agent.handleCustomerQuery(message, customerId, sessionId ?? `chat-${Date.now()}`);
  res.json({ response });
});

// ── GET /api/tenants/:tenantId/wc-agent/sessions ──────────────────────────────
router.get("/tenants/:tenantId/wc-agent/sessions", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || req.user.role !== "admin") { res.status(403).json({ error: "Acceso denegado" }); return; }
  const tenantId = String(req.params["tenantId"]);
  const rows = await db.select().from(wcAgentSessionsTable).where(eq(wcAgentSessionsTable.tenantId, tenantId));
  res.json(rows);
});

export default router;
