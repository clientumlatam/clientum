import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { db, flowsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/flows", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }
  const userId = req.user.id;
  const flows = await db
    .select()
    .from(flowsTable)
    .where(eq(flowsTable.userId, userId))
    .orderBy(flowsTable.priority, flowsTable.createdAt);
  res.json(flows);
});

router.post("/flows", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }
  const userId = req.user.id;
  const { name, active, triggerKeywords, matchType, nodes, priority } = req.body;
  const [flow] = await db
    .insert(flowsTable)
    .values({
      id: crypto.randomUUID(),
      userId,
      name: name ?? "Nuevo flow",
      active: active ?? true,
      triggerKeywords: triggerKeywords ?? "",
      matchType: matchType ?? "contains",
      nodes: nodes ?? [],
      priority: priority ?? 0,
    })
    .returning();
  res.json(flow);
});

router.patch("/flows/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }
  const userId = req.user.id;
  const id = String(req.params["id"]);
  const { name, active, triggerKeywords, matchType, nodes, priority } = req.body;
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) update.name = name;
  if (active !== undefined) update.active = active;
  if (triggerKeywords !== undefined) update.triggerKeywords = triggerKeywords;
  if (matchType !== undefined) update.matchType = matchType;
  if (nodes !== undefined) update.nodes = nodes;
  if (priority !== undefined) update.priority = priority;

  const [flow] = await db
    .update(flowsTable)
    .set(update)
    .where(and(eq(flowsTable.id, id), eq(flowsTable.userId, userId)))
    .returning();

  if (!flow) {
    res.status(404).json({ error: "Flow no encontrado" });
    return;
  }
  res.json(flow);
});

router.delete("/flows/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }
  const userId = req.user.id;
  const id = String(req.params["id"]);
  await db.delete(flowsTable).where(and(eq(flowsTable.id, id), eq(flowsTable.userId, userId)));
  res.json({ ok: true });
});

export default router;
