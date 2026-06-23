import { db, usersTable, subscriptionsTable, chatbotConfigsTable } from "@workspace/db";

export const ADMIN_USER_ID = "admin_clientum";
export const ADMIN_EMAIL = "info@clientum.com.ar";
export const ADMIN_WIDGET_TOKEN = "clientumadminwidgettoken00000001";

async function seed() {
  console.log("🌱 Seeding admin user...");

  await db
    .insert(usersTable)
    .values({
      id: ADMIN_USER_ID,
      email: ADMIN_EMAIL,
      firstName: "Clientum",
      lastName: "Admin",
    })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        email: ADMIN_EMAIL,
        firstName: "Clientum",
        lastName: "Admin",
        updatedAt: new Date(),
      },
    });

  console.log(`   ✅ User: ${ADMIN_EMAIL} (id: ${ADMIN_USER_ID})`);

  await db
    .insert(subscriptionsTable)
    .values({
      id: "sub_admin_clientum",
      userId: ADMIN_USER_ID,
      plan: "enterprise",
      status: "active",
    })
    .onConflictDoUpdate({
      target: subscriptionsTable.id,
      set: { plan: "enterprise", status: "active", updatedAt: new Date() },
    });

  console.log("   ✅ Subscription: Enterprise (active)");

  await db
    .insert(chatbotConfigsTable)
    .values({
      id: "cfg_admin_clientum",
      userId: ADMIN_USER_ID,
      widgetToken: ADMIN_WIDGET_TOKEN,
      active: true,
      widgetName: "Asistente Clientum",
      widgetColor: "#1A3A80",
      widgetWelcome:
        "¡Hola! 👋 Soy el asistente de Clientum. ¿En qué te puedo ayudar?",
      systemPrompt:
        "Sos el asistente de ventas de Clientum, una plataforma de IA y automatización para PyMEs argentinas. Respondé consultas sobre los planes (Free gratis, Starter $180.000 ARS/mes, Pro $350.000 ARS/mes, Enterprise a consultar), explicá los beneficios: chatbot de IA, CRM, widget web, broadcast por WhatsApp. Guiá al visitante hacia una prueba gratuita o a consultar por WhatsApp: +54 9 298 451-0883. Respondé siempre en español argentino, de forma amigable y concisa.",
      agentMode: "sales",
      apiProvider: "openrouter",
      openrouterModel: "meta-llama/llama-3.3-70b:free",
      maxHistory: 20,
      evolutionApiUrl: "",
      evolutionApiKey: "",
      evolutionInstance: "",
      openaiApiKey: "",
      openrouterApiKey: "",
    })
    .onConflictDoUpdate({
      target: chatbotConfigsTable.id,
      set: {
        widgetToken: ADMIN_WIDGET_TOKEN,
        active: true,
        widgetName: "Asistente Clientum",
        widgetColor: "#1A3A80",
        widgetWelcome:
          "¡Hola! 👋 Soy el asistente de Clientum. ¿En qué te puedo ayudar?",
        agentMode: "sales",
        updatedAt: new Date(),
      },
    });

  console.log(`   ✅ Chatbot config: widget token = ${ADMIN_WIDGET_TOKEN}`);
  console.log("");
  console.log("🎉 Seed completo.");
  console.log(`   Widget embed: <script src="/api/widget/${ADMIN_WIDGET_TOKEN}/widget.js" defer></script>`);
  console.log(`   Dev login:    http://localhost:5000/api/auth/dev-login`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed falló:", err);
    process.exit(1);
  });
