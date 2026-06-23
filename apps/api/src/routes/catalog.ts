import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { db, catalogConfigsTable, chatbotConfigsTable, ordersTable, orderItemsTable, orderStatusHistoryTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sendWhatsAppReply } from "../lib/openrouter";
import { normalizeArgPhone } from "../lib/phone";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const AI_CATALOG_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

const router: IRouter = Router();

router.get("/catalog/config", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  let [config] = await db.select().from(catalogConfigsTable)
    .where(eq(catalogConfigsTable.userId, req.user.id)).limit(1);

  if (config && !config.token) {
    const token = crypto.randomUUID().replace(/-/g, "");
    await db.update(catalogConfigsTable)
      .set({ token })
      .where(eq(catalogConfigsTable.userId, req.user.id));
    config = { ...config, token };
  }

  res.json({ config: config ?? null });
});

router.put("/catalog/config", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const {
    productsUrl, brandName, brandSubtitle,
    primaryColor, secondaryColor, logoUrl, heroImage,
    heroBadge, heroTitle, heroTitleAccent, heroDescription,
    catalogTitle, catalogSubtitle, searchPlaceholder,
    currency, whatsapp, instagram, facebook, mapsUrl,
    address, hours, footerDesc, featuresJson, faqJson, resellerJson, active,
  } = req.body as Record<string, string | boolean>;

  const fields = {
    ...(productsUrl !== undefined && { productsUrl: String(productsUrl) }),
    ...(brandName !== undefined && { brandName: String(brandName) }),
    ...(brandSubtitle !== undefined && { brandSubtitle: String(brandSubtitle) }),
    ...(primaryColor !== undefined && { primaryColor: String(primaryColor) }),
    ...(secondaryColor !== undefined && { secondaryColor: String(secondaryColor) }),
    ...(logoUrl !== undefined && { logoUrl: String(logoUrl) }),
    ...(heroImage !== undefined && { heroImage: String(heroImage) }),
    ...(heroBadge !== undefined && { heroBadge: String(heroBadge) }),
    ...(heroTitle !== undefined && { heroTitle: String(heroTitle) }),
    ...(heroTitleAccent !== undefined && { heroTitleAccent: String(heroTitleAccent) }),
    ...(heroDescription !== undefined && { heroDescription: String(heroDescription) }),
    ...(catalogTitle !== undefined && { catalogTitle: String(catalogTitle) }),
    ...(catalogSubtitle !== undefined && { catalogSubtitle: String(catalogSubtitle) }),
    ...(searchPlaceholder !== undefined && { searchPlaceholder: String(searchPlaceholder) }),
    ...(currency !== undefined && { currency: String(currency) }),
    ...(whatsapp !== undefined && { whatsapp: String(whatsapp) }),
    ...(instagram !== undefined && { instagram: String(instagram) }),
    ...(facebook !== undefined && { facebook: String(facebook) }),
    ...(mapsUrl !== undefined && { mapsUrl: String(mapsUrl) }),
    ...(address !== undefined && { address: String(address) }),
    ...(hours !== undefined && { hours: String(hours) }),
    ...(footerDesc !== undefined && { footerDesc: String(footerDesc) }),
    ...(featuresJson !== undefined && { featuresJson: String(featuresJson) }),
    ...(faqJson !== undefined && { faqJson: String(faqJson) }),
    ...(resellerJson !== undefined && { resellerJson: String(resellerJson) }),
    ...(active !== undefined && { active: Boolean(active) }),
  };

  const [existing] = await db.select({ id: catalogConfigsTable.id })
    .from(catalogConfigsTable)
    .where(eq(catalogConfigsTable.userId, req.user.id)).limit(1);

  if (existing) {
    await db.update(catalogConfigsTable).set(fields)
      .where(eq(catalogConfigsTable.userId, req.user.id));
  } else {
    const token = crypto.randomUUID().replace(/-/g, "");
    await db.insert(catalogConfigsTable).values({
      id: crypto.randomUUID(),
      userId: req.user.id,
      token,
      productsUrl: String(productsUrl ?? ""),
      brandName: String(brandName ?? ""),
      brandSubtitle: String(brandSubtitle ?? ""),
      primaryColor: String(primaryColor ?? "#002266"),
      secondaryColor: String(secondaryColor ?? "#0052CC"),
      logoUrl: String(logoUrl ?? ""),
      heroImage: String(heroImage ?? ""),
      heroBadge: String(heroBadge ?? ""),
      heroTitle: String(heroTitle ?? ""),
      heroTitleAccent: String(heroTitleAccent ?? ""),
      heroDescription: String(heroDescription ?? ""),
      catalogTitle: String(catalogTitle ?? "Nuestro Catálogo"),
      catalogSubtitle: String(catalogSubtitle ?? "Explorá nuestros productos por categoría."),
      searchPlaceholder: String(searchPlaceholder ?? "¿Qué producto buscás?"),
      currency: String(currency ?? "$"),
      whatsapp: String(whatsapp ?? ""),
      instagram: String(instagram ?? ""),
      facebook: String(facebook ?? ""),
      mapsUrl: String(mapsUrl ?? ""),
      address: String(address ?? ""),
      hours: String(hours ?? ""),
      footerDesc: String(footerDesc ?? ""),
      featuresJson: String(featuresJson ?? "[]"),
      faqJson: String(faqJson ?? "[]"),
      resellerJson: String(resellerJson ?? '{"enabled":false,"title":"","subtitle":"","description":"","buttonText":"Consultar por Mayor"}'),
      active: Boolean(active ?? true),
    });
  }

  res.json({ ok: true });
});

router.post("/catalog/ai-generate", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) { res.status(503).json({ error: "OPENROUTER_API_KEY no configurado" }); return; }

  const { businessName, businessType, description } = req.body as { businessName: string; businessType: string; description: string };
  if (!businessName || !description) {
    res.status(400).json({ error: "businessName y description son requeridos" }); return;
  }

  const prompt = `Sos un experto en marketing digital para PyMEs argentinas.
Generá contenido completo para el catálogo digital de: "${businessName}" (${businessType || "negocio"}).
Descripción: "${description}"

Devolvé ÚNICAMENTE JSON válido con esta estructura exacta:
{
  "brandSubtitle": "slogan corto máx 6 palabras",
  "heroBadge": "badge 2-3 palabras (ej: Distribuidora Mayorista)",
  "heroTitle": "título hero impactante 3-5 palabras SIN el nombre del negocio",
  "heroTitleAccent": "complemento con acento de color 3-4 palabras (ej: al mejor precio.)",
  "heroDescription": "descripción hero persuasiva 1-2 oraciones",
  "catalogTitle": "título sección catálogo",
  "catalogSubtitle": "subtítulo catálogo 1 oración corta",
  "searchPlaceholder": "placeholder del buscador",
  "footerDesc": "descripción footer 1-2 oraciones",
  "features": [
    {"emoji": "🚚", "title": "Título beneficio", "desc": "Descripción corta"},
    {"emoji": "⭐", "title": "Título beneficio", "desc": "Descripción corta"},
    {"emoji": "💬", "title": "Título beneficio", "desc": "Descripción corta"}
  ],
  "faqs": [
    {"q": "Pregunta frecuente 1 relevante para el rubro", "a": "Respuesta clara"},
    {"q": "Pregunta frecuente 2", "a": "Respuesta clara"},
    {"q": "Pregunta frecuente 3", "a": "Respuesta clara"}
  ]
}`;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: AI_CATALOG_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.75,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      res.status(502).json({ error: "Error de OpenRouter", detail: err }); return;
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(502).json({ error: "La IA no devolvió JSON válido", raw: content }); return;
    }
    const generated = JSON.parse(jsonMatch[0]);
    res.json({ generated });
  } catch (err) {
    res.status(500).json({ error: "Error interno al generar contenido" });
  }
});

router.post("/catalog/upload-image", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const { dataUrl, filename } = req.body as { dataUrl: string; filename: string };
  if (!dataUrl?.startsWith("data:image/")) {
    res.status(400).json({ error: "dataUrl inválido" }); return;
  }

  const { writeFile, mkdir } = await import("fs/promises");
  const { join } = await import("path");
  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) { res.status(400).json({ error: "Formato inválido" }); return; }

  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const safeFilename = `${Date.now()}_${(filename || "img").replace(/[^a-zA-Z0-9._-]/g, "_")}.${ext}`;
  const uploadsDir = join(process.cwd(), "../clientum/public/uploads");

  try {
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(join(uploadsDir, safeFilename), Buffer.from(match[2], "base64"));
    res.json({ url: `/uploads/${safeFilename}` });
  } catch {
    res.status(500).json({ error: "Error guardando imagen" });
  }
});

router.get("/catalog/public/:token", async (req: Request, res: Response) => {
  const token = String(req.params["token"]);
  const [config] = await db.select().from(catalogConfigsTable)
    .where(eq(catalogConfigsTable.token, token)).limit(1);

  if (!config || !config.active) {
    res.status(404).json({ error: "Catálogo no encontrado o inactivo" });
    return;
  }

  const [chatbotConfig] = await db.select({
    widgetToken: chatbotConfigsTable.widgetToken,
    mpAccessToken: chatbotConfigsTable.mpAccessToken,
  })
    .from(chatbotConfigsTable)
    .where(eq(chatbotConfigsTable.userId, config.userId))
    .limit(1);

  const { userId: _u, id: _id, ...pub } = config;
  res.json({
    ...pub,
    chatbotWidgetToken: chatbotConfig?.widgetToken ?? null,
    hasMercadoPago: !!(chatbotConfig?.mpAccessToken),
  });
});

router.post("/catalog/public/:token/checkout", async (req: Request, res: Response) => {
  const token = String(req.params["token"]);

  const [catalogConfig] = await db.select()
    .from(catalogConfigsTable)
    .where(eq(catalogConfigsTable.token, token))
    .limit(1);

  if (!catalogConfig || !catalogConfig.active) {
    res.status(404).json({ error: "Catálogo no encontrado" });
    return;
  }

  const [chatbotConfig] = await db.select({
    mpAccessToken: chatbotConfigsTable.mpAccessToken,
    evolutionApiUrl: chatbotConfigsTable.evolutionApiUrl,
    evolutionApiKey: chatbotConfigsTable.evolutionApiKey,
    evolutionInstance: chatbotConfigsTable.evolutionInstance,
  })
    .from(chatbotConfigsTable)
    .where(eq(chatbotConfigsTable.userId, catalogConfig.userId))
    .limit(1);

  const { contactName, contactPhone, notes, items } = req.body as {
    contactName?: string;
    contactPhone?: string;
    notes?: string;
    items?: { productName: string; quantity: number; unitPrice: number; notes?: string }[];
  };

  if (!contactName || !contactPhone || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "Nombre, teléfono e ítems son requeridos" });
    return;
  }

  const orderId = crypto.randomUUID();
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
  const totalAmount = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const normalizedPhone = normalizeArgPhone(contactPhone);

  await db.transaction(async (tx) => {
    await tx.insert(ordersTable).values({
      id: orderId,
      userId: catalogConfig.userId,
      orderNumber,
      contactName,
      contactPhone: normalizedPhone,
      contactEmail: null,
      notes: notes ?? "",
      deliveryAddress: "",
      channel: "catalog",
      totalAmount,
      status: "pending",
    });

    for (const item of items) {
      await tx.insert(orderItemsTable).values({
        id: crypto.randomUUID(),
        orderId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.quantity,
        notes: item.notes ?? "",
      });
    }

    await tx.insert(orderStatusHistoryTable).values({
      id: crypto.randomUUID(),
      orderId,
      fromStatus: "",
      toStatus: "pending",
      note: "Pedido desde catálogo digital",
    });
  });

  if (chatbotConfig?.evolutionApiUrl && chatbotConfig?.evolutionInstance && catalogConfig.whatsapp) {
    const summary = items.map((i) => `• ${i.quantity}× ${i.productName}`).join("\n");
    const notifMsg = `🛒 *Nuevo pedido #${orderNumber}*\n\n👤 ${contactName}\n📱 ${contactPhone}${notes ? `\n📝 ${notes}` : ""}\n\n${summary}\n\n💰 Total: $${totalAmount.toLocaleString("es-AR")}`;
    sendWhatsAppReply({
      evolutionApiUrl: chatbotConfig.evolutionApiUrl,
      evolutionApiKey: chatbotConfig.evolutionApiKey,
      instance: chatbotConfig.evolutionInstance,
      to: catalogConfig.whatsapp,
      text: notifMsg,
    }).catch(() => {});
  }

  const mpToken = chatbotConfig?.mpAccessToken;
  if (mpToken) {
    try {
      const proto = req.headers["x-forwarded-proto"] ?? "https";
      const host = req.headers["x-forwarded-host"] ?? req.headers["host"] ?? "localhost";
      const origin = `${proto}://${host}`;

      const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: { Authorization: `Bearer ${mpToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            title: i.productName,
            unit_price: i.unitPrice,
            quantity: i.quantity,
            currency_id: "ARS",
          })),
          payer: { phone: { number: contactPhone }, name: contactName },
          back_urls: {
            success: `${origin}/pedido/${orderId}?payment=success`,
            failure: `${origin}/pedido/${orderId}?payment=failure`,
            pending: `${origin}/pedido/${orderId}?payment=pending`,
          },
          auto_return: "approved",
          external_reference: `${catalogConfig.userId}|${orderId}`,
          notification_url: `${origin}/api/catalog/mp-webhook`,
          statement_descriptor: (catalogConfig.brandName ?? "CLIENTUM").slice(0, 22),
        }),
      });

      if (mpRes.ok) {
        const mpData = (await mpRes.json()) as { id: string; init_point: string; sandbox_init_point: string };
        res.json({ orderId, orderNumber, mpInitPoint: mpData.init_point, mpSandboxPoint: mpData.sandbox_init_point });
        return;
      }
    } catch (err) {
      req.log.warn({ err }, "Catalog MP preference creation failed, returning without MP link");
    }
  }

  res.json({ orderId, orderNumber });
});

router.get("/catalog/order/:orderId", async (req: Request, res: Response) => {
  const orderId = String(req.params["orderId"]);

  const [order] = await db.select().from(ordersTable)
    .where(eq(ordersTable.id, orderId)).limit(1);

  if (!order) {
    res.status(404).json({ error: "Pedido no encontrado" });
    return;
  }

  const items = await db.select().from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, orderId));

  const [catalogConfig] = await db.select({
    brandName: catalogConfigsTable.brandName,
    primaryColor: catalogConfigsTable.primaryColor,
    logoUrl: catalogConfigsTable.logoUrl,
    whatsapp: catalogConfigsTable.whatsapp,
    token: catalogConfigsTable.token,
  }).from(catalogConfigsTable)
    .where(eq(catalogConfigsTable.userId, order.userId)).limit(1);

  res.json({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      contactName: order.contactName,
      totalAmount: order.totalAmount,
      currency: order.currency,
      notes: order.notes,
      channel: order.channel,
      createdAt: order.createdAt,
    },
    items: items.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
      notes: i.notes,
    })),
    brand: {
      brandName: catalogConfig?.brandName ?? "",
      primaryColor: catalogConfig?.primaryColor ?? "#002266",
      logoUrl: catalogConfig?.logoUrl ?? "",
      whatsapp: catalogConfig?.whatsapp ?? "",
      catalogToken: catalogConfig?.token ?? "",
    },
  });
});

router.post("/catalog/mp-webhook", async (req: Request, res: Response) => {
  const body = req.body as { type?: string; data?: { id?: string }; external_reference?: string };
  const paymentId = body.data?.id ?? (req.query.id as string | undefined);
  const topic = body.type ?? (req.query.topic as string | undefined);

  if (topic !== "payment" || !paymentId) {
    res.status(200).json({ ok: true });
    return;
  }

  try {
    let userId: string | undefined;
    let orderId: string | undefined;

    if (body.external_reference) {
      [userId, orderId] = body.external_reference.split("|");
    }

    if (!userId || !orderId) {
      const serverToken = process.env.MP_ACCESS_TOKEN;
      if (!serverToken) { res.status(200).json({ ok: true }); return; }

      const tmpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${serverToken}` },
      });
      if (!tmpRes.ok) { res.status(200).json({ ok: true }); return; }

      const tmp = (await tmpRes.json()) as { external_reference?: string };
      if (!tmp.external_reference) { res.status(200).json({ ok: true }); return; }
      [userId, orderId] = tmp.external_reference.split("|");
    }

    if (!userId || !orderId) { res.status(200).json({ ok: true }); return; }

    const [chatbotConfig] = await db.select({
      mpAccessToken: chatbotConfigsTable.mpAccessToken,
      evolutionApiUrl: chatbotConfigsTable.evolutionApiUrl,
      evolutionApiKey: chatbotConfigsTable.evolutionApiKey,
      evolutionInstance: chatbotConfigsTable.evolutionInstance,
    })
      .from(chatbotConfigsTable)
      .where(eq(chatbotConfigsTable.userId, userId))
      .limit(1);

    if (!chatbotConfig?.mpAccessToken) { res.status(200).json({ ok: true }); return; }

    const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${chatbotConfig.mpAccessToken}` },
    });
    if (!payRes.ok) { res.status(200).json({ ok: true }); return; }

    const payment = (await payRes.json()) as { status: string };

    if (payment.status === "approved") {
      const [order] = await db.select()
        .from(ordersTable)
        .where(and(eq(ordersTable.id, orderId), eq(ordersTable.userId, userId)))
        .limit(1);

      if (order && order.status === "pending") {
        await db.update(ordersTable)
          .set({ status: "confirmed" })
          .where(eq(ordersTable.id, orderId));

        await db.insert(orderStatusHistoryTable).values({
          id: crypto.randomUUID(),
          orderId,
          fromStatus: "pending",
          toStatus: "confirmed",
          note: "Pago aprobado por MercadoPago",
        });

        if (chatbotConfig.evolutionApiUrl && chatbotConfig.evolutionInstance && order.contactPhone) {
          sendWhatsAppReply({
            evolutionApiUrl: chatbotConfig.evolutionApiUrl,
            evolutionApiKey: chatbotConfig.evolutionApiKey,
            instance: chatbotConfig.evolutionInstance,
            to: order.contactPhone,
            text: `✅ *¡Tu pago fue aprobado!*\n\nTu pedido *#${order.orderNumber}* está confirmado. ¡Gracias por tu compra! 🎉`,
          }).catch(() => {});
        }
      }
    }
  } catch (err) {
    req.log.error({ err }, "Catalog MP webhook error");
  }

  res.status(200).json({ ok: true });
});

export default router;
