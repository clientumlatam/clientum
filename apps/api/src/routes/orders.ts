import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { db, ordersTable, orderItemsTable, orderStatusHistoryTable, subscriptionsTable, chatbotConfigsTable } from "@workspace/db";
import { eq, and, or, desc, isNull, count } from "drizzle-orm";
import { sendWhatsAppReply } from "../lib/openrouter";
import { logger } from "../lib/logger";
import { normalizeArgPhone } from "../lib/phone";

const router: IRouter = Router();

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "En preparación",
  shipped: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_MESSAGES: Record<string, string> = {
  confirmed: "✅ Tu pedido #{orderNumber} fue *confirmado*. ¡Empezamos a prepararlo!",
  preparing: "👨‍🍳 Tu pedido #{orderNumber} está *en preparación*. Te avisamos cuando salga.",
  shipped: "🚚 Tu pedido #{orderNumber} está *en camino*. ¡Pronto llega!",
  delivered: "🎉 Tu pedido #{orderNumber} fue *entregado*. ¡Gracias por elegirnos!",
  cancelled: "❌ Tu pedido #{orderNumber} fue *cancelado*. Contactanos si tenés dudas.",
};

router.get("/orders", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const [sub] = await db.select({ plan: subscriptionsTable.plan })
    .from(subscriptionsTable)
    .where(and(
      eq(subscriptionsTable.userId, req.user.id),
      or(eq(subscriptionsTable.status, "active"), eq(subscriptionsTable.status, "trialing")),
    )).limit(1);

  if (!sub || sub.plan === "free") {
    res.status(403).json({ error: "Pedidos disponibles desde plan Starter" });
    return;
  }

  const { status, limit: limitParam, offset: offsetParam } = req.query as { status?: string; limit?: string; offset?: string };
  const limit = Math.min(Math.max(parseInt(limitParam ?? "50", 10) || 50, 1), 200);
  const offset = Math.max(parseInt(offsetParam ?? "0", 10) || 0, 0);

  const conditions = [eq(ordersTable.userId, req.user.id), isNull(ordersTable.deletedAt)];
  if (status && status !== "all") conditions.push(eq(ordersTable.status, status));

  const [[{ total }], orders] = await Promise.all([
    db.select({ total: count() }).from(ordersTable).where(and(...conditions)),
    db.select().from(ordersTable).where(and(...conditions))
      .orderBy(desc(ordersTable.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const ordersWithItems = await Promise.all(orders.map(async (order) => {
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    return { ...order, items };
  }));

  res.json({ orders: ordersWithItems });
});

router.post("/orders", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const [sub] = await db.select({ plan: subscriptionsTable.plan })
    .from(subscriptionsTable)
    .where(and(
      eq(subscriptionsTable.userId, req.user.id),
      or(eq(subscriptionsTable.status, "active"), eq(subscriptionsTable.status, "trialing")),
    )).limit(1);

  if (!sub || sub.plan === "free") {
    res.status(403).json({ error: "Pedidos disponibles desde plan Starter" });
    return;
  }

  const { contactName, contactPhone, contactEmail, notes, deliveryAddress, channel, items } = req.body as {
    contactName: string;
    contactPhone: string;
    contactEmail?: string;
    notes?: string;
    deliveryAddress?: string;
    channel?: string;
    items?: { productName: string; quantity: number; unitPrice: number; notes?: string }[];
  };

  if (!contactName || !contactPhone) {
    res.status(400).json({ error: "Nombre y teléfono son requeridos" });
    return;
  }

  const orderId = crypto.randomUUID();
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
  const orderItems = items ?? [];
  const totalAmount = orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  await db.transaction(async (tx) => {
    await tx.insert(ordersTable).values({
      id: orderId,
      userId: req.user.id,
      orderNumber,
      contactName,
      contactPhone: normalizeArgPhone(contactPhone),
      contactEmail: contactEmail ?? null,
      notes: notes ?? "",
      deliveryAddress: deliveryAddress ?? "",
      channel: channel ?? "manual",
      totalAmount,
      status: "pending",
    });

    for (const item of orderItems) {
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
      note: "Pedido creado",
    });
  });

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  res.json({ order });
});

router.patch("/orders/:id/status", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const id = String(req.params["id"]);
  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);

  if (!existing || existing.userId !== req.user.id) {
    res.status(404).json({ error: "Pedido no encontrado" });
    return;
  }

  const { status, note } = req.body as { status: string; note?: string };
  if (!status) { res.status(400).json({ error: "Estado requerido" }); return; }

  await db.update(ordersTable).set({ status }).where(eq(ordersTable.id, id));
  await db.insert(orderStatusHistoryTable).values({
    id: crypto.randomUUID(),
    orderId: id,
    fromStatus: existing.status,
    toStatus: status,
    note: note ?? STATUS_LABELS[status] ?? status,
  });

  const [config] = await db.select({
    evolutionApiUrl: chatbotConfigsTable.evolutionApiUrl,
    evolutionApiKey: chatbotConfigsTable.evolutionApiKey,
    evolutionInstance: chatbotConfigsTable.evolutionInstance,
  }).from(chatbotConfigsTable).where(eq(chatbotConfigsTable.userId, req.user.id)).limit(1);

  const msgTemplate = STATUS_MESSAGES[status];
  if (config?.evolutionInstance && msgTemplate) {
    const msg = msgTemplate.replace("{orderNumber}", existing.orderNumber);
    await sendWhatsAppReply({
      evolutionApiUrl: config.evolutionApiUrl,
      evolutionApiKey: config.evolutionApiKey,
      instance: config.evolutionInstance,
      to: existing.contactPhone,
      text: msg,
    }).catch((e: unknown) => logger.warn({ err: e }, "No se pudo enviar notif WA de pedido"));
  }

  res.json({ ok: true });
});

router.get("/orders/stats", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const all = await db.select({ status: ordersTable.status, totalAmount: ordersTable.totalAmount })
    .from(ordersTable).where(eq(ordersTable.userId, req.user.id));

  const stats = {
    total: all.length,
    pending: all.filter(o => o.status === "pending").length,
    confirmed: all.filter(o => o.status === "confirmed").length,
    preparing: all.filter(o => o.status === "preparing").length,
    shipped: all.filter(o => o.status === "shipped").length,
    delivered: all.filter(o => o.status === "delivered").length,
    cancelled: all.filter(o => o.status === "cancelled").length,
    revenue: all.filter(o => o.status === "delivered").reduce((s, o) => s + (o.totalAmount ?? 0), 0),
  };

  res.json({ stats });
});

router.get("/orders/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const id = String(req.params["id"]);
  const [order] = await db.select().from(ordersTable).where(and(
    eq(ordersTable.id, id),
    eq(ordersTable.userId, req.user.id),
  )).limit(1);

  if (!order) { res.status(404).json({ error: "Pedido no encontrado" }); return; }

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
  const history = await db.select().from(orderStatusHistoryTable).where(eq(orderStatusHistoryTable.orderId, id)).orderBy(orderStatusHistoryTable.createdAt);

  res.json({ order: { ...order, items, history } });
});

export default router;
