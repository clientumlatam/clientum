import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { db, newsletterSubscribersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/newsletter/subscribe", async (req: Request, res: Response) => {
  const { email, name, source } = req.body as { email?: string; name?: string; source?: string };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Email inválido" });
    return;
  }

  const existing = await db.select({ id: newsletterSubscribersTable.id, unsubscribed: newsletterSubscribersTable.unsubscribed })
    .from(newsletterSubscribersTable)
    .where(eq(newsletterSubscribersTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (existing.length > 0 && !existing[0].unsubscribed) {
    res.json({ ok: true, message: "Ya estás suscripto a nuestras novedades" });
    return;
  }

  if (existing.length > 0 && existing[0].unsubscribed) {
    await db.update(newsletterSubscribersTable)
      .set({ unsubscribed: false, updatedAt: new Date() })
      .where(eq(newsletterSubscribersTable.id, existing[0].id));
    res.json({ ok: true, message: "¡Bienvenido de vuelta! Te re-suscribiste correctamente." });
    return;
  }

  await db.insert(newsletterSubscribersTable).values({
    id: crypto.randomUUID(),
    email: email.toLowerCase().trim(),
    name: name ?? null,
    source: source ?? "landing",
    confirmed: false,
  });

  logger.info({ email, source }, "New newsletter subscriber");
  res.json({ ok: true, message: "¡Gracias! Te avisamos cuando haya novedades." });
});

router.post("/newsletter/unsubscribe", async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email) { res.status(400).json({ error: "Email requerido" }); return; }

  await db.update(newsletterSubscribersTable)
    .set({ unsubscribed: true, updatedAt: new Date() })
    .where(eq(newsletterSubscribersTable.email, email.toLowerCase().trim()));

  res.json({ ok: true });
});

router.get("/newsletter/subscribers", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }
  const user = req.user as { email?: string };
  if (!user.email?.endsWith("@clientum.com.ar")) {
    res.status(403).json({ error: "Acceso restringido" });
    return;
  }

  const subs = await db.select().from(newsletterSubscribersTable)
    .where(eq(newsletterSubscribersTable.unsubscribed, false))
    .orderBy(newsletterSubscribersTable.createdAt);

  res.json({ subscribers: subs, total: subs.length });
});

export default router;
