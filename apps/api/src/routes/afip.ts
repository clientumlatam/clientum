import { Router, type IRouter, type Request, type Response } from "express";
import { db, afipConfigsTable, afipComprobantesTable, subscriptionsTable } from "@workspace/db";
import { eq, and, or, desc, count } from "drizzle-orm";
import forge from "node-forge";
import { getToken, refreshToken } from "../lib/afip/wsaa";
import { ultimoComprobante, solicitarCae, type InvoiceData } from "../lib/afip/wsfe";

const router: IRouter = Router();

function requireAfipPlan(plan: string | undefined): boolean {
  return ["business", "enterprise"].includes(plan ?? "");
}

async function getUserPlan(userId: string): Promise<string> {
  const [sub] = await db.select({ plan: subscriptionsTable.plan })
    .from(subscriptionsTable)
    .where(and(
      eq(subscriptionsTable.userId, userId),
      or(eq(subscriptionsTable.status, "active"), eq(subscriptionsTable.status, "trialing")),
    )).limit(1);
  return sub?.plan ?? "free";
}

router.get("/afip/status", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const plan = await getUserPlan(req.user.id);
  const hasAccess = requireAfipPlan(plan);

  const [config] = await db.select({
    cuit:        afipConfigsTable.cuit,
    razonSocial: afipConfigsTable.razonSocial,
    puntoVenta:  afipConfigsTable.puntoVenta,
    environment: afipConfigsTable.environment,
    tokenExpiry: afipConfigsTable.tokenExpiry,
    certPem:     afipConfigsTable.certPem,
  }).from(afipConfigsTable).where(eq(afipConfigsTable.userId, req.user.id)).limit(1);

  const configured = !!(config?.cuit && config?.certPem);
  const tokenVivo  = config?.tokenExpiry ? config.tokenExpiry > new Date() : false;

  const tokenHorasRestantes = config?.tokenExpiry
    ? Math.round((config.tokenExpiry.getTime() - Date.now()) / 3_600_000)
    : null;

  let certDiasRestantes: number | null = null;
  if (config?.certPem) {
    try {
      const cert = forge.pki.certificateFromPem(config.certPem);
      certDiasRestantes = Math.round((cert.validity.notAfter.getTime() - Date.now()) / 86_400_000);
    } catch { /* cert inválido */ }
  }

  const [ultimoComp] = hasAccess
    ? await db.select({
        numero:   afipComprobantesTable.numero,
        tipo:     afipComprobantesTable.tipo,
        fecha:    afipComprobantesTable.fecha,
        impTotal: afipComprobantesTable.impTotal,
      }).from(afipComprobantesTable)
        .where(eq(afipComprobantesTable.userId, req.user.id))
        .orderBy(desc(afipComprobantesTable.createdAt))
        .limit(1)
    : [];

  const [totalRow] = hasAccess
    ? await db.select({ total: count() })
        .from(afipComprobantesTable)
        .where(eq(afipComprobantesTable.userId, req.user.id))
    : [];

  res.json({
    hasAccess,
    configured,
    tokenVivo,
    plan,
    cuit:                 config?.cuit ?? null,
    razonSocial:          config?.razonSocial ?? null,
    puntoVenta:           config?.puntoVenta ?? null,
    environment:          config?.environment ?? "homologacion",
    tokenHorasRestantes,
    certDiasRestantes,
    ultimoComprobante:    ultimoComp ?? null,
    totalComprobantes:    totalRow?.total ?? 0,
  });
});

router.post("/afip/configure", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const plan = await getUserPlan(req.user.id);
  if (!requireAfipPlan(plan)) {
    res.status(403).json({ error: "AFIP disponible en plan Business o Enterprise" });
    return;
  }

  const { cuit, razonSocial, puntoVenta, certPem, privateKeyPem, environment } = req.body as {
    cuit?: string; razonSocial?: string; puntoVenta?: number;
    certPem?: string; privateKeyPem?: string; environment?: string;
  };

  if (!cuit || !puntoVenta) {
    res.status(400).json({ error: "CUIT y punto de venta son requeridos" });
    return;
  }

  const cuitClean = cuit.replace(/-/g, "");

  const [existing] = await db.select({ id: afipConfigsTable.id })
    .from(afipConfigsTable).where(eq(afipConfigsTable.userId, req.user.id)).limit(1);

  const data: Partial<typeof afipConfigsTable.$inferInsert> = {
    userId:      req.user.id,
    cuit:        cuitClean,
    razonSocial: razonSocial ?? "",
    puntoVenta:  Number(puntoVenta),
    environment: environment ?? "homologacion",
    updatedAt:   new Date(),
  };

  if (certPem) data.certPem = certPem;
  if (privateKeyPem) data.privateKeyPem = privateKeyPem;

  if (existing) {
    await db.update(afipConfigsTable).set(data).where(eq(afipConfigsTable.userId, req.user.id));
  } else {
    await db.insert(afipConfigsTable).values({ ...data } as typeof afipConfigsTable.$inferInsert);
  }

  res.json({ ok: true, message: "Configuración guardada correctamente" });
});

router.post("/afip/refresh-token", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const plan = await getUserPlan(req.user.id);
  if (!requireAfipPlan(plan)) {
    res.status(403).json({ error: "AFIP disponible en plan Business o Enterprise" });
    return;
  }

  try {
    await refreshToken(req.user.id);
    res.json({ ok: true, message: "Token AFIP renovado correctamente" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    res.status(500).json({ ok: false, error: msg });
  }
});

router.post("/afip/test-connection", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const plan = await getUserPlan(req.user.id);
  if (!requireAfipPlan(plan)) {
    res.status(403).json({ error: "AFIP disponible en plan Business o Enterprise" });
    return;
  }

  try {
    const { token, sign, cuit, puntoVenta } = await getToken(req.user.id);

    const [config] = await db.select({ environment: afipConfigsTable.environment })
      .from(afipConfigsTable).where(eq(afipConfigsTable.userId, req.user.id)).limit(1);
    const env = config?.environment ?? "homologacion";

    const ultimo = await ultimoComprobante(token, sign, cuit, puntoVenta, 11, env);

    res.json({
      ok:      true,
      message: `Conexión exitosa con AFIP (${env}). Último comprobante Tipo 11: ${ultimo}`,
      cuit,
      puntoVenta,
      environment: env,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    res.status(500).json({ ok: false, error: msg });
  }
});

router.post("/afip/solicitar-cae", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const plan = await getUserPlan(req.user.id);
  if (!requireAfipPlan(plan)) {
    res.status(403).json({ error: "AFIP disponible en plan Business o Enterprise" });
    return;
  }

  const {
    tipo = 11, concepto = 2, docTipo = 99, docNro = "0",
    impTotal, impNeto, impIva = 0, iva21Neto, iva105Neto, descripcion,
  } = req.body as Partial<InvoiceData> & { descripcion?: string };

  if (!impTotal || isNaN(Number(impTotal))) {
    res.status(400).json({ error: "impTotal es requerido" });
    return;
  }

  try {
    const { token, sign, cuit, puntoVenta } = await getToken(req.user.id);

    const [config] = await db.select({ environment: afipConfigsTable.environment })
      .from(afipConfigsTable).where(eq(afipConfigsTable.userId, req.user.id)).limit(1);
    const env = config?.environment ?? "homologacion";

    const inv: InvoiceData = {
      tipo:        Number(tipo),
      concepto:    Number(concepto),
      docTipo:     Number(docTipo),
      docNro:      String(docNro),
      impTotal:    Number(impTotal),
      impNeto:     Number(impNeto ?? impTotal),
      impIva:      Number(impIva),
      iva21Neto:   iva21Neto ? Number(iva21Neto) : undefined,
      iva105Neto:  iva105Neto ? Number(iva105Neto) : undefined,
    };

    const result = await solicitarCae(token, sign, cuit, puntoVenta, inv, env);

    const [inserted] = await db.insert(afipComprobantesTable).values({
      userId:      req.user.id,
      tipo:        inv.tipo,
      numero:      result.numero,
      puntoVenta,
      fecha:       result.fecha,
      cae:         result.cae,
      caeFchVto:   result.caeFchVto,
      docTipo:     inv.docTipo,
      docNro:      inv.docNro,
      impTotal:    String(inv.impTotal),
      impNeto:     String(inv.impNeto),
      impIva:      String(inv.impIva),
      concepto:    inv.concepto,
      status:      "emitida",
      descripcion: descripcion ?? null,
      rawResponse: JSON.stringify(result),
    }).returning();

    res.json({ ok: true, ...result, id: inserted.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    res.status(500).json({ ok: false, error: msg });
  }
});

router.get("/afip/comprobantes", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const plan = await getUserPlan(req.user.id);
  if (!requireAfipPlan(plan)) {
    res.status(403).json({ error: "AFIP disponible en plan Business o Enterprise" });
    return;
  }

  const comprobantes = await db.select()
    .from(afipComprobantesTable)
    .where(eq(afipComprobantesTable.userId, req.user.id))
    .orderBy(desc(afipComprobantesTable.createdAt))
    .limit(100);

  res.json({ comprobantes, total: comprobantes.length });
});

router.get("/afip/diagnostico-local", async (req: Request, res: Response) => {
  const ip = req.ip ?? req.socket?.remoteAddress ?? "";
  const isLocal = ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
  if (!isLocal) {
    res.status(403).json({ error: "Solo accesible desde localhost" });
    return;
  }

  const configs = await db.select({
    userId:      afipConfigsTable.userId,
    cuit:        afipConfigsTable.cuit,
    puntoVenta:  afipConfigsTable.puntoVenta,
    environment: afipConfigsTable.environment,
    razonSocial: afipConfigsTable.razonSocial,
    hasCert:     afipConfigsTable.certPem,
    tokenExpiry: afipConfigsTable.tokenExpiry,
  }).from(afipConfigsTable);

  const results: Array<{
    userId: string; cuit: string | null; razonSocial: string | null;
    environment: string; ok: boolean; tokenRenovado: boolean;
    ultimoCbteB: number | null; ms: number; error?: string;
  }> = [];

  for (const cfg of configs) {
    if (!cfg.hasCert || !cfg.cuit) {
      results.push({
        userId: cfg.userId, cuit: cfg.cuit, razonSocial: cfg.razonSocial ?? null,
        environment: cfg.environment ?? "homologacion",
        ok: false, tokenRenovado: false, ultimoCbteB: null, ms: 0,
        error: "Sin certificado o CUIT — configuración incompleta",
      });
      continue;
    }

    const t0 = Date.now();
    try {
      const { token, sign, cuit, puntoVenta } = await getToken(cfg.userId);
      const tokenRenovado = !cfg.tokenExpiry || cfg.tokenExpiry <= new Date();
      const env = cfg.environment ?? "homologacion";
      const ultimo = await ultimoComprobante(token, sign, cuit, puntoVenta, 11, env);
      results.push({
        userId: cfg.userId, cuit, razonSocial: cfg.razonSocial ?? null,
        environment: env, ok: true, tokenRenovado,
        ultimoCbteB: ultimo, ms: Date.now() - t0,
      });
    } catch (err: unknown) {
      results.push({
        userId: cfg.userId, cuit: cfg.cuit, razonSocial: cfg.razonSocial ?? null,
        environment: cfg.environment ?? "homologacion",
        ok: false, tokenRenovado: false, ultimoCbteB: null,
        ms: Date.now() - t0,
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  res.json({
    total:    results.length,
    ok:       results.filter(r => r.ok).length,
    failed:   results.filter(r => !r.ok).length,
    results,
  });
});

router.post("/afip/renovar-todos", async (req: Request, res: Response) => {
  const ip = req.ip ?? req.socket?.remoteAddress ?? "";
  const isLocal = ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
  if (!isLocal) {
    res.status(403).json({ error: "Solo accesible desde localhost" });
    return;
  }

  const UMBRAL_HORAS = Number((req.query["umbral"] as string) ?? "2");
  const umbralMs = UMBRAL_HORAS * 60 * 60 * 1000;
  const ahora = new Date();
  const limite = new Date(ahora.getTime() + umbralMs);

  const configs = await db.select({
    userId:      afipConfigsTable.userId,
    cuit:        afipConfigsTable.cuit,
    razonSocial: afipConfigsTable.razonSocial,
    environment: afipConfigsTable.environment,
    tokenExpiry: afipConfigsTable.tokenExpiry,
    hasCert:     afipConfigsTable.certPem,
  }).from(afipConfigsTable);

  const resultados: Array<{
    userId: string; cuit: string | null; razonSocial: string | null;
    environment: string; accion: "renovado" | "vigente" | "saltado" | "error";
    tokenExpiry?: string; ms: number; error?: string;
  }> = [];

  for (const cfg of configs) {
    const t0 = Date.now();

    if (!cfg.hasCert || !cfg.cuit) {
      resultados.push({
        userId: cfg.userId, cuit: cfg.cuit, razonSocial: cfg.razonSocial ?? null,
        environment: cfg.environment ?? "homologacion",
        accion: "saltado", ms: 0,
        error: "Sin certificado o CUIT",
      });
      continue;
    }

    const necesitaRenovar = !cfg.tokenExpiry || cfg.tokenExpiry <= limite;

    if (!necesitaRenovar) {
      const horasRestantes = Math.round((cfg.tokenExpiry!.getTime() - ahora.getTime()) / 3_600_000);
      resultados.push({
        userId: cfg.userId, cuit: cfg.cuit, razonSocial: cfg.razonSocial ?? null,
        environment: cfg.environment ?? "homologacion",
        accion: "vigente", ms: Date.now() - t0,
        tokenExpiry: `vigente ${horasRestantes}h más`,
      });
      continue;
    }

    try {
      await refreshToken(cfg.userId);
      const [updated] = await db.select({ tokenExpiry: afipConfigsTable.tokenExpiry })
        .from(afipConfigsTable).where(eq(afipConfigsTable.userId, cfg.userId)).limit(1);
      resultados.push({
        userId: cfg.userId, cuit: cfg.cuit, razonSocial: cfg.razonSocial ?? null,
        environment: cfg.environment ?? "homologacion",
        accion: "renovado", ms: Date.now() - t0,
        tokenExpiry: updated?.tokenExpiry?.toISOString() ?? "desconocido",
      });
    } catch (err: unknown) {
      resultados.push({
        userId: cfg.userId, cuit: cfg.cuit, razonSocial: cfg.razonSocial ?? null,
        environment: cfg.environment ?? "homologacion",
        accion: "error", ms: Date.now() - t0,
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  const renovados = resultados.filter(r => r.accion === "renovado").length;
  const vigentes  = resultados.filter(r => r.accion === "vigente").length;
  const errores   = resultados.filter(r => r.accion === "error").length;
  const saltados  = resultados.filter(r => r.accion === "saltado").length;

  res.json({
    umbralHoras: UMBRAL_HORAS,
    total: resultados.length,
    renovados, vigentes, errores, saltados,
    resultados,
  });
});

router.get("/afip/comprobantes/stats", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const comprobantes = await db.select({
    status:   afipComprobantesTable.status,
    impTotal: afipComprobantesTable.impTotal,
  }).from(afipComprobantesTable).where(eq(afipComprobantesTable.userId, req.user.id));

  const total       = comprobantes.length;
  const totalMonto  = comprobantes.reduce((s, c) => s + Number(c.impTotal), 0);
  const emitidas    = comprobantes.filter(c => c.status === "emitida").length;

  res.json({ total, totalMonto, emitidas });
});

export default router;
