import { Router, type IRouter, type Request, type Response } from "express";
import { db, chatbotConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const ALLOWED_KEYS = [
  "evolutionApiUrl", "evolutionApiKey", "evolutionInstance",
  "openrouterApiKey", "openaiApiKey", "googleMapsApiKey", "groqApiKey",
  "mpAccessToken", "mpWebhookSecret",
  "resendApiKey", "resendFrom",
  "smtpHost", "smtpPort", "smtpUser", "smtpPass", "smtpFrom",
] as const;

type AllowedKey = typeof ALLOWED_KEYS[number];

router.get("/integrations", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const [config] = await db
    .select({
      evolutionApiUrl:    chatbotConfigsTable.evolutionApiUrl,
      evolutionApiKey:    chatbotConfigsTable.evolutionApiKey,
      evolutionInstance:  chatbotConfigsTable.evolutionInstance,
      openrouterApiKey:   chatbotConfigsTable.openrouterApiKey,
      openaiApiKey:       chatbotConfigsTable.openaiApiKey,
      googleMapsApiKey:   chatbotConfigsTable.googleMapsApiKey,
      groqApiKey:         chatbotConfigsTable.groqApiKey,
      mpAccessToken:      chatbotConfigsTable.mpAccessToken,
      mpWebhookSecret:    chatbotConfigsTable.mpWebhookSecret,
      resendApiKey:       chatbotConfigsTable.resendApiKey,
      resendFrom:         chatbotConfigsTable.resendFrom,
      smtpHost:           chatbotConfigsTable.smtpHost,
      smtpPort:           chatbotConfigsTable.smtpPort,
      smtpUser:           chatbotConfigsTable.smtpUser,
      smtpPass:           chatbotConfigsTable.smtpPass,
      smtpFrom:           chatbotConfigsTable.smtpFrom,
    })
    .from(chatbotConfigsTable)
    .where(eq(chatbotConfigsTable.userId, req.user.id))
    .limit(1);

  res.json({
    evolutionApiUrl:   config?.evolutionApiUrl   ?? "",
    evolutionApiKey:   config?.evolutionApiKey   ?? "",
    evolutionInstance: config?.evolutionInstance ?? "",
    openrouterApiKey:  config?.openrouterApiKey  ?? "",
    openaiApiKey:      config?.openaiApiKey      ?? "",
    googleMapsApiKey:  config?.googleMapsApiKey  ?? "",
    groqApiKey:        config?.groqApiKey        ?? "",
    mpAccessToken:     config?.mpAccessToken     ?? "",
    mpWebhookSecret:   config?.mpWebhookSecret   ?? "",
    resendApiKey:      config?.resendApiKey      ?? "",
    resendFrom:        config?.resendFrom        ?? "",
    smtpHost:          config?.smtpHost          ?? "",
    smtpPort:          config?.smtpPort          ?? "",
    smtpUser:          config?.smtpUser          ?? "",
    smtpPass:          config?.smtpPass          ?? "",
    smtpFrom:          config?.smtpFrom          ?? "",
  });
});

router.patch("/integrations", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const body = req.body as Partial<Record<AllowedKey, string>>;

  const fields: Partial<Record<AllowedKey, string>> = {};
  for (const key of ALLOWED_KEYS) {
    if (key in body && typeof body[key] === "string") {
      fields[key] = body[key] as string;
    }
  }

  if (Object.keys(fields).length === 0) {
    res.status(400).json({ error: "Sin campos para actualizar" });
    return;
  }

  const [existing] = await db
    .select({ id: chatbotConfigsTable.id })
    .from(chatbotConfigsTable)
    .where(eq(chatbotConfigsTable.userId, req.user.id))
    .limit(1);

  if (existing) {
    await db.update(chatbotConfigsTable).set(fields)
      .where(eq(chatbotConfigsTable.userId, req.user.id));
  } else {
    await db.insert(chatbotConfigsTable).values({
      id: crypto.randomUUID(),
      userId: req.user.id,
      widgetToken: crypto.randomUUID().replace(/-/g, ""),
      ...fields,
    });
  }

  res.json({ ok: true });
});

export default router;
