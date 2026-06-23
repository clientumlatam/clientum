import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "@workspace/mcp-server";

const router: IRouter = Router();

const transports = new Map<string, StreamableHTTPServerTransport>();

function getApiKey(req: Request): string | null {
  const auth = req.headers["authorization"];
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return (req.query["key"] as string) ?? null;
}

async function validateAuth(req: Request, res: Response): Promise<boolean> {
  if (req.isAuthenticated()) return true;

  const key = getApiKey(req);
  if (!key) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Autenticación requerida. Usá sesión activa o Bearer token." },
      id: null,
    });
    return false;
  }

  const expected = process.env.MCP_API_KEY;
  if (!expected || key !== expected) {
    res.status(403).json({
      jsonrpc: "2.0",
      error: { code: -32002, message: "API key inválida" },
      id: null,
    });
    return false;
  }

  return true;
}

router.post("/mcp", async (req: Request, res: Response) => {
  if (!(await validateAuth(req, res))) return;

  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res, req.body);
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  const server = createMcpServer();
  await server.connect(transport);

  transport.onclose = () => {
    if (transport.sessionId) transports.delete(transport.sessionId);
  };

  if (transport.sessionId) transports.set(transport.sessionId, transport);

  await transport.handleRequest(req, res, req.body);
});

router.get("/mcp", async (req: Request, res: Response) => {
  if (!(await validateAuth(req, res))) return;

  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
    return;
  }

  res.status(400).json({ error: "Session ID requerido para GET (SSE streaming)" });
});

router.delete("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.close();
    transports.delete(sessionId);
    res.status(200).json({ ok: true });
    return;
  }
  res.status(404).json({ error: "Sesión no encontrada" });
});

router.get("/mcp/tools", async (req: Request, res: Response) => {
  if (!(await validateAuth(req, res))) return;

  res.json({
    server: "clientum-mcp",
    version: "1.0.0",
    tools: [
      { name: "list_leads",              description: "Listar leads/contactos del CRM con filtros opcionales" },
      { name: "create_lead",             description: "Crear un nuevo lead en el CRM" },
      { name: "update_lead_stage",       description: "Mover un lead a otra etapa del pipeline" },
      { name: "list_appointments",       description: "Listar turnos con filtros de fecha y estado" },
      { name: "create_appointment",      description: "Crear un nuevo turno en la agenda" },
      { name: "get_crm_summary",         description: "Resumen de leads por etapa del pipeline" },
      { name: "get_appointments_summary", description: "Próximos turnos de hoy en adelante" },
    ],
    endpoint: "/mcp",
    protocol: "MCP 2025-03-26 (StreamableHTTP)",
    auth: "Bearer token (MCP_API_KEY) o sesión activa",
  });
});

export default router;
