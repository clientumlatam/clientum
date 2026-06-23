# Clientum — IA para PyMEs

Landing page y plataforma SaaS de IA/automatización para pequeñas y medianas empresas argentinas (PyMEs).

## Run & Operate

- `make help` — ver todos los comandos disponibles (Makefile en la raíz)
- `bash start.sh` — arranca todo (proxy + API + frontend). Es lo que corre el workflow.
- `pnpm --filter @workspace/api-server run build` — compila el API server (esbuild → `dist/`)
- `pnpm --filter @workspace/api-server run start` — corre el build compilado en port 8080
- `pnpm --filter @workspace/clientum run dev` — Vite dev server en port 21496
- `node proxy.mjs` — proxy HTTP en port 5000 (ruta `/api` → 8080, resto → 21496)
- `pnpm run typecheck` — typecheck completo en todos los paquetes
- `pnpm run build` — typecheck + build de todos los paquetes
- `pnpm --filter @workspace/api-spec run codegen` — regenera hooks y Zod schemas desde el spec OpenAPI
- `pnpm --filter @workspace/scripts run create:user` — CLI para crear/listar/eliminar usuarios y cambiar planes desde la terminal
- `pnpm --filter @workspace/db run generate` — genera migración SQL a partir del diff de schema
- `pnpm --filter @workspace/db run migrate` — aplica migraciones pendientes (dev + prod)
- `pnpm --filter @workspace/db run push` — sincronización directa sin migraciones (solo dev, mantener para desarrollo rápido)

## Environment variables y secrets

Todos gestionados en Replit Secrets (nunca en `.env`):

- `DATABASE_URL` — Postgres (provisto automáticamente por Replit DB)
- `SESSION_SECRET` — clave para firmar cookies de sesión
- `REPL_ID`, `REPLIT_DOMAINS`, `REPLIT_DEV_DOMAIN` — provistos automáticamente por Replit
- `MP_ACCESS_TOKEN` — token de MercadoPago (payments devuelven 503 si no está)
- `OPENROUTER_API_KEY` — clave general para el chatbot IA vía OpenRouter
- `OPENROUTER_API_KEY_CLIENTUM` — clave premium usada para usuarios con email `@clientum.com.ar` (ver `resolveOpenRouterKey` en `chatbot.ts`)
- `GROQ_API_KEY` — clave para transcripción de audio con Whisper Large v3 (opcional; sin ella el bot pide al usuario que escriba en texto)
- `AFIP_TOKEN_RENEW_INTERVAL_H` — cada cuántas horas corre el scheduler de renovación de tokens WSAA (default: `2`)
- `AFIP_TOKEN_RENEW_UMBRAL_H` — umbral en horas: renovar tokens que venzan en menos de N horas (default: `3`)

Variables de entorno (no secrets):

- `PORT=8080` — puerto del API server
- `VITE_PORT=21496` — puerto del Vite frontend
- `API_PORT=8080` — puerto que usa el proxy para redirigir `/api`
- `PROXY_PORT=5000` — puerto del proxy principal
- `BASE_PATH=/` — base path del frontend Vite
- `NODE_ENV=development`

Variables opcionales para monitoreo automático (en `.env` del servidor Ubuntu):

- `MONITOR_WA_NUMBER` — número de WhatsApp para recibir alertas del health-check (ej: `5492984510883`)
- `MONITOR_WA_INSTANCE` — nombre de instancia Evolution para las alertas
- `MONITOR_EVO_KEY` — API key de Evolution para las alertas (default: lee `~/.evolution-lite-api-key`)
- `MONITOR_EVO_URL` — URL de Evolution para las alertas (default: `http://localhost:3000`)

## Docker (desarrollo sin instalar Node/pnpm)

```bash
# Copiar .env de ejemplo
cp docker/.env.example docker/.env   # editar con tus API keys

# Arrancar todo (postgres + api + vite + proxy)
make docker-up                        # o: docker compose up

# En background
make docker-up-d                      # luego: make docker-logs

# Reset total (borra DB)
make docker-reset                     # o: docker compose down -v

# Producción (usa el Dockerfile multi-stage)
docker compose -f docker-compose.prod.yml up -d
```

URLs cuando el stack está corriendo:
- http://localhost:5000 — punto de entrada principal (proxy)
- http://localhost:8080 — API directo
- http://localhost:21496 — Vite directo
- localhost:5433 — PostgreSQL (puerto 5433 para no pisar Postgres local)

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- Frontend: React 19 + Vite 7 + Tailwind v4 (shadcn/ui components, framer-motion, wouter)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: Replit Auth (OIDC/PKCE) via `openid-client` — sesiones en PostgreSQL
- Payments: MercadoPago (REST API directo, sin SDK)
- AI: OpenRouter (chatbot)
- Validation: Zod, `drizzle-zod`
- API codegen: Orval (desde OpenAPI spec)
- Build: esbuild (ESM bundle)

## Estructura del proyecto

```
artifacts/
  api-server/       — Express backend (auth, payments, chatbot, webhooks)
  clientum/         — React frontend (landing page + dashboard)
  mockup-sandbox/   — entorno de prototipado UI
lib/
  db/               — schema Drizzle (auth, subscriptions)
  api-spec/         — openapi.yaml + config Orval
  api-zod/          — tipos y schemas Zod generados
  api-client-react/ — hooks React Query generados
  replit-auth-web/  — hook useAuth() compartido
scripts/            — scripts utilitarios (seed admin, import leads)
scripts/ — scripts de despliegue Ubuntu + servicios systemd
docs/               — documentación técnica (AFIP, brand, CHECKLIST)
PAPELERA/           — archivos obsoletos/duplicados (no borrar hasta confirmar)
proxy.mjs           — proxy HTTP raíz (une API + Vite en :5000)
start.sh            — script de arranque del workflow
```

## Where things live

- `lib/db/src/schema/auth.ts` — tablas sessions + users (Drizzle)
- `lib/db/src/schema/subscriptions.ts` — tabla subscriptions con plan/status/mpPaymentId
- `lib/db/src/schema/catalog.ts` — tabla catalog_configs (catálogo digital por usuario)
- `lib/api-spec/openapi.yaml` — contrato OpenAPI (source of truth)
- `lib/replit-auth-web/src/use-auth.ts` — hook `useAuth()` de React
- `artifacts/clientum/src/pages/Home.tsx` — landing page completa (23 secciones)
- `artifacts/clientum/src/pages/Dashboard.tsx` — página de cuenta/planes
- `artifacts/clientum/src/pages/app/Flows.tsx` — gestión de flows con CRUD (GET/POST/PATCH/DELETE /flows)
- `artifacts/clientum/src/pages/app/Appointments.tsx` — agenda de turnos (GET/POST/PATCH /appointments)
- `artifacts/clientum/src/pages/app/Orders.tsx` — pedidos por WhatsApp (GET/PATCH /orders)
- `artifacts/clientum/src/pages/app/Broadcast.tsx` — difusión masiva (GET /broadcast/contacts + POST /broadcast/send)
- `artifacts/clientum/src/pages/app/Mockups.tsx` — visor de mockups de diseño (HTML files en public/mockups/)
- `artifacts/clientum/public/mockups/` — 8 mockups HTML servidos estáticamente por Vite
- `artifacts/api-server/src/routes/auth.ts` — rutas `/api/auth/*` OIDC
- `artifacts/api-server/src/routes/payments.ts` — rutas `/api/payments/*` MercadoPago
- `artifacts/api-server/src/routes/settings.ts` — ruta `/api/settings`
- `artifacts/api-server/src/routes/catalog.ts` — rutas `/api/catalog/*` (config + público por token)
- `artifacts/clientum/src/pages/Catalogo.tsx` — página pública `/catalogo/:token`
- `artifacts/api-server/src/routes/chatbot.ts` — chatbot, webhook Evolution API, human handoff, `resolveOpenRouterKey`
- `artifacts/api-server/src/routes/flows.ts` — CRUD flows de conversación
- `artifacts/api-server/src/routes/appointments.ts` — CRUD turnos + recordatorios WhatsApp
- `artifacts/api-server/src/routes/orders.ts` — CRUD pedidos + actualizaciones de estado vía WhatsApp
- `artifacts/api-server/src/routes/broadcast.ts` — difusión masiva (límites por plan)
- `scripts/monitoreo/health-check.sh` — verificación completa del servidor (servicios, DB, tunnel, disco, RAM, backups) + línea `CLIENTUM_HEALTH:` para cron + alerta WhatsApp
- `scripts/monitoreo/status.sh` — estado rápido: servicios systemd + puertos TCP + endpoints HTTP + DB + disco
- `artifacts/api-server/src/lib/auth.ts` — lógica de sesiones en DB
- `artifacts/api-server/src/middlewares/authMiddleware.ts` — middleware auth + refresh de tokens
- `scripts/src/import-leads.ts` — importación de leads desde CSV (`pnpm --filter @workspace/scripts run import:leads`)

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed hooks + Zod schemas. Correr codegen después de cualquier cambio en el spec.
- Auth usa Replit OIDC con sesiones almacenadas en PostgreSQL (no express-session en memoria). Sesiones se borran al hacer logout.
- MercadoPago usa hosted checkout (redirect a MP, vuelve por success/failure URLs). Sin verificación de firma de webhooks aún.
- `lib/replit-auth-web` usa `(import.meta as unknown as { env?: { BASE_URL?: string } })` para no necesitar tipos `vite/client` en su tsconfig.
- Dashboard es client-rendered; redirige a login si no está autenticado. Datos de plan vienen de `/api/settings`.
- El proxy.mjs vive en la raíz del workspace y requiere `http-proxy` instalado en el root (`dependencies` en `package.json`).
- **Audio transcription**: `artifacts/api-server/src/lib/audio.ts` — Groq Whisper Large v3. El webhook de Evolution API puede enviar base64 cuando `WEBHOOK_BASE64=true` está configurado. Si `GROQ_API_KEY` no está seteado, el bot responde pidiendo texto. Si la transcripción funciona, el texto se procesa por la IA normalmente.
- **Human handoff**: campo `handoffMode boolean` en tabla `conversations`. El webhook del chatbot (`chatbot.ts`) verifica ese campo antes de llamar a la IA — si está en `true`, no responde. Las rutas `PATCH /chatbot/conversations/:id/handoff` y `POST /chatbot/conversations/:id/reply` permiten al operador tomar/ceder el control.
- **Resolución de API key por dominio**: `resolveOpenRouterKey(ownerUserId)` en `chatbot.ts` hace una query a `users` para ver el email del dueño del chatbot. Si termina en `@clientum.com.ar`, usa `OPENROUTER_API_KEY_CLIENTUM`; si no, usa `OPENROUTER_API_KEY`. La key del usuario en su config de chatbot siempre tiene prioridad sobre ambas.
- **Modelos OpenRouter por plan** (última validación junio 2026): Free → `liquid/lfm-2.5-1.2b-instruct:free`, Starter → `nvidia/nemotron-3-nano-30b-a3b:free`, Pro → `google/gemma-4-31b-it:free`, Business → `z-ai/glm-4.5-air:free`, Enterprise → `meta-llama/llama-3.3-70b-instruct:free`.
- **Puertos críticos**: Evolution API :3000, API server :8080, Proxy :5000, Vite :21496. Los scripts de instalación y actualización validan estos puertos antes de ejecutarse para evitar conflictos silenciosos.

## Product

- Landing page completa con calculadora ROI, FAQ, testimonios, countdown, notificaciones FOMO, casos por sector
- Sección Planes (dark navy): 5 planes con toggle mensual/anual — Free (gratis), Starter ($180.000 ARS/mes), Pro ($350.000 ARS/mes), Business ($600.000 ARS/mes), Enterprise (a consultar)
- Sección Integraciones: marquee animado con 20+ pills de integraciones
- Sección Partners: Referidor (15% comisión), Reseller (30% descuento), Agency Partner (white label)
- Login con Replit Auth (botón "Ingresar" en el navbar)
- Dashboard/Mi cuenta: sidebar nav, card de plan actual, upgrade vía MercadoPago hosted checkout
- Chatbot con **human handoff**: operador puede tomar control de conversaciones desde el dashboard; bot no responde mientras handoff está activo
- CRM con 72 leads pre-cargados (importados desde dataset de repositorios GitHub)
- **Onboarding checklist** en OverviewPanel: 5 pasos (cuenta → knowledge → Evolution → activar → primera prueba). Se oculta cuando todos están completos o el usuario la cierra. Usa `GET /api/chatbot/status`.
- **Chatbot toggle mejorado**: badge rojo/verde con animación, alerta contextual (mensaje diferente si falta Evolution API vs si solo hay que guardar), botón "Activar →" en el header del panel.
- WhatsApp: https://wa.me/5492984510883

## User preferences

- Español (es-AR) en todo el texto de la UI
- No usar "Replit" en texto visible al usuario
- WhatsApp business: 5492984510883

## Admin user

- ID fijo: `admin_clientum`
- Email: `info@clientum.com.ar`
- Plan: Enterprise (active)
- Widget token: `clientumadminwidgettoken00000001`
- Recrear: `pnpm --filter @workspace/scripts run seed:admin`
- Dev login (solo NODE_ENV=development): `GET /api/auth/dev-login`

## Setup local Ubuntu

Ver `artifacts/clientum/public/docs/scripts/guias/setup-local.md` para instrucciones completas.
Pasos rápidos: instalar Node 20 + pnpm + PostgreSQL → copiar `scripts/ubuntu-local.env.example` a `.env` → `pnpm install` → `pnpm --filter @workspace/db run push` → `pnpm --filter @workspace/scripts run seed:admin` → `bash start.sh`

### Scripts Ubuntu (systemd + Cloudflare Tunnel)

Estructura de `scripts/`:

```
scripts/
  setup/      → instalación inicial (setup-completo, instalar-servicios, nginx, tunnel)
  whatsapp/   → Evolution API (instalar-lite, instalar-full, actualizar-lite, conectar)
  ops/        → operación diaria (start, stop, rebuild, update)
  monitoreo/  → diagnóstico y alertas (diagnostico, health-check, status, logs, monitoreo, reporte-diario)
  db/         → backup y restore
  services/   → unit files systemd
  docs/       → checklists + comandos rápidos de operación
  evolution.env.example        → template .env para Evolution API
  ubuntu-local.env.example     → template .env para desarrollo local Ubuntu
```

Scripts por categoría:

| Categoría | Script | Qué hace |
|---|---|---|
| **setup** | `setup/setup-completo.sh` | Setup from scratch: verifica 3 puertos (:3000/:5000/:8080), instala Node+DB+.env+servicios |
| **setup** | `setup/instalar-servicios.sh` | Instala/reinstala los servicios systemd (api/vite/proxy) |
| **setup** | `setup/setup-tunnel.sh [dominio]` | Cloudflare Tunnel → dominio propio |
| **setup** | `setup/setup-nginx.sh [dominio]` | Nginx + Let's Encrypt SSL |
| **whatsapp** | `whatsapp/instalar-evolution-lite.sh` | Evolution Lite — valida puerto :3000 antes de instalar, interactivo |
| **whatsapp** | `whatsapp/actualizar-evolution-lite.sh [--check\|--force]` | Actualiza sin downtime — valida que el puerto no fue tomado por otro proceso |
| **whatsapp** | `whatsapp/instalar-evolution.sh` | Evolution completo (full features) |
| **whatsapp** | `whatsapp/conectar-whatsapp.sh` | Conectar WhatsApp (QR en consola) |
| **ops** | `ops/start.sh` | Arranca proxy + API + frontend |
| **ops** | `ops/stop.sh [--api\|--evolution\|--all]` | Detiene servicios |
| **ops** | `ops/rebuild.sh [--skip-migration\|--only-api]` | Recompila y reinicia sin git pull |
| **ops** | `ops/update.sh [--no-pull\|--api-only]` | git pull + install + build + restart |
| **monitoreo** | `monitoreo/diagnostico.sh [--env\|--db\|--afip\|--evolution\|--tunel]` | Diagnóstico completo por módulo. Con `--afip --renovar[=N]` renueva tokens WSAA. |
| **monitoreo** | `monitoreo/health-check.sh` | Verifica servicios, DB, tunnel, disco, RAM, backups — emite línea `CLIENTUM_HEALTH: PASS\|WARN\|FAIL` + alerta WhatsApp si hay fallos |
| **monitoreo** | `monitoreo/status.sh` | Estado rápido: servicios systemd + puertos TCP + endpoints HTTP + DB + disco |
| **monitoreo** | `monitoreo/logs.sh [api\|evo\|vite\|proxy\|tunnel\|--errors]` | Ver logs de cualquier servicio |
| **monitoreo** | `monitoreo/monitoreo.sh` | Monitor automático: cron + alertas por WhatsApp |
| **monitoreo** | `monitoreo/reporte-diario.sh` | Reporte diario por WhatsApp |
| **db** | `db/backup-db.sh` | Backup comprimido con rotación 7 días |
| **db** | `db/restore-db.sh` | Restaura desde backup (menú interactivo) |

Uso rápido para servidor Ubuntu desde cero:
```bash
cd ~/clientum
bash scripts/setup/setup-completo.sh                       # app + Node + DB
bash scripts/whatsapp/instalar-evolution-lite.sh           # WhatsApp (recomendado)
bash scripts/setup/setup-tunnel.sh clientum.com.ar         # dominio con Cloudflare
# O con Nginx + SSL propio:
bash scripts/setup/setup-nginx.sh clientum.com.ar          # dominio con Nginx
```

Operación diaria:
```bash
bash scripts/monitoreo/status.sh          # ver estado completo (servicios + puertos + HTTP)
bash scripts/monitoreo/logs.sh            # ver todos los logs
bash scripts/monitoreo/logs.sh api        # solo API
bash scripts/monitoreo/logs.sh evo        # solo Evolution WhatsApp
bash scripts/ops/update.sh                # actualizar código desde git
bash scripts/whatsapp/conectar-whatsapp.sh  # conectar número desde consola

# Parsear resultado del health-check en cron:
grep "^CLIENTUM_HEALTH" /var/log/clientum-health.log | tail -1
```

## Gotchas

- Después de editar `lib/api-spec/openapi.yaml`, correr codegen: `pnpm --filter @workspace/api-spec run codegen`
- Después de editar `lib/db/src/schema/*`, correr: `pnpm --filter @workspace/db run push`
- `MP_ACCESS_TOKEN` es requerido para pagos; sin él el endpoint devuelve 503 gracefully
- `lib/replit-auth-web` es una composite lib — está en referencias de `tsconfig.json` raíz y en `artifacts/clientum/tsconfig.json`
- No usar `fs.strict` workarounds en Vite; los paquetes del workspace se resuelven via symlinks de pnpm en `node_modules` local
- `http-proxy` debe estar en las `dependencies` del `package.json` raíz (no en un sub-paquete) para que `proxy.mjs` lo encuentre
- El API server requiere que `PORT` esté seteado como env var (no tiene default hardcodeado)
- Vite requiere `PORT` y `BASE_PATH` como env vars (lanzar con `PORT=21496 BASE_PATH=/ pnpm dev`)
- Evolution API corre en **:3000** (no :8080 — cambiado para evitar conflicto con el API server)
- `health-check.sh` emite `CLIENTUM_HEALTH: PASS|WARN|FAIL ...` al final — parseable con grep en logs de cron
