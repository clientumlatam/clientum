import { db, afipConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { refreshToken } from "./afip/wsaa";
import { logger } from "./logger";

const INTERVAL_MS = (Number(process.env["AFIP_TOKEN_RENEW_INTERVAL_H"] ?? "2")) * 60 * 60 * 1000;
const UMBRAL_MS   = (Number(process.env["AFIP_TOKEN_RENEW_UMBRAL_H"]    ?? "3")) * 60 * 60 * 1000;

async function renewExpiringTokens(): Promise<void> {
  const ahora  = new Date();
  const limite = new Date(ahora.getTime() + UMBRAL_MS);

  const configs = await db.select({
    userId:      afipConfigsTable.userId,
    cuit:        afipConfigsTable.cuit,
    environment: afipConfigsTable.environment,
    tokenExpiry: afipConfigsTable.tokenExpiry,
    hasCert:     afipConfigsTable.certPem,
  }).from(afipConfigsTable);

  if (configs.length === 0) return;

  let renovados = 0;
  let vigentes  = 0;
  let errores   = 0;
  let saltados  = 0;

  for (const cfg of configs) {
    if (!cfg.hasCert || !cfg.cuit) { saltados++; continue; }

    const necesitaRenovar = !cfg.tokenExpiry || cfg.tokenExpiry <= limite;
    if (!necesitaRenovar) { vigentes++; continue; }

    try {
      await refreshToken(cfg.userId);
      const [updated] = await db
        .select({ tokenExpiry: afipConfigsTable.tokenExpiry })
        .from(afipConfigsTable)
        .where(eq(afipConfigsTable.userId, cfg.userId))
        .limit(1);
      logger.info(
        { cuit: cfg.cuit, env: cfg.environment, newExpiry: updated?.tokenExpiry },
        "AFIP token renovado",
      );
      renovados++;
    } catch (err) {
      logger.error({ err, cuit: cfg.cuit, env: cfg.environment }, "AFIP token renewal failed");
      errores++;
    }
  }

  if (renovados > 0 || errores > 0) {
    logger.info(
      { renovados, vigentes, errores, saltados },
      "AFIP token scheduler — ciclo completado",
    );
  }
}

export function startAfipTokenScheduler(): void {
  const intervalH = INTERVAL_MS / 3_600_000;
  const umbralH   = UMBRAL_MS   / 3_600_000;
  logger.info(
    { intervalHoras: intervalH, umbralHoras: umbralH },
    "AFIP token scheduler iniciado",
  );

  renewExpiringTokens().catch((err) => {
    logger.error({ err }, "AFIP token scheduler — error en arranque inicial");
  });

  setInterval(() => {
    renewExpiringTokens().catch((err) => {
      logger.error({ err }, "AFIP token scheduler — error en ciclo periódico");
    });
  }, INTERVAL_MS);
}
