# Clientum — Guía de Onboarding para Desarrolladores

> Paso a paso para levantar el proyecto localmente desde cero.

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Clonar y configurar el repositorio](#2-clonar-y-configurar-el-repositorio)
3. [Variables de entorno](#3-variables-de-entorno)
4. [Base de datos](#4-base-de-datos)
5. [Levantar el proyecto](#5-levantar-el-proyecto)
6. [Verificar que todo funciona](#6-verificar-que-todo-funciona)
7. [Configuración de servicios externos](#7-configuración-de-servicios-externos)
8. [Flujo de desarrollo habitual](#8-flujo-de-desarrollo-habitual)
9. [Comandos de referencia rápida](#9-comandos-de-referencia-rápida)
10. [Solución de problemas comunes](#10-solución-de-problemas-comunes)

---

## 1. Requisitos previos

Antes de empezar, asegurate de tener instalado:

| Herramienta | Versión mínima | Verificar |
|---|---|---|
| Node.js | 20.x | `node --version` |
| pnpm | 9.x | `pnpm --version` |
| PostgreSQL | 15.x | `psql --version` |
| Git | cualquier | `git --version` |

### Instalar pnpm (si no lo tenés)

```bash
npm install -g pnpm
```

### Instalar Node.js 20 (si no lo tenés)

```bash
# Con nvm (recomendado)
nvm install 20
nvm use 20

# O con el instalador oficial
# https://nodejs.org/en/download
```

---

## 2. Clonar y configurar el repositorio

```bash
# Clonar el repositorio
git clone <URL_DEL_REPO> clientum
cd clientum

# Instalar todas las dependencias del monorepo
pnpm install
```

> `pnpm install` en la raíz instala las dependencias de **todos** los workspaces automáticamente gracias a `pnpm-workspace.yaml`.

---

## 3. Variables de entorno

Crear el archivo `.env` en la raíz del proyecto:

```bash
touch .env
```

### Variables obligatorias (mínimo para arrancar)

```env
# Base de datos
DATABASE_URL=postgresql://postgres:password@localhost:5432/clientum

# Puertos (valores por defecto, podés dejarlos así)
API_PORT=8080
VITE_PORT=21496
PROXY_PORT=5000

# Entorno
NODE_ENV=development

# Secreto de sesión (cualquier string largo y aleatorio)
SESSION_SECRET=tu_secreto_super_largo_y_aleatorio_aqui
```

### Variables opcionales (habilitan funcionalidades específicas)

```env
# IA — Chatbot (necesario para que el bot responda)
OPENROUTER_API_KEY=sk-or-...        # Obtener en openrouter.ai

# Pagos MercadoPago
MP_ACCESS_TOKEN=APP_USR-...         # Panel de MercadoPago developers
MP_WEBHOOK_SECRET=tu_webhook_secret  # Definido al crear el webhook en MP

# Audio — Transcripción de mensajes de voz WA
GROQ_API_KEY=gsk_...                # Obtener en console.groq.com

# Prospector de leads
GOOGLE_MAPS_API_KEY=AIza...         # Google Cloud Console

# MCP (para agentes externos de IA)
MCP_API_KEY=tu_clave_mcp

# AFIP (configurado desde el dashboard por cada usuario)
AFIP_TOKEN_RENEW_INTERVAL_H=2       # Frecuencia de renovación (default: 2)
```

> **Nota**: Las claves de AFIP, Evolution API y catálogo se configuran **desde el dashboard** de cada usuario, no en `.env`.

---

## 4. Base de datos

### Crear la base de datos

```bash
# Conectarse a PostgreSQL
psql -U postgres

# Crear la base de datos
CREATE DATABASE clientum;
\q
```

### Sincronizar el schema (desarrollo)

```bash
pnpm --filter @workspace/db run push
```

Este comando usa Drizzle ORM para crear todas las tablas directamente desde los schemas TypeScript. No requiere archivos de migración en desarrollo.

### Crear usuario administrador (opcional pero recomendado)

```bash
pnpm --filter @workspace/scripts run seed:admin
```

Esto crea:
- Usuario: `info@clientum.com.ar`
- Plan: enterprise
- Bot preconfigurado con prompt en español argentino

### Ver el estado de la base de datos

```bash
# Abrir Drizzle Studio (UI visual de la DB)
pnpm --filter @workspace/db run studio
# Abre en http://localhost:4983
```

---

## 5. Levantar el proyecto

### Opción A — Script completo (recomendado)

```bash
bash start.sh
```

Este script:
1. Ejecuta `pnpm install`
2. Sincroniza el schema de la DB
3. Compila el API server con esbuild
4. Levanta el proxy unificador en el puerto **5000**

> En Replit, los workflows manejan API (:8080) y Vite (:21496) por separado. El proxy los une en :5000.

### Opción B — Servicios por separado (para debugging)

```bash
# Terminal 1 — Compilar y levantar API Server
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start

# Terminal 2 — Frontend
pnpm --filter @workspace/clientum run dev

# Terminal 3 — Proxy (punto de entrada unificado)
node proxy.mjs
```

### Acceder a la aplicación

| Servicio | URL | Descripción |
|---|---|---|
| App principal | http://localhost:5000 | Proxy unificador (usar este) |
| Frontend directo | http://localhost:21496 | Vite dev server |
| API directo | http://localhost:8080/api | Express server |
| DB Studio | http://localhost:4983 | Drizzle UI visual |

---

## 6. Verificar que todo funciona

### Check rápido de salud

```bash
curl http://localhost:5000/api/healthz
# Respuesta esperada: { "status": "ok", "timestamp": "..." }
```

### Verificar cada servicio

```bash
# API Server
curl http://localhost:8080/api/healthz

# Frontend (debe retornar HTML)
curl -I http://localhost:21496

# Proxy
curl http://localhost:5000
```

### Login de desarrollo

Si configuraste el seed admin, podés loguearte con:
- Email: `info@clientum.com.ar`
- Contraseña: (la definida en `packages/scripts/src/seed-admin.ts`, por defecto `admin123`)

---

## 7. Configuración de servicios externos

Estos pasos son **opcionales** para desarrollo básico pero necesarios para probar funcionalidades específicas.

### 7.1 OpenRouter (Chatbot IA)

1. Crear cuenta en [openrouter.ai](https://openrouter.ai)
2. Generar API key
3. Agregarla en el dashboard: `Agente IA → Integraciones → OpenRouter API Key`
4. O en `.env`: `OPENROUTER_API_KEY=sk-or-...`

### 7.2 WhatsApp — Evolution API

**Opción local (desarrollo):**

```bash
# Clonar y levantar Evolution API Lite localmente
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api
npm install
npm run start

# Disponible en http://localhost:3000 (cambiar puerto si hay conflicto)
```

**Configurar en el dashboard:**
- Ir a `Conectar WhatsApp`
- Ingresar URL: `http://localhost:3000`
- Ingresar API Key de Evolution
- Crear instancia y escanear QR

### 7.3 MercadoPago (Pagos)

1. Crear cuenta en [developers.mercadopago.com](https://developers.mercadopago.com)
2. Obtener Access Token de prueba (sandbox)
3. Agregar en `.env`:
   ```env
   MP_ACCESS_TOKEN=TEST-...
   MP_WEBHOOK_SECRET=tu_secreto
   ```
4. Para webhooks locales, usar [ngrok](https://ngrok.com) o similar:
   ```bash
   ngrok http 5000
   # Registrar la URL pública en el panel de MP como webhook URL
   ```

### 7.4 AFIP (Facturación electrónica)

1. Solicitar certificado de homologación en [afip.gob.ar](https://www.afip.gob.ar)
2. Generar par de claves (privada + certificado PEM)
3. Configurar desde el dashboard: `ERP → AFIP → Configurar`
4. Usar environment `homologacion` para pruebas

### 7.5 Groq (Transcripción de audio)

1. Crear cuenta en [console.groq.com](https://console.groq.com)
2. Generar API key
3. Agregar en `.env`: `GROQ_API_KEY=gsk_...`

---

## 8. Flujo de desarrollo habitual

### Modificar el backend (`apps/api`)

```bash
# Recompilar tras cada cambio
pnpm --filter @workspace/api-server run build

# Para hot-reload en desarrollo
pnpm --filter @workspace/api-server run dev
```

### Modificar el frontend (`apps/web`)

El frontend tiene **hot-reload automático** gracias a Vite. Solo guardá el archivo y el navegador se actualiza solo.

### Modificar el schema de base de datos

```bash
# 1. Editar el schema en packages/db/src/schema/

# 2. Sincronizar con la DB (desarrollo)
pnpm --filter @workspace/db run push

# 3. Para producción, generar una migración formal:
pnpm --filter @workspace/db run generate
pnpm --filter @workspace/db run migrate
```

### Modificar la spec de API (OpenAPI)

```bash
# 1. Editar packages/api-spec/openapi.yaml

# 2. Regenerar hooks y schemas
pnpm --filter @workspace/api-spec run codegen

# Esto regenera automáticamente:
# - packages/api-zod/src/generated/
# - packages/api-client-react/src/generated/
```

### Agregar un nuevo endpoint

1. Crear o editar el archivo en `apps/api/src/routes/`
2. Registrarlo en `apps/api/src/routes/index.ts`
3. Si es parte de la spec pública, agregarlo a `packages/api-spec/openapi.yaml`
4. Ejecutar `pnpm --filter @workspace/api-spec run codegen`

### Agregar una nueva página al dashboard

1. Crear el componente en `apps/web/src/pages/NuevaPagina.tsx`
2. Agregar la ruta en `apps/web/src/App.tsx`
3. Agregar el ítem de navegación en el sidebar de `AppShell.tsx`

---

## 9. Comandos de referencia rápida

```bash
# ── Desarrollo ──────────────────────────────────────────
bash start.sh                               # Levanta todo el stack
pnpm typecheck                              # Chequeo de tipos TypeScript
pnpm --filter @workspace/db run push        # Sync schema → DB
pnpm --filter @workspace/db run studio      # Abre Drizzle Studio
pnpm --filter @workspace/api-spec run codegen  # Regenera cliente TS

# ── Compilación ─────────────────────────────────────────
pnpm --filter @workspace/api-server run build  # Compila API con esbuild
pnpm --filter @workspace/clientum run build    # Compila frontend

# ── Base de datos ────────────────────────────────────────
pnpm --filter @workspace/db run generate    # Genera migration file
pnpm --filter @workspace/db run migrate     # Aplica migraciones (prod)

# ── Scripts admin ────────────────────────────────────────
pnpm --filter @workspace/scripts run seed:admin     # Crea usuario admin
pnpm --filter @workspace/scripts run create:user    # CLI gestión usuarios
pnpm --filter @workspace/scripts run import:leads   # Importa CSV de leads

# ── Health check ─────────────────────────────────────────
curl http://localhost:5000/api/healthz
```

---

## 10. Solución de problemas comunes

### ❌ `pnpm install` falla con errores de workspace

```bash
# Limpiar caché y reinstalar
rm -rf node_modules
pnpm store prune
pnpm install
```

### ❌ Error de conexión a la base de datos

```bash
# Verificar que PostgreSQL está corriendo
pg_isready -h localhost -p 5432

# Verificar la cadena de conexión
psql "$DATABASE_URL" -c "SELECT 1;"
```

Asegurarse de que `DATABASE_URL` en `.env` tiene el formato correcto:
```
postgresql://usuario:contraseña@localhost:5432/clientum
```

### ❌ Puerto 5000 ya en uso

```bash
# Ver qué proceso usa el puerto
lsof -i :5000

# Matar el proceso
kill -9 <PID>
```

Alternativamente, cambiar el puerto en `.env`:
```env
PROXY_PORT=3000
```

### ❌ El frontend no conecta con la API

Verificar que el proxy está corriendo en el puerto 5000. El frontend hace requests a `/api/*` que el proxy redirige al API server en 8080. Si usás el frontend directo (21496), las peticiones a `/api` no serán redirigidas.

**Siempre usar `http://localhost:5000` como URL base para desarrollo.**

### ❌ Error al compilar el api-server: `Cannot find module`

```bash
# Limpiar la build anterior y recompilar
rm -rf apps/api/dist
pnpm --filter @workspace/api-server run build
```

### ❌ Drizzle push falla con errores de schema

```bash
# Si hay conflictos de schema en desarrollo, se puede resetear la DB:
psql -U postgres -c "DROP DATABASE clientum;"
psql -U postgres -c "CREATE DATABASE clientum;"
pnpm --filter @workspace/db run push
```

### ❌ Los hooks de React Query no tienen tipos (api-client-react vacío)

```bash
# Los archivos en packages/api-client-react/src/generated/ son auto-generados
# Regenerar desde el OpenAPI spec:
pnpm --filter @workspace/api-spec run codegen
```

### ❌ `SESSION_SECRET` no configurada — sesiones no persisten

Agregar al `.env`:
```env
SESSION_SECRET=cualquier_string_largo_y_aleatorio_de_al_menos_32_chars
```

### ❌ El chatbot no responde por WhatsApp

Checklist:
1. ¿Está la Evolution API corriendo y accesible?
2. ¿La instancia de WhatsApp está conectada (estado "open")?
3. ¿Está configurado el webhook en Evolution API apuntando a tu servidor?
4. ¿Hay una `OPENROUTER_API_KEY` válida configurada?
5. ¿El chatbot está activo (`active: true`) en la config del usuario?

Verificar el webhook de Evolution API:
```bash
# El webhook debe apuntar a:
POST https://tu-dominio.com/api/chatbot/webhook
# Con el evento: MESSAGES_UPSERT
```

---

## Estructura de archivos clave para empezar a explorar

```
Si querés entender el BACKEND, empezá por:
  apps/api/src/index.ts          ← Entry point
  apps/api/src/app.ts            ← Middleware stack
  apps/api/src/routes/index.ts   ← Router principal

Si querés entender el FRONTEND, empezá por:
  apps/web/src/App.tsx                        ← Routing
  apps/web/src/components/AppShell.tsx        ← Layout principal
  apps/web/src/pages/app/Overview.tsx         ← Dashboard principal

Si querés entender la BASE DE DATOS, empezá por:
  packages/db/src/schema/        ← Todos los schemas
  packages/db/src/index.ts       ← Exports de tablas

Si querés entender el CHATBOT, empezá por:
  apps/api/src/routes/chatbot.ts ← Toda la lógica del bot
```

---

*Para deploy en producción Ubuntu, ver `docs/deployment/`.*
*Para la arquitectura completa del sistema, ver `docs/architecture/ARCHITECTURE.md`.*
