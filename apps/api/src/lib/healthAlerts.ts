import { db, chatbotConfigsTable, healthAlertLogsTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import crypto from "crypto";
import { sendWhatsAppReply } from "./openrouter";
import { logger } from "./logger";

const ADMIN_USER_ID = "admin_clientum";
const MIN_ALERT_INTERVAL_MS = 15 * 60 * 1000;
const CHECK_INTERVAL_MS = 3 * 60 * 1000;

export interface HealthAlertConfig {
  enabled: boolean;
  phone: string;
}

export interface HealthAlertStatus {
  enabled: boolean;
  phone: string;
  dbStatus: "ok" | "error" | null;
  consecutiveErrors: number;
  lastAlertAt: number | null;
  lastCheckAt: number | null;
}

const cfg: HealthAlertConfig = {
  enabled: false,
  phone: "5492984510883",
};

const state = {
  dbStatus:          null as "ok" | "error" | null,
  consecutiveErrors: 0,
  lastAlertAt:       0,
  lastCheckAt:       0,
};

export function getHealthAlertStatus(): HealthAlertStatus {
  return {
    enabled:           cfg.enabled,
    phone:             cfg.phone,
    dbStatus:          state.dbStatus,
    consecutiveErrors: state.consecutiveErrors,
    lastAlertAt:       state.lastAlertAt || null,
    lastCheckAt:       state.lastCheckAt || null,
  };
}

export function updateHealthAlertConfig(patch: Partial<HealthAlertConfig>) {
  if (patch.enabled !== undefined) cfg.enabled = patch.enabled;
  if (patch.phone   !== undefined) cfg.phone   = patch.phone.replace(/\D/g, "");
}

async function probeDb(): Promise<"ok" | "error"> {
  try {
    await db.execute(sql`SELECT 1`);
    return "ok";
  } catch {
    return "error";
  }
}

async function getEvoCfg() {
  try {
    const [row] = await db.select().from(chatbotConfigsTable)
      .where(eq(chatbotConfigsTable.userId, ADMIN_USER_ID)).limit(1);
    if (row?.evolutionApiUrl && row.evolutionApiKey && row.evolutionInstance) return row;
  } catch { /* ignore */ }
  return null;
}

async function persistLog(type: string, status: string, message: string, sent: boolean, error?: string) {
  try {
    await db.insert(healthAlertLogsTable).values({
      id:      crypto.randomUUID(),
      type,
      status,
      message,
      phone:   cfg.phone,
      sent,
      error:   error ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Health alert: error persistiendo log");
  }
}

async function sendAlert(type: string, text: string) {
  const evo = await getEvoCfg();
  if (!evo) {
    logger.warn("Health alert: Evolution API del admin no configurada — alerta no enviada");
    await persistLog(type, "no_evo_config", text, false, "Evolution API no configurada");
    return;
  }
  try {
    await sendWhatsAppReply({
      evolutionApiUrl: evo.evolutionApiUrl,
      evolutionApiKey: evo.evolutionApiKey,
      instance:        evo.evolutionInstance,
      to:              cfg.phone,
      text,
    });
    state.lastAlertAt = Date.now();
    logger.info({ to: cfg.phone }, "Health alert: mensaje enviado");
    await persistLog(type, "sent", text, true);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "Health alert: error enviando mensaje");
    await persistLog(type, "send_error", text, false, errMsg);
  }
}

export async function getAlertLogs(limit = 50) {
  return db
    .select()
    .from(healthAlertLogsTable)
    .orderBy(desc(healthAlertLogsTable.createdAt))
    .limit(limit);
}

function arDate() {
  return new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
}

export async function runHealthCheck(): Promise<"ok" | "error"> {
  const prev   = state.dbStatus;
  const status = await probeDb();
  state.dbStatus   = status;
  state.lastCheckAt = Date.now();

  const cooldown = (Date.now() - state.lastAlertAt) >= MIN_ALERT_INTERVAL_MS;

  if (status === "error") {
    state.consecutiveErrors++;
    if (prev !== "error" || (cooldown && state.consecutiveErrors >= 3)) {
      await sendAlert(
        "db_error",
        `🔴 *Clientum — Alerta de servicio*\n\n` +
        `❌ La base de datos no responde (${state.consecutiveErrors} fallo${state.consecutiveErrors > 1 ? "s" : ""} consecutivo${state.consecutiveErrors > 1 ? "s" : ""}).\n` +
        `📅 ${arDate()}\n\n` +
        `Verificá el estado con:\n\`bash scripts-ubuntu-v10/monitoreo/status.sh\``,
      );
    }
  } else {
    if (prev === "error") {
      await sendAlert(
        "db_recovered",
        `✅ *Clientum — Servicio recuperado*\n\n` +
        `La base de datos volvió a estar disponible.\n` +
        `📅 ${arDate()}`,
      );
    }
    state.consecutiveErrors = 0;
  }

  return status;
}

export async function sendTestAlert(): Promise<void> {
  await sendAlert(
    "test",
    `🔔 *Clientum — Alerta de prueba*\n\n` +
    `Las alertas de health check están funcionando correctamente.\n` +
    `📅 ${arDate()}`,
  );
}

export function startHealthAlertScheduler(): void {
  logger.info({ enabled: cfg.enabled, intervalMs: CHECK_INTERVAL_MS }, "Health alert scheduler iniciado");
  setInterval(async () => {
    if (!cfg.enabled) return;
    try { await runHealthCheck(); }
    catch (err) { logger.error({ err }, "Health alert scheduler — error en ciclo"); }
  }, CHECK_INTERVAL_MS);
}
