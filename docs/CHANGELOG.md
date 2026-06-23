# Changelog — Clientum

Todos los cambios notables del proyecto están documentados en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.0.0/)
y el versionado sigue [Semantic Versioning](https://semver.org/lang/es/).

---

## [Unreleased]

### En desarrollo
- Sistema de métricas por industria (benchmark entre clientes)
- Multi-tenancy con subdominio por cliente
- Reportes automáticos semanales vía WhatsApp / email

---

## [2.5.0] — 2026-06-18

### Agregado
- **MCP Server**: implementación del Model Context Protocol sobre StreamableHTTP + SSE
  - Herramientas expuestas: `list_leads`, `create_lead`, `update_lead_stage`, `list_appointments`, `create_appointment`, `get_crm_summary`, `get_appointments_summary`
  - Autenticación doble: session cookie + Bearer `MCP_API_KEY`
- **Widget embebible**: generación dinámica de `widget.js` por `widgetToken`
  - Sesión persistida en `localStorage`
  - Selección de modelo LLM según plan del usuario
  - Historial configurable (default: 20 mensajes)
- **Guardrails del agente IA**:
  - Prompt Injection Shield (regex multicapa)
  - PII Redaction toggle
  - Hallucination Threshold configurable
  - Banned Words list personalizada
- **Industry Presets** en el configurador del agente: Real Estate, Médico, Fitness, E-commerce

### Modificado
- Chatbot webhook ahora procesa mensajes de forma completamente asíncrona (200 OK inmediato)
- Business hours: soporte de timezone configurable (default: `America/Argentina/Buenos_Aires`)
- RAG mejorado: búsqueda por keywords en `title` y `content` con `ilike`, retorna top 3 resultados

---

## [2.4.0] — 2026-05-20

### Agregado
- **AFIP WSAA/WSFE**: integración completa de facturación electrónica argentina
  - Firma PKCS#7 con `node-forge` (SHA-256, DER base64)
  - Solicitud de CAE con secuenciamiento automático de números
  - Scheduler de renovación de tokens cada 2 horas
  - Renovación lazy al usar (si expira en < 5 minutos)
  - UI de configuración desde el dashboard (`/app/erp`)
  - Listado y estadísticas de comprobantes emitidos
- **`afip_configs` table**: almacena CUIT, certificados PEM, token, sign, tokenExpiry
- **`afip_comprobantes` table**: registro de CAE emitidos con estado y respuesta raw
- **Admin AFIP**: renovación masiva de tokens vía `/admin/afip/renovar-todos`

### Modificado
- Schema `lib/db` extendido con módulo `afip.ts`
- `start.sh` incluye inicialización del `afipTokenScheduler` al arranque

---

## [2.3.0] — 2026-04-15

### Agregado
- **Prospector de leads** con búsqueda en 3 capas:
  - Capa 1: Google Places API oficial (con API key del usuario)
  - Capa 2: Scraper interno de Google Maps (regex sobre `APP_INITIALIZATION_STATE`)
  - Capa 3: Overpass API / OpenStreetMap (fallback con mapeo semántico de queries)
  - Importación directa al CRM como canal `prospector`
- **Broadcast masivo WhatsApp**:
  - Caps por plan: starter 100 / pro 300 / business 500 / enterprise 1000
  - Throttling de 750ms entre mensajes (~80 msg/min)
  - Restricción a planes pagos únicamente
- **Módulo de órdenes de venta**:
  - `orders`, `order_items`, `order_status_history` tables
  - Notificación automática al cliente por WhatsApp en cambio de estado
  - Estadísticas de revenue por período
- **Módulo de agenda** (`appointments`):
  - Creación con recordatorio automático por WhatsApp
  - Estados: pending / confirmed / cancelled / completed
  - `scheduled_messages` table para cola de mensajes programados
- **Reminder scheduler**: `setInterval` cada 60 segundos que procesa `scheduled_messages` pendientes

### Modificado
- `AppShell` sidebar reorganizado en grupos colapsables con persistencia en `localStorage`
- Badges en tiempo real en el sidebar (handoffs activos, pedidos/turnos pendientes)

---

## [2.2.0] — 2026-03-10

### Agregado
- **Human Handoff** en el chatbot:
  - Activación automática por nodo `escalate` en un Flow
  - Activación/desactivación manual vía `PATCH /chatbot/conversations/:id/handoff`
  - Respuesta del operador vía `POST /chatbot/conversations/:id/reply`
  - Cuando `handoffMode=true`, el bot silencia su respuesta y solo guarda el mensaje
- **Flows / Automatizaciones**:
  - Nodos JSONB: `sendMessage` y `escalate`
  - Matching por keywords con `matchType` (contains, exact)
  - Prioridad configurable entre flows
  - Contadores de `triggered_count` y `resolved_count`
- **RAG (Retrieval-Augmented Generation)**:
  - `knowledge_items` table para base de conocimiento por usuario
  - Búsqueda keyword-based sobre `title` + `content`
  - Inyección en `systemPrompt` del LLM
- **Typing indicator** en WhatsApp (3 segundos antes de la respuesta del bot)
- **Transcripción de audio**: mensajes de voz de WA procesados por Groq/Whisper

### Modificado
- Chatbot ahora soporta múltiples tipos de mensaje: texto, imagen, audio, video, documento
- `chatbot_configs` extendido con: `guardrails_json`, `business_hours_json`, `groq_api_key`

---

## [2.1.0] — 2026-02-05

### Agregado
- **Catálogo digital público** por token único:
  - `catalog_configs` table con branding, colores, links sociales
  - Endpoint público: `GET /catalog/public/:token`
  - Generación de copy con IA: `POST /catalog/ai-generate`
  - Upload de imágenes: `POST /catalog/upload-image`
  - Ruta pública en el frontend: `/catalogo/:token`
- **Analytics agregadas**: `GET /analytics` con métricas de conversaciones, mensajes, lead stages, canal, funnel
- **Overview dashboard** (`/app`):
  - KPIs en tiempo real con TanStack Query
  - Onboarding panel para usuarios nuevos
  - Activity feed multi-módulo (CRM + Soporte + Finanzas)
- **Health Alerts**:
  - `health_alert_logs` table
  - Scheduler cada 3 minutos con probe `SELECT 1`
  - Alerta por WhatsApp al admin tras 3 fallos consecutivos
- **Trial Alerts scheduler** (cada 6 horas):
  - Emails para trials que vencen en 48-72 horas
  - Auto-downgrade de suscripciones expiradas a plan `free`

### Modificado
- `AppShell` header con título/subtítulo dinámico según ruta activa
- Sidebar con sección "Recursos" en grilla de 3 columnas al fondo

---

## [2.0.0] — 2026-01-08 — BREAKING CHANGE

### Agregado
- **Monorepo PNPM** con workspaces: `artifacts/*`, `lib/*`, `scripts/`
- **Pipeline de código auto-generado** (OpenAPI → Orval):
  - `lib/api-spec/openapi.yaml` como fuente de verdad
  - `lib/api-zod` → Zod schemas con coerción de tipos
  - `lib/api-client-react` → hooks TanStack Query + `custom-fetch.ts`
- **`proxy.mjs`**: router unificado en puerto 5000 (API 8080, Vite 21496, Mockup 8081)
- **Mockup sandbox** como workspace separado (:8081) para prototipos UI
- **TypeScript project references** con `tsconfig.base.json` en la raíz
- **`lib/replit-auth-web`** como paquete compartido de auth OIDC
- **`scripts/`** workspace con utilities admin (seed-admin, create-user, import-leads)

### Modificado (BREAKING)
- Frontend migrado de CRA a **Vite 7**
- Backend migrado de Express 4 a **Express 5** (req.params ahora es `string | string[]`)
- Tailwind CSS migrado de v3 a **v4** (tokens con `@theme`)
- React migrado de 18 a **React 19**
- Routing migrado de React Router a **Wouter**
- ORM migrado a **Drizzle** con PostgreSQL

### Eliminado
- Configuración antigua de webpack
- Dependencia directa de `pg` en api-server (ahora usa pool de `@workspace/db`)

---

## [1.5.0] — 2025-11-20

### Agregado
- **MercadoPago** integración completa:
  - Creación de preferences con `external_reference: userId|plan`
  - Webhook con validación HMAC-SHA256
  - Idempotencia en `payment_events` con `onConflictDoNothing`
  - Auto-activación y auto-cancelación de suscripciones
  - Planes: `starter`, `pro`, `business`, `enterprise`
- **`subscriptions` y `payment_events` tables**
- **Settings endpoint** (`GET /settings`): perfil + plan + feature flags por tier

### Modificado
- Auth middleware actualizado para manejar refresh tokens concurrentes sin race condition

---

## [1.4.0] — 2025-10-10

### Agregado
- **CRM / Leads**:
  - Pipeline con etapas configurables
  - Notificación automática por WhatsApp en cambio de etapa
  - `GET /leads/stats` con conteos por stage
  - Creación manual de leads vía API y UI
- **Módulo de servicios** (Frappe ERP):
  - `tenant_services` table
  - Provisioning por solicitud con estados: requested / provisioning / active / failed
  - Panel admin para gestión de todas las solicitudes
- **Evolution API management** desde el dashboard:
  - Crear instancias, obtener QR, setup webhook automático
  - Endpoint `POST /chatbot/evolution/setup-webhook` que configura Evolution apuntando al servidor

---

## [1.3.0] — 2025-09-01

### Agregado
- **Sistema de autenticación múltiple**:
  - Replit OIDC (`/login`, `/callback`, `/logout`)
  - Google OAuth (`/auth/google`, `/auth/google/callback`)
  - Email/Password (`/auth/register`, `/auth/login-email`)
  - Mobile auth (`/mobile-auth/token-exchange`, `/mobile-auth/logout`)
  - Reset de contraseña por email con token temporal
- **`users`, `sessions`, `password_reset_tokens` tables**
- **Modo demo**: acceso instantáneo con `demo@clientum.com.ar`
- **Admin access**: condicional por dominio `@clientum.com.ar`
- **`admin/exec` (SSE)**: ejecución de scripts whitelisted desde el dashboard

### Modificado
- Session store migrado de memoria a PostgreSQL (persistencia entre reinicios)

---

## [1.2.0] — 2025-07-15

### Agregado
- **`conversations` y `messages` tables**
- **Chatbot básico**: respuesta por WhatsApp con LLM via OpenRouter
- **`chatbot_configs` table**: configuración por usuario (evolution URL/key/instance, model, prompt)
- **`GET /chatbot/status`**: métricas de actividad del bot
- **Rate limiters** diferenciados: auth, webhook, widget, admin, general
- **Helmet + HSTS** para security headers
- **Compression gzip** (nivel 6)
- **Pino HTTP logger** para logging estructurado en JSON

---

## [1.1.0] — 2025-06-01

### Agregado
- **Landing page** (`/`) con:
  - ROI Calculator interactivo (`RoiSlider`)
  - FOMO notifications (sign-ups recientes simulados)
  - Scroll progress bar + reveal animations (Framer Motion)
  - Countdown timer de precio
  - Video demo embebido
  - Floating WhatsApp button persistente
- **Newsletter**: subscribe / unsubscribe / lista de suscriptores (admin)
- **`newsletter_subscribers` table**
- **`/studio`**: página de creación de contenido

---

## [1.0.0] — 2025-04-10 — Release inicial

### Agregado
- Monorepo básico con frontend React y backend Express
- PostgreSQL con Drizzle ORM
- Schema inicial: `users`, `sessions`
- Auth básica con Replit OIDC
- `AppShell` con sidebar de navegación y tema navy oscuro
- `proxy.mjs` como punto de entrada unificado en puerto 5000
- `start.sh` para orquestación del stack completo
- Scripts de Ubuntu para deploy en producción:
  - Servicios systemd (`clientum-api`, `clientum-vite`, `clientum-proxy`, `evolution-api`)
  - `setup-completo.sh`: instalación automática del servidor
  - `setup-nginx.sh`: Nginx + Certbot HTTPS
  - `setup-tunnel.sh`: Cloudflare Tunnel
  - `health-check.sh`: monitoreo con alertas WhatsApp
  - `backup-db.sh`: backups diarios con rotación 7 días
- `seed-admin.ts`: usuario admin inicial con plan enterprise

---

## Tipos de cambio

| Tipo | Descripción |
|---|---|
| `Agregado` | Funcionalidad nueva |
| `Modificado` | Cambios en funcionalidad existente |
| `Deprecado` | Funcionalidad que se va a eliminar |
| `Eliminado` | Funcionalidad removida |
| `Corregido` | Bug fixes |
| `Seguridad` | Vulnerabilidades corregidas |

---

[Unreleased]: https://github.com/tu-org/clientum/compare/v2.5.0...HEAD
[2.5.0]: https://github.com/tu-org/clientum/compare/v2.4.0...v2.5.0
[2.4.0]: https://github.com/tu-org/clientum/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/tu-org/clientum/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/tu-org/clientum/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/tu-org/clientum/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/tu-org/clientum/compare/v1.5.0...v2.0.0
[1.5.0]: https://github.com/tu-org/clientum/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/tu-org/clientum/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/tu-org/clientum/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/tu-org/clientum/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/tu-org/clientum/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/tu-org/clientum/releases/tag/v1.0.0
