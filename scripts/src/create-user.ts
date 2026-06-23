/**
 * Clientum — CLI para crear/listar/eliminar usuarios desde la terminal.
 *
 * Uso:
 *   pnpm --filter @workspace/scripts run create:user
 *   pnpm --filter @workspace/scripts run create:user --email ana@ejemplo.com --plan pro
 *   pnpm --filter @workspace/scripts run create:user --list
 *   pnpm --filter @workspace/scripts run create:user --delete ana@ejemplo.com
 *   pnpm --filter @workspace/scripts run create:user --info ana@ejemplo.com
 *   pnpm --filter @workspace/scripts run create:user --set-plan ana@ejemplo.com enterprise
 *
 * Flags:
 *   --email       Email del usuario (requerido para crear)
 *   --plan        Plan: free | starter | pro | business | enterprise (default: free)
 *   --first-name  Nombre (opcional)
 *   --last-name   Apellido (opcional)
 *   --status      Estado de suscripción: active | trialing | expired (default: active)
 *   --list        Listar todos los usuarios con su plan
 *   --delete      Eliminar usuario por email
 *   --info        Ver detalle completo de un usuario
 *   --set-plan    Cambiar el plan de un usuario existente
 */

import { db, usersTable, subscriptionsTable, chatbotConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import * as readline from "readline";

// ── Planes válidos ────────────────────────────────────────────────────────────
const PLANES_VALIDOS = ["free", "starter", "pro", "business", "enterprise"] as const;
type Plan = typeof PLANES_VALIDOS[number];

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free (gratis)",
  starter: "Starter ($149.000 ARS/mes)",
  pro: "Pro ($299.000 ARS/mes)",
  business: "Business ($549.000 ARS/mes)",
  enterprise: "Enterprise (a consultar)",
};

// ── Colores ───────────────────────────────────────────────────────────────────
const G = "\x1b[32m"; // green
const Y = "\x1b[33m"; // yellow
const R = "\x1b[31m"; // red
const C = "\x1b[36m"; // cyan
const B = "\x1b[1m";  // bold
const N = "\x1b[0m";  // reset

const ok   = (msg: string) => console.log(`${G}  ✅ ${msg}${N}`);
const warn = (msg: string) => console.log(`${Y}  ⚠️  ${msg}${N}`);
const err  = (msg: string) => console.log(`${R}  ❌ ${msg}${N}`);
const info = (msg: string) => console.log(`  ${msg}`);

// ── Parseo de argumentos ──────────────────────────────────────────────────────
function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = "true";
      }
    } else if (Object.keys(args).length > 0) {
      // argumento posicional después de una flag
      const lastKey = Object.keys(args).at(-1)!;
      if (args[lastKey] === "true") args[lastKey] = arg;
    }
  }
  return args;
}

// ── Prompt interactivo ───────────────────────────────────────────────────────
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ── Helpers de DB ─────────────────────────────────────────────────────────────
async function getUserByEmail(email: string) {
  const users = await db.select().from(usersTable).where(eq(usersTable.email, email));
  return users[0] ?? null;
}

async function getSubscription(userId: string) {
  const subs = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  return subs[0] ?? null;
}

async function getChatbotConfig(userId: string) {
  const cfgs = await db.select().from(chatbotConfigsTable).where(eq(chatbotConfigsTable.userId, userId));
  return cfgs[0] ?? null;
}

// ── Crear usuario ─────────────────────────────────────────────────────────────
async function createUser(opts: {
  email: string;
  plan: Plan;
  firstName?: string;
  lastName?: string;
  status?: string;
}) {
  const { email, plan, firstName, lastName, status = "active" } = opts;

  // Verificar si ya existe
  const existing = await getUserByEmail(email);
  if (existing) {
    err(`Ya existe un usuario con el email: ${email}`);
    info(`  ID: ${existing.id}`);
    const sub = await getSubscription(existing.id);
    if (sub) info(`  Plan actual: ${sub.plan} (${sub.status})`);
    info("");
    info(`Para cambiar el plan: pnpm --filter @workspace/scripts run create:user --set-plan ${email} ${plan}`);
    return;
  }

  const userId = randomUUID();
  const subId = `sub_${userId.slice(0, 8)}`;
  const widgetToken = randomUUID().replace(/-/g, "").slice(0, 32);

  // Calcular currentPeriodEnd según el plan
  let currentPeriodEnd: Date | undefined;
  if (plan !== "free" && status === "active") {
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    currentPeriodEnd = end;
  }

  console.log("");
  console.log(`${B}  Creando usuario...${N}`);

  // 1. Usuario
  await db.insert(usersTable).values({
    id: userId,
    email,
    firstName: firstName ?? email.split("@")[0],
    lastName: lastName ?? "",
  });
  ok(`Usuario creado: ${email} (id: ${userId.slice(0, 8)}...)`);

  // 2. Suscripción
  await db.insert(subscriptionsTable).values({
    id: subId,
    userId,
    plan,
    status,
    currentPeriodEnd: currentPeriodEnd ?? null,
  });
  ok(`Suscripción: ${PLAN_LABELS[plan]} (${status})`);

  // 3. Chatbot config con widget token
  const cfgId = `cfg_${userId.slice(0, 8)}`;
  await db.insert(chatbotConfigsTable).values({
    id: cfgId,
    userId,
    widgetToken,
    active: true,
    widgetName: "Asistente Virtual",
    widgetColor: "#1A3A80",
    widgetWelcome: "¡Hola! 👋 ¿En qué te puedo ayudar?",
    systemPrompt: "Sos un asistente virtual amigable. Respondé siempre en español argentino.",
    agentMode: "support",
    apiProvider: "openrouter",
    openrouterModel: "meta-llama/llama-3.3-70b-instruct:free",
    maxHistory: 20,
    evolutionApiUrl: "",
    evolutionApiKey: "",
    evolutionInstance: "",
    openaiApiKey: "",
    openrouterApiKey: "",
  });
  ok(`Chatbot config creado (widget token generado)`);

  // Mostrar resumen
  console.log("");
  console.log(`${B}  ════ Usuario creado exitosamente ════${N}`);
  console.log("");
  console.log(`  ${C}Email:${N}        ${email}`);
  console.log(`  ${C}ID:${N}           ${userId}`);
  console.log(`  ${C}Nombre:${N}       ${firstName ?? email.split("@")[0]} ${lastName ?? ""}`);
  console.log(`  ${C}Plan:${N}         ${PLAN_LABELS[plan]}`);
  console.log(`  ${C}Estado:${N}       ${status}`);
  if (currentPeriodEnd) {
    console.log(`  ${C}Vence:${N}        ${currentPeriodEnd.toLocaleDateString("es-AR")}`);
  }
  console.log("");
  console.log(`  ${C}Widget token:${N} ${widgetToken}`);
  console.log(`  ${C}Widget embed:${N} <script src="/api/widget/${widgetToken}/widget.js" defer></script>`);
  console.log("");
  console.log(`  ${Y}El usuario puede hacer login con Google OAuth usando: ${email}${N}`);
  console.log(`  ${Y}O con dev-login (solo NODE_ENV=development): GET /api/auth/dev-login${N}`);
  console.log("");
}

// ── Listar usuarios ───────────────────────────────────────────────────────────
async function listUsers() {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  const subs = await db.select().from(subscriptionsTable);
  const subMap = new Map(subs.map((s) => [s.userId, s]));

  console.log("");
  console.log(`${B}  ════ Usuarios registrados (${users.length}) ════${N}`);
  console.log("");
  console.log(`  ${"ID".padEnd(12)} ${"Email".padEnd(35)} ${"Plan".padEnd(12)} ${"Estado".padEnd(10)} Creado`);
  console.log(`  ${"─".repeat(90)}`);

  for (const u of users) {
    const sub = subMap.get(u.id);
    const plan = (sub?.plan ?? "—").padEnd(12);
    const status = (sub?.status ?? "—").padEnd(10);
    const created = u.createdAt?.toLocaleDateString("es-AR") ?? "—";
    const id = (u.id ?? "").slice(0, 10).padEnd(12);
    const email = (u.email ?? "—").padEnd(35);

    const planColor = sub?.plan === "enterprise" ? G :
                      sub?.plan === "business"   ? C :
                      sub?.plan === "pro"        ? C :
                      sub?.plan === "starter"    ? Y : N;

    console.log(`  ${id} ${email} ${planColor}${plan}${N} ${status} ${created}`);
  }
  console.log("");
}

// ── Info de un usuario ────────────────────────────────────────────────────────
async function showUserInfo(email: string) {
  const user = await getUserByEmail(email);
  if (!user) {
    err(`No existe ningún usuario con el email: ${email}`);
    return;
  }
  const sub = await getSubscription(user.id);
  const cfg = await getChatbotConfig(user.id);

  console.log("");
  console.log(`${B}  ════ Info del usuario ════${N}`);
  console.log("");
  console.log(`  ${C}ID:${N}            ${user.id}`);
  console.log(`  ${C}Email:${N}         ${user.email ?? "—"}`);
  console.log(`  ${C}Nombre:${N}        ${user.firstName ?? ""} ${user.lastName ?? ""}`);
  console.log(`  ${C}Creado:${N}        ${user.createdAt?.toLocaleString("es-AR") ?? "—"}`);
  console.log(`  ${C}Actualizado:${N}   ${user.updatedAt?.toLocaleString("es-AR") ?? "—"}`);
  console.log("");
  if (sub) {
    console.log(`  ${C}Plan:${N}          ${PLAN_LABELS[sub.plan as Plan] ?? sub.plan}`);
    console.log(`  ${C}Estado:${N}        ${sub.status}`);
    console.log(`  ${C}Vence:${N}         ${sub.currentPeriodEnd?.toLocaleDateString("es-AR") ?? "—"}`);
  } else {
    warn("Sin suscripción registrada");
  }
  console.log("");
  if (cfg) {
    console.log(`  ${C}Widget token:${N}  ${cfg.widgetToken ?? "—"}`);
    console.log(`  ${C}Bot activo:${N}    ${cfg.active ? "sí" : "no"}`);
    console.log(`  ${C}Instancia WA:${N}  ${cfg.evolutionInstance || "—"}`);
  } else {
    warn("Sin configuración de chatbot");
  }
  console.log("");
}

// ── Cambiar plan ──────────────────────────────────────────────────────────────
async function setPlan(email: string, plan: Plan) {
  const user = await getUserByEmail(email);
  if (!user) {
    err(`No existe ningún usuario con el email: ${email}`);
    return;
  }

  const sub = await getSubscription(user.id);
  const planAnterior = sub?.plan ?? "—";

  let currentPeriodEnd: Date | undefined;
  if (plan !== "free") {
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    currentPeriodEnd = end;
  }

  if (sub) {
    await db
      .update(subscriptionsTable)
      .set({
        plan,
        status: "active",
        currentPeriodEnd: currentPeriodEnd ?? null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionsTable.userId, user.id));
  } else {
    await db.insert(subscriptionsTable).values({
      id: `sub_${user.id.slice(0, 8)}`,
      userId: user.id,
      plan,
      status: "active",
      currentPeriodEnd: currentPeriodEnd ?? null,
    });
  }

  console.log("");
  ok(`Plan actualizado: ${planAnterior} → ${plan}`);
  info(`  Usuario: ${email}`);
  if (currentPeriodEnd) info(`  Nuevo vencimiento: ${currentPeriodEnd.toLocaleDateString("es-AR")}`);
  console.log("");
}

// ── Eliminar usuario ──────────────────────────────────────────────────────────
async function deleteUser(email: string) {
  const user = await getUserByEmail(email);
  if (!user) {
    err(`No existe ningún usuario con el email: ${email}`);
    return;
  }

  // Confirmación
  const confirmacion = await prompt(`\n  ${R}¿Confirmar eliminación de ${email}? (escribí "ELIMINAR" para confirmar): ${N}`);
  if (confirmacion !== "ELIMINAR") {
    warn("Operación cancelada.");
    return;
  }

  // Eliminar en cascada (chatbot_config, subscription, luego user)
  await db.delete(chatbotConfigsTable).where(eq(chatbotConfigsTable.userId, user.id));
  await db.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, user.id));
  await db.delete(usersTable).where(eq(usersTable.id, user.id));

  ok(`Usuario eliminado: ${email} (id: ${user.id})`);
  warn("Datos borrados: usuario, suscripción y configuración de chatbot.");
  warn("Las conversaciones y mensajes se eliminan por cascade en DB.");
  console.log("");
}

// ── Modo interactivo ──────────────────────────────────────────────────────────
async function modoInteractivo() {
  console.log("");
  console.log(`${B}  Clientum — Crear usuario${N}`);
  console.log("");

  const email = await prompt("  Email del nuevo usuario: ");
  if (!email || !email.includes("@")) {
    err("Email inválido.");
    return;
  }

  console.log("");
  console.log("  Planes disponibles:");
  PLANES_VALIDOS.forEach((p, i) => console.log(`    ${i + 1}. ${p.padEnd(10)} — ${PLAN_LABELS[p]}`));
  console.log("");
  const planInput = await prompt("  Plan (nombre o número, default: free): ");
  let plan: Plan = "free";
  const idx = parseInt(planInput) - 1;
  if (!isNaN(idx) && PLANES_VALIDOS[idx]) {
    plan = PLANES_VALIDOS[idx];
  } else if (PLANES_VALIDOS.includes(planInput.toLowerCase() as Plan)) {
    plan = planInput.toLowerCase() as Plan;
  }

  const firstName = await prompt("  Nombre (Enter para omitir): ");
  const lastName  = await prompt("  Apellido (Enter para omitir): ");

  await createUser({
    email,
    plan,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
  });
}

// ── Ayuda ─────────────────────────────────────────────────────────────────────
function showHelp() {
  console.log(`
${B}  Clientum — create-user${N}

  ${C}Crear usuario:${N}
    pnpm --filter @workspace/scripts run create:user
    pnpm --filter @workspace/scripts run create:user --email usuario@ejemplo.com --plan pro
    pnpm --filter @workspace/scripts run create:user --email u@e.com --plan enterprise --first-name Ana --last-name García

  ${C}Listar usuarios:${N}
    pnpm --filter @workspace/scripts run create:user --list

  ${C}Ver detalle de un usuario:${N}
    pnpm --filter @workspace/scripts run create:user --info usuario@ejemplo.com

  ${C}Cambiar plan:${N}
    pnpm --filter @workspace/scripts run create:user --set-plan usuario@ejemplo.com pro

  ${C}Eliminar usuario:${N}
    pnpm --filter @workspace/scripts run create:user --delete usuario@ejemplo.com

  ${C}Planes válidos:${N}
    free | starter | pro | business | enterprise
`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs();

  if (args["help"] || args["h"]) {
    showHelp();
    return;
  }

  if (args["list"]) {
    await listUsers();
    return;
  }

  if (args["info"]) {
    const email = args["info"] === "true" ? args["email"] : args["info"];
    if (!email) { err("Especificá un email: --info usuario@ejemplo.com"); return; }
    await showUserInfo(email);
    return;
  }

  if (args["delete"]) {
    const email = args["delete"] === "true" ? args["email"] : args["delete"];
    if (!email) { err("Especificá un email: --delete usuario@ejemplo.com"); return; }
    await deleteUser(email);
    return;
  }

  if (args["set-plan"]) {
    const email = args["set-plan"] === "true" ? args["email"] : args["set-plan"];
    if (!email) { err("Especificá un email: --set-plan usuario@ejemplo.com pro"); return; }
    const planArg = (args["plan"] ?? Object.values(args).find(v => PLANES_VALIDOS.includes(v as Plan)) ?? "free") as Plan;
    if (!PLANES_VALIDOS.includes(planArg)) {
      err(`Plan inválido: ${planArg}. Válidos: ${PLANES_VALIDOS.join(", ")}`);
      return;
    }
    await setPlan(email, planArg);
    return;
  }

  // Crear usuario: con flags o modo interactivo
  if (args["email"]) {
    const plan = (args["plan"] ?? "free") as Plan;
    if (!PLANES_VALIDOS.includes(plan)) {
      err(`Plan inválido: ${plan}. Válidos: ${PLANES_VALIDOS.join(", ")}`);
      return;
    }
    await createUser({
      email: args["email"],
      plan,
      firstName: args["first-name"],
      lastName: args["last-name"],
      status: args["status"] ?? "active",
    });
  } else {
    await modoInteractivo();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    err(`Error inesperado: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
