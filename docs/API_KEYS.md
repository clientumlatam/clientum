# Clientum — API Keys & Variables de Entorno
> Generado: 19 de Junio de 2026  
> ⚠️ **NUNCA commitear valores reales.** Este archivo documenta qué keys se necesitan y dónde obtenerlas. Los valores van en `.env` (local) o en **Replit Secrets** (producción).

---

## Resumen rápido

| Variable | Requerida | Servicio | Plan |
|---|---|---|---|
| `DATABASE_URL` | ✅ Siempre | PostgreSQL | — |
| `OPENROUTER_API_KEY` | ✅ Para chatbot | OpenRouter | Gratis en openrouter.ai |
| `MP_ACCESS_TOKEN` | ✅ Para pagos | MercadoPago | Cuenta MP developers |
| `MP_WEBHOOK_SECRET` | ✅ En producción | MercadoPago | Generar localmente |
| `GROQ_API_KEY` | ⚡ Para audio | Groq Whisper | Gratis en console.groq.com |
| `RESEND_API_KEY` | ⚡ Para emails | Resend | Gratis hasta 3.000 mails/mes |
| `GOOGLE_CLIENT_ID` | ⚡ Para OAuth Google | Google Cloud | Gratis |
| `GOOGLE_CLIENT_SECRET` | ⚡ Para OAuth Google | Google Cloud | Gratis |
| `GOOGLE_MAPS_API_KEY` | ⚡ Para Prospector | Google Maps | Pago por uso |
| `MCP_API_KEY` | ⚡ Para MCP server | Interno | Generar localmente |
| `OPENROUTER_API_KEY_CLIENTUM` | Opcional | OpenRouter | Key premium Clientum |
| `OPENAI_API_KEY` | Opcional | OpenAI | Pago |
| `REPL_ID` | ✅ En Replit | Replit OIDC | Automático en Replit |
| `ISSUER_URL` | Automático | Replit OIDC | Default: `https://replit.com/oidc` |
| `SESSION_SECRET` | ✅ En Ubuntu | Sesiones | Generar localmente |
| `SMTP_HOST/USER/PASS/PORT` | Alternativa a Resend | Email propio | Gmail, Brevo, etc. |
| `LOG_LEVEL` | Opcional | Logging Pino | Default: `info` |
| `NODE_ENV` | ✅ Siempre | Runtime | `development` / `production` |

---

## 1. Base de Datos

### `DATABASE_URL`
- **Dónde**: `packages/db/src/index.ts` — conexión principal Drizzle ORM
- **Formato**: `postgresql://usuario:password@host:5432/nombre_db`
- **Replit**: provisionada automáticamente al crear la DB integrada de Replit
- **Ubuntu local**: `postgresql://clientum:PASSWORD@localhost:5432/clientum`
- **Generar password**: `openssl rand -hex 16`
- **Requerida**: ✅ El servidor no arranca sin ella

---

## 2. Sesión (solo Ubuntu / producción fuera de Replit)

### `SESSION_SECRET`
- **Dónde**: `apps/api/src/lib/auth.ts` — firma de cookies de sesión
- **Formato**: string hexadecimal de 32+ bytes
- **Generar**: `openssl rand -hex 32`
- **Replit**: no es necesaria (Replit maneja las sesiones internamente)
- **Requerida**: ✅ En Ubuntu/producción

---

## 3. IA / LLM

### `OPENROUTER_API_KEY`
- **Dónde**: `apps/api/src/lib/openrouter.ts`, `apps/api/src/routes/chatbot.ts`
- **Uso**: key de fallback del servidor cuando el usuario no configuró la suya propia en el dashboard
- **Obtener**: [https://openrouter.ai/keys](https://openrouter.ai/keys)
- **Formato**: `sk-or-v1-...`
- **Tier gratuito**: sí — modelos `meta-llama/llama-3.3-70b:free` y similares disponibles sin costo
- **Requerida**: ✅ Para que el chatbot funcione en el servidor

### `OPENROUTER_API_KEY_CLIENTUM`
- **Dónde**: `apps/api/src/routes/chatbot.ts` (línea 42)
- **Uso**: key premium exclusiva para cuentas `@clientum.com.ar` (admins) — anula la key del usuario
- **Formato**: `sk-or-v1-...`
- **Requerida**: ❌ Opcional — solo para Clientum como empresa

### `OPENAI_API_KEY`
- **Dónde**: `apps/api/src/lib/openrouter.ts`, `apps/api/src/lib/audio.ts`
- **Uso**: proveedor LLM alternativo a OpenRouter; también transcripción de audio como fallback de Groq
- **Obtener**: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Formato**: `sk-...`
- **Requerida**: ❌ Opcional (solo si el usuario elige `apiProvider: "openai"` en su config)

> **Nota sobre keys por usuario**: cada tenant puede configurar su propia `openrouterApiKey` u `openaiApiKey` directamente en el dashboard (`/app/agent`). Estas se guardan en la tabla `chatbot_configs` en la DB y tienen prioridad sobre las keys del servidor.

---

## 4. Audio / Transcripción

### `GROQ_API_KEY`
- **Dónde**: `apps/api/src/lib/audio.ts`
- **Uso**: transcripción de notas de voz de WhatsApp con Groq Whisper Large v3
- **Obtener**: [https://console.groq.com/keys](https://console.groq.com/keys)
- **Formato**: `gsk_...`
- **Tier gratuito**: sí — muy generoso (hasta 28.800 segundos de audio/día)
- **Comportamiento sin key**: el bot responde _"escribí tu consulta en texto"_ en vez de transcribir
- **Requerida**: ❌ Opcional (pero muy recomendada)

> **Nota**: también se puede configurar por usuario en la tabla `chatbot_configs.groqApiKey`

---

## 5. Autenticación

### `REPL_ID`
- **Dónde**: `apps/api/src/lib/auth.ts`
- **Uso**: identificador del Repl para el flujo OIDC de Replit (`/api/login` → `/api/callback`)
- **Replit**: provisionado automáticamente como variable de entorno del sistema
- **Ubuntu local**: setear `REPL_ID=local-dev` para deshabilitar OIDC y usar Google OAuth o dev-login
- **Requerida**: ✅ En Replit (automático) | `local-dev` en Ubuntu

### `ISSUER_URL`
- **Dónde**: `apps/api/src/lib/auth.ts`
- **Uso**: URL del proveedor OIDC de Replit
- **Default**: `https://replit.com/oidc`
- **Requerida**: ❌ Solo si se usa un OIDC diferente a Replit

### `GOOGLE_CLIENT_ID`
- **Dónde**: `apps/api/src/routes/auth.ts`
- **Uso**: OAuth 2.0 con Google — flujo `/api/auth/google` → `/api/auth/google/callback`
- **Obtener**: [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
- **URI de redireccionamiento**: `https://TU_DOMINIO/api/auth/google/callback`
- **Requerida**: ❌ Opcional — el botón de "Continuar con Google" solo aparece si está configurada

### `GOOGLE_CLIENT_SECRET`
- **Dónde**: `apps/api/src/routes/auth.ts`
- **Uso**: secreto del cliente OAuth Google (par con `GOOGLE_CLIENT_ID`)
- **Obtener**: mismo panel que `GOOGLE_CLIENT_ID`
- **Requerida**: ❌ Opcional (junto con `GOOGLE_CLIENT_ID`)

---

## 6. Email Transaccional

> El sistema intenta primero Resend, luego SMTP. Si ninguno está configurado, los emails se loguean como warning y no se envían.

### `RESEND_API_KEY`
- **Dónde**: `apps/api/src/lib/email.ts`
- **Uso**: envío de emails de bienvenida, reset de contraseña, notificaciones del sistema
- **Obtener**: [https://resend.com](https://resend.com)
- **Formato**: `re_...`
- **Tier gratuito**: 3.000 emails/mes
- **Requerida**: ❌ Opcional (recomendada)

### `RESEND_FROM`
- **Dónde**: `apps/api/src/lib/email.ts`
- **Uso**: dirección remitente para emails vía Resend
- **Default**: `Clientum <noreply@clientum.com.ar>`
- **Ejemplo**: `Clientum <noreply@clientum.com.ar>`
- **Requerida**: ❌ Tiene default

### `SMTP_HOST`
- **Dónde**: `apps/api/src/lib/email.ts`
- **Uso**: hostname del servidor SMTP propio (alternativa a Resend)
- **Ejemplos**: `smtp.gmail.com`, `smtp.brevo.com`, `smtp.sendgrid.net`
- **Requerida**: ❌ Solo si no usás Resend

### `SMTP_PORT`
- **Default**: `587`
- **Requerida**: ❌ Tiene default

### `SMTP_USER`
- **Uso**: usuario SMTP (generalmente el email)
- **Requerida**: ❌ Solo con SMTP habilitado

### `SMTP_PASS`
- **Uso**: contraseña SMTP o app-password (para Gmail)
- **Requerida**: ❌ Solo con SMTP habilitado

### `SMTP_FROM`
- **Uso**: dirección remitente para emails vía SMTP
- **Default**: valor de `SMTP_USER`
- **Requerida**: ❌ Tiene default

---

## 7. Pagos — MercadoPago

### `MP_ACCESS_TOKEN`
- **Dónde**: `apps/api/src/routes/payments.ts`
- **Uso**: crear preferencias de pago y consultar el estado de pagos
- **Obtener**: [https://www.mercadopago.com.ar/developers/panel/app](https://www.mercadopago.com.ar/developers/panel/app) → Credenciales de producción
- **Formato**: `APP_USR-...` (producción) | `TEST-...` (sandbox)
- **Requerida**: ✅ Para que los planes de suscripción funcionen

### `MP_WEBHOOK_SECRET`
- **Dónde**: `apps/api/src/routes/payments.ts`, `apps/api/src/index.ts`
- **Uso**: verificación HMAC de webhooks IPN de MercadoPago (evita pagos falsos)
- **Generar**: `openssl rand -hex 32`
- **Configurar en MP**: panel de developers → Notificaciones → firmar con el secret
- **Sin esta key en producción**: el servidor arranca pero rechaza todos los webhooks de MP
- **Requerida**: ✅ En producción (⚠️ arroja error si no está en `NODE_ENV=production`)

---

## 8. Búsqueda de Leads — Google Maps

### `GOOGLE_MAPS_API_KEY`
- **Dónde**: `apps/api/src/routes/prospector.ts` (línea 444)
- **Uso**: búsqueda de negocios en Google Maps / Places API para el módulo Prospector
- **Obtener**: [https://console.cloud.google.com/apis/library/places-backend.googleapis.com](https://console.cloud.google.com/apis/library/places-backend.googleapis.com)
- **APIs a activar**: Places API, Maps JavaScript API
- **Tier gratuito**: $200 USD/mes de crédito gratuito en Google Cloud
- **Requerida**: ❌ Sin ella el Prospector usa OpenStreetMap como fallback
- **Prioridad**: el sistema usa primero la key del usuario (`chatbot_configs.googleMapsApiKey`) → luego esta variable de entorno

> **Nota**: también se puede configurar por usuario en el dashboard → Configuración del Agente

---

## 9. MCP Server

### `MCP_API_KEY`
- **Dónde**: `apps/api/src/routes/mcp.ts` (línea 29)
- **Uso**: autenticación Bearer para el servidor MCP en `/mcp` — permite a modelos de IA externos acceder a datos de Clientum
- **Formato**: cualquier string seguro
- **Generar**: `openssl rand -hex 32`
- **Requerida**: ❌ Sin ella el endpoint MCP es accesible sin autenticación (solo en dev)

---

## 10. Logging

### `LOG_LEVEL`
- **Dónde**: `apps/api/src/lib/logger.ts`
- **Uso**: nivel de verbosidad del logger Pino
- **Valores**: `trace` | `debug` | `info` | `warn` | `error` | `fatal`
- **Default**: `info`
- **Requerida**: ❌ Tiene default

---

## 11. Puertos y Entorno

### `NODE_ENV`
- **Valores**: `development` | `production`
- **Efecto en producción**: habilita HSTS, fuerza MP_WEBHOOK_SECRET, deshabilita `/api/auth/dev-login`
- **Default**: `development`

### `PORT` / `API_PORT`
- **Default**: `8080`
- **Uso**: puerto en el que escucha el servidor Express

### `VITE_PORT`
- **Default**: `21496`
- **Uso**: puerto del servidor de desarrollo Vite

### `PROXY_PORT`
- **Default**: `5000`
- **Uso**: puerto del proxy de entrada (`proxy.mjs`)

### `REPLIT_DEV_DOMAIN`
- **Dónde**: URLs públicas en varios módulos
- **Uso**: dominio público del Repl (en Replit se provee automáticamente; en Ubuntu es el dominio propio)
- **Replit**: automático
- **Ubuntu**: `clientum.com.ar` (o el dominio del Cloudflare Tunnel)

### `BASE_PATH`
- **Default**: `/`
- **Uso**: base URL para el frontend Vite

---

## 12. Keys por Usuario (almacenadas en DB)

Estas keys **no son variables de entorno** — se guardan por tenant en la tabla `chatbot_configs` de PostgreSQL y se configuran desde el dashboard en `/app/agent` o `/app/integrations`:

| Campo DB | Dashboard | Uso |
|---|---|---|
| `evolutionApiUrl` | Conectar WhatsApp | URL de la instancia Evolution API |
| `evolutionApiKey` | Conectar WhatsApp | API key de autenticación de Evolution API |
| `evolutionInstance` | Conectar WhatsApp | Nombre de la instancia WhatsApp |
| `openrouterApiKey` | Configurar Agente | Key personal OpenRouter del tenant |
| `openaiApiKey` | Configurar Agente | Key personal OpenAI del tenant |
| `groqApiKey` | Configurar Agente | Key personal Groq del tenant |
| `googleMapsApiKey` | Configurar Agente | Key personal Google Maps del tenant |

---

## 13. Evolution API (servicio separado)

Evolution API es un servicio independiente que corre en su propio proceso (puerto `:3000` por defecto). Sus variables de entorno van en un archivo separado (`evolution.env`):

| Variable | Uso |
|---|---|
| `DATABASE_CONNECTION_URI` | DB propia de Evolution API |
| `AUTHENTICATION_API_KEY` | Key de autenticación entre Clientum ↔ Evolution |
| `WEBHOOK_GLOBAL_URL` | `https://TU_DOMINIO/api/chatbot/webhook` |
| `SERVER_PORT` | Puerto de Evolution API (default: `3000`) |

> La `AUTHENTICATION_API_KEY` de Evolution es la misma que se configura como `evolutionApiKey` en el dashboard de cada tenant.

---

## 14. Configuración para Replit (Secrets)

En Replit, todas las variables sensibles se cargan desde **Secrets** (no desde `.env`):

```
Replit → Tu proyecto → Tools → Secrets
```

Variables mínimas para funcionar en Replit:

```
DATABASE_URL          ← automático si usás la DB de Replit
OPENROUTER_API_KEY    ← para el chatbot
MP_ACCESS_TOKEN       ← para pagos
MP_WEBHOOK_SECRET     ← para producción
```

Variables opcionales recomendadas:

```
GROQ_API_KEY
RESEND_API_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_MAPS_API_KEY
MCP_API_KEY
```

---

## 15. Configuración para Ubuntu (archivo .env)

Copiar `scripts/ubuntu-local.env.example` a `.env` en la raíz del proyecto y completar:

```bash
cp scripts/ubuntu-local.env.example .env
```

Luego editar `.env` con los valores reales. El campo `REPL_ID=local-dev` deshabilita el OIDC de Replit y permite usar Google OAuth o el dev-login local.

---

## 16. Checklist de Seguridad

- [ ] **Nunca** commitear el archivo `.env` con valores reales (está en `.gitignore`)
- [ ] `MP_WEBHOOK_SECRET` configurado antes de ir a producción
- [ ] `SESSION_SECRET` único por entorno (dev ≠ prod)
- [ ] `NODE_ENV=production` en producción (activa validaciones extra)
- [ ] Keys de OpenRouter/OpenAI rotadas si se expusieron
- [ ] `MCP_API_KEY` configurado si el endpoint `/mcp` es público
- [ ] Certificados AFIP renovados antes de vencer (monitorear en `/app/admin` → AFIP)

---

*Documento generado analizando el código fuente de Clientum — apps/api, apps/web, packages/db, apps/mcp y scripts.*
