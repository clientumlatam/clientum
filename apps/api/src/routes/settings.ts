import { Router, type IRouter, type Request, type Response } from "express";
import { db, subscriptionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { sendWelcomeEmail } from "../lib/email";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const PLAN_FEATURES = {
  free: {
    name: "Free",
    price: "$0",
    badge: "",
    contacts: 50,
    integrations: 1,
    reports: 1,
    chatbot: false,
    erp: false,
    prioritySupport: false,
    features: [
      "CRM hasta 50 contactos",
      "1 chatbot (100 mensajes/mes)",
      "1 integración",
      "1 reporte mensual",
      "Soporte por WhatsApp",
    ],
  },
  starter: {
    name: "Starter",
    price: "$149.000/mes ARS",
    badge: "Básico",
    contacts: 500,
    integrations: 1,
    reports: 2,
    chatbot: true,
    erp: false,
    prioritySupport: false,
    features: [
      "CRM hasta 500 contactos",
      "Chatbot básico WhatsApp",
      "1 integración",
      "2 reportes automáticos/mes",
      "Soporte email/WhatsApp",
      "30 días de acompañamiento",
    ],
  },
  pro: {
    name: "Pro",
    price: "$299.000/mes ARS",
    badge: "Más popular",
    contacts: -1,
    integrations: 3,
    reports: -1,
    chatbot: true,
    erp: true,
    prioritySupport: true,
    features: [
      "CRM ilimitado",
      "Chatbot con IA entrenada",
      "3 integraciones",
      "Reportes ilimitados",
      "ERP básico (stock + facturación)",
      "Soporte prioritario 24/7",
      "30 días de acompañamiento",
    ],
  },
  business: {
    name: "Business",
    price: "$549.000/mes ARS",
    badge: "Multi-agente",
    contacts: -1,
    integrations: 5,
    reports: -1,
    chatbot: true,
    erp: true,
    prioritySupport: true,
    features: [
      "Todo lo de Pro",
      "Multi-agente IA",
      "5 integraciones",
      "ERP completo + AFIP",
      "Acceso API",
      "Ejecutivo dedicado",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: "A medida",
    badge: "Personalizado",
    contacts: -1,
    integrations: -1,
    reports: -1,
    chatbot: true,
    erp: true,
    prioritySupport: true,
    features: [
      "Todo lo de Business",
      "Integraciones ilimitadas",
      "Agentes autónomos a medida",
      "SLA garantizado",
      "Capacitación presencial",
      "Gerente de cuenta dedicado",
    ],
  },
} as const;

export const TRIAL_DAYS = 7;

export async function ensureTrialSubscription(userId: string): Promise<void> {
  const [existing] = await db
    .select({ id: subscriptionsTable.id })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .limit(1);

  if (existing) return;

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

  await db.insert(subscriptionsTable).values({
    id: crypto.randomUUID(),
    userId,
    plan: "starter",
    status: "trialing",
    currentPeriodEnd: trialEnd,
  }).onConflictDoNothing();

  const [user] = await db
    .select({ email: usersTable.email, firstName: usersTable.firstName })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (user?.email) {
    sendWelcomeEmail(user.email, user.firstName ?? "", TRIAL_DAYS).catch((e: unknown) => {
      logger.warn({ err: e }, "No se pudo enviar email de bienvenida");
    });
  }
}

router.get("/settings", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, req.user.id))
    .limit(1);

  let status = sub?.status ?? "none";
  let planKey = (sub?.plan ?? "free") as keyof typeof PLAN_FEATURES;

  if (sub && sub.status === "trialing" && sub.currentPeriodEnd) {
    const expired = new Date() > new Date(sub.currentPeriodEnd);
    if (expired) {
      await db
        .update(subscriptionsTable)
        .set({ status: "expired" })
        .where(eq(subscriptionsTable.id, sub.id));
      status = "expired";
      planKey = "free";
    }
  }

  if (status === "expired") {
    planKey = "free";
  }

  const planFeatures = PLAN_FEATURES[planKey] ?? PLAN_FEATURES.free;

  const trialDaysLeft =
    status === "trialing" && sub?.currentPeriodEnd
      ? Math.max(0, Math.ceil((new Date(sub.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      profileImageUrl: req.user.profileImageUrl,
    },
    subscription: {
      plan: planKey,
      status,
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      trialDaysLeft,
    },
    planFeatures,
    allPlans: PLAN_FEATURES,
  });
});

export default router;
