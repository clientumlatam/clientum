# Roadmap — Clientum

> Features priorizadas con estimaciones de esfuerzo, criterios de aceptación y dependencias técnicas.

**Leyenda de esfuerzo:**
- 🟢 **S** — 1 a 3 días
- 🟡 **M** — 4 a 7 días
- 🔴 **L** — 8 a 15 días
- ⚫ **XL** — más de 15 días

**Leyenda de prioridad:**
- 🔥 **P0** — Crítico / bloquea revenue
- ⚡ **P1** — Alto impacto en retención
- 📈 **P2** — Mejora significativa de UX
- 🔬 **P3** — Nice to have / experimental

---

## Versión 2.6.0 — Reportes e Inteligencia de Negocio
> Objetivo: dar a los usuarios visibilidad sobre el ROI de su agente IA

### F-001 · Reporte semanal automático por WhatsApp
- **Prioridad**: 🔥 P0
- **Esfuerzo**: 🟡 M (5 días)
- **Descripción**: Cada lunes se envía al número del dueño un resumen con: leads nuevos, mensajes respondidos, órdenes generadas, turnos agendados, tasa de handoff y uptime del bot.
- **Criterios de aceptación**:
  - [ ] Scheduler adicional en `reminderScheduler.ts` ejecuta los lunes a las 9 AM (timezone del usuario)
  - [ ] Mensaje formateado con emojis y datos del período 7 días anteriores
  - [ ] Toggle para activar/desactivar desde el dashboard
  - [ ] Preview del reporte disponible en `/app/analytics`
- **Dependencias técnicas**: `scheduled_messages` table, `analytics` route, Evolution API
- **Tablas afectadas**: `chatbot_configs` (nuevo campo `weekly_report_enabled`)

---

### F-002 · Dashboard de analytics avanzado
- **Prioridad**: ⚡ P1
- **Esfuerzo**: 🔴 L (10 días)
- **Descripción**: Reemplazar el analytics actual con gráficos interactivos: funnel de conversión, heatmap de horarios de mayor actividad, NPS estimado por sentimiento de mensajes, comparativa semana a semana.
- **Criterios de aceptación**:
  - [ ] Gráfico de funnel: visitante → lead → calificado → cliente
  - [ ] Heatmap 7x24 de volumen de mensajes por día y hora
  - [ ] Tendencia semanal con comparativa vs período anterior (+/- %)
  - [ ] Exportación a CSV y PDF
  - [ ] Filtros por período (7d / 30d / 90d / custom)
- **Dependencias técnicas**: librería de charts (Recharts o Chart.js), nueva lógica de agregación en `analytics.ts`

---

### F-003 · Benchmark por industria
- **Prioridad**: 📈 P2
- **Esfuerzo**: 🟡 M (7 días)
- **Descripción**: Comparar métricas del usuario con el promedio anonimizado de otros negocios del mismo rubro (ferretería, salud, inmobiliaria, etc.). "Tu tasa de respuesta es 23% mejor que el promedio de farmacias."
- **Criterios de aceptación**:
  - [ ] Campo `industry` en `chatbot_configs` (selector de industria al onboarding)
  - [ ] Cálculo de percentiles por industria sobre métricas agregadas (sin PII)
  - [ ] Widget en el dashboard mostrando posición relativa
  - [ ] Solo visible para usuarios con plan `pro` o superior
- **Dependencias técnicas**: `chatbot_configs` migration, nuevo endpoint `GET /analytics/benchmark`

---

## Versión 2.7.0 — Multi-canal y Comunicaciones
> Objetivo: ampliar más allá de WhatsApp

### F-004 · Canal Instagram DM
- **Prioridad**: 🔥 P0
- **Esfuerzo**: ⚫ XL (18 días)
- **Descripción**: Conectar el agente IA con Instagram Direct Messages via Meta Graph API. El mismo agente responde por WA e Instagram con un historial unificado por contacto.
- **Criterios de aceptación**:
  - [ ] OAuth flow con Meta / Instagram Business
  - [ ] Webhook de Instagram integrado al mismo pipeline del chatbot
  - [ ] `conversations.channel` soporta valor `instagram`
  - [ ] UI de conexión similar a `ConnectWhatsApp.tsx`
  - [ ] Historial unificado por teléfono/email del contacto
  - [ ] Solo disponible para plan `business` y `enterprise`
- **Dependencias técnicas**: Meta Graph API, nueva columna `channel` en `messages` table

---

### F-005 · Email como canal de atención
- **Prioridad**: ⚡ P1
- **Esfuerzo**: 🔴 L (12 días)
- **Descripción**: El agente IA puede recibir y responder emails. Integración con SMTP/IMAP o Resend API. Los emails aparecen en el mismo CRM unificado.
- **Criterios de aceptación**:
  - [ ] Configuración de cuenta de email desde el dashboard
  - [ ] Polling / webhook de emails entrantes cada 60 segundos
  - [ ] Respuesta automática del agente IA con firma HTML
  - [ ] Thread de email completo visible en la conversación del CRM
  - [ ] `conversations.channel` soporta valor `email`
- **Dependencias técnicas**: Resend SDK o Nodemailer + IMAP, nueva tabla `email_configs`

---

### F-006 · Campañas programadas con segmentación
- **Prioridad**: ⚡ P1
- **Esfuerzo**: 🟡 M (6 días)
- **Descripción**: Evolución del broadcast actual. Permite crear campañas con fecha/hora de envío, segmentación por `lead_status`, `channel` o etiquetas, y seguimiento de entrega.
- **Criterios de aceptación**:
  - [ ] Nueva tabla `campaigns` con `name`, `message`, `segment_filter` (JSONB), `scheduled_at`, `status`, `sent_count`, `failed_count`
  - [ ] Scheduler que detecta campañas pendientes y las ejecuta
  - [ ] UI de creación de campaña con preview de audiencia en tiempo real
  - [ ] Reporte de resultados post-envío
  - [ ] Respeta los caps por plan del broadcast actual
- **Dependencias técnicas**: `scheduled_messages` scheduler, Evolution API, nuevo schema `campaigns`

---

## Versión 2.8.0 — Multi-tenancy y Escala
> Objetivo: soportar agencias y revendedores que gestionan múltiples PyMEs

### F-007 · Multi-tenancy con subdominio por cliente
- **Prioridad**: 🔥 P0 (para modelo agencia)
- **Esfuerzo**: ⚫ XL (20 días)
- **Descripción**: Cada cliente de una agencia accede a su propio panel en `empresa.clientum.com.ar`. La agencia tiene un super-panel para gestionar todos sus clientes.
- **Criterios de aceptación**:
  - [ ] Tabla `organizations` con `subdomain`, `owner_user_id`, `plan`
  - [ ] Tabla `organization_members` con roles: `owner`, `admin`, `operator`
  - [ ] Routing en el proxy detecta subdomain y setea `organization_id` en el contexto
  - [ ] Todos los queries de DB filtran por `organization_id` (row-level isolation)
  - [ ] Super-panel en `/admin/organizations` para gestionar clientes
  - [ ] Wildcard DNS + Cloudflare para subdominios dinámicos
  - [ ] Plan especial `agency` con límite de organizaciones hijo
- **Dependencias técnicas**: proxy.mjs multi-tenant routing, Drizzle migrations, Cloudflare API
- **⚠️ BREAKING CHANGE**: migración masiva de `user_id` → `organization_id` en todas las tablas

---

### F-008 · Panel de agencia / white-label
- **Prioridad**: ⚡ P1
- **Esfuerzo**: 🔴 L (14 días)
- **Descripción**: Panel para que una agencia vea el estado de todos sus clientes: bots activos, leads nuevos hoy, órdenes, alertas — en una sola vista.
- **Criterios de aceptación**:
  - [ ] Vista `/agency` accesible solo para plan `agency`
  - [ ] Cards por cliente con: estado del bot, leads nuevos (24h), revenue, última actividad
  - [ ] Acceso directo al panel de cada cliente con "Impersonar"
  - [ ] White-label: logo y colores propios de la agencia en los paneles de sus clientes
  - [ ] Reportes consolidados exportables a PDF/Excel
- **Dependencias técnicas**: F-007, nueva tabla `agency_configs` con branding

---

### F-009 · API pública con documentación
- **Prioridad**: ⚡ P1
- **Esfuerzo**: 🟡 M (7 días)
- **Descripción**: Exponer una API REST pública documentada con Swagger UI para que los clientes integren Clientum con sus propios sistemas.
- **Criterios de aceptación**:
  - [ ] Todos los endpoints de negocio cubiertos en `openapi.yaml`
  - [ ] Autenticación por API key generada desde el dashboard
  - [ ] Swagger UI disponible en `/api/docs`
  - [ ] Rate limiting por API key con cuotas según plan
  - [ ] SDK auto-generado para Python y Node.js (Orval + openapi-generator)
  - [ ] Webhooks salientes configurables (lead nuevo, orden actualizada, etc.)
- **Dependencias técnicas**: extensión de `packages/api-spec/openapi.yaml`, nueva tabla `api_keys`

---

## Versión 2.9.0 — IA Avanzada
> Objetivo: hacer al agente más inteligente y autónomo

### F-010 · RAG semántico con embeddings vectoriales
- **Prioridad**: ⚡ P1
- **Esfuerzo**: 🔴 L (12 días)
- **Descripción**: Reemplazar el RAG keyword-based actual por búsqueda semántica con embeddings. El agente entiende preguntas similares aunque usen palabras distintas.
- **Criterios de aceptación**:
  - [ ] Extensión de `pgvector` habilitada en PostgreSQL
  - [ ] Campo `embedding vector(1536)` en `knowledge_items`
  - [ ] Generación de embeddings al crear/actualizar knowledge items (OpenAI text-embedding-3-small o equivalente)
  - [ ] Búsqueda por similitud coseno: `<=>` operator en Drizzle
  - [ ] Comparativa A/B de relevancia vs búsqueda actual
  - [ ] Umbral de similitud configurable (guardrail anti-hallucination)
- **Dependencias técnicas**: pgvector extension, embeddings API, migration en `knowledge_items`

---

### F-011 · Agente con memoria de largo plazo por contacto
- **Prioridad**: 📈 P2
- **Esfuerzo**: 🟡 M (7 días)
- **Descripción**: El agente recuerda información de conversaciones anteriores de cada contacto: nombre, preferencias, historial de compras, problemas pasados.
- **Criterios de aceptación**:
  - [ ] Nueva tabla `contact_memory` con `conversation_id`, `key`, `value`, `confidence`
  - [ ] Extracción automática de datos clave de conversaciones (nombre, intereses, etc.) mediante LLM al cerrar conversación
  - [ ] Inyección de memoria relevante al `systemPrompt` de conversaciones futuras
  - [ ] UI para ver y editar la memoria de cada contacto en el CRM
  - [ ] Opción de borrar memoria por contacto (GDPR compliance)
- **Dependencias técnicas**: nuevo schema `contact_memory`, scheduler de extracción

---

### F-012 · Agente que inicia conversaciones (outbound)
- **Prioridad**: 🔥 P0
- **Esfuerzo**: 🔴 L (10 días)
- **Descripción**: El agente puede iniciar conversaciones proactivas: seguimiento de leads fríos, confirmación de turnos, recupero de carritos abandonados, encuestas post-compra.
- **Criterios de aceptación**:
  - [ ] UI de "Secuencias" con trigger (tiempo sin actividad, status de orden, etc.) y cadencia de mensajes
  - [ ] Nueva tabla `sequences` con nodos de mensajes y condiciones de parada
  - [ ] Respeta las 24h de la política de WhatsApp Business (usa templates HSM)
  - [ ] Integración con Meta Business para envío de templates aprobados
  - [ ] Métricas de apertura y respuesta por secuencia
- **Dependencias técnicas**: Meta Business API (templates), nueva tabla `sequences`, scheduler

---

## Versión 3.0.0 — Plataforma Abierta
> Objetivo: ecosistema de integraciones y marketplace

### F-013 · Marketplace de integraciones
- **Prioridad**: 📈 P2
- **Esfuerzo**: ⚫ XL (25 días)
- **Descripción**: Panel de integraciones donde el usuario puede conectar con un click: Shopify, Tienda Nube, Google Calendar, Calendly, Stripe, Gmail, Notion, Airtable.
- **Criterios de aceptación**:
  - [ ] Sistema de conectores OAuth + webhook bidireccional
  - [ ] 5 integraciones en el launch: Google Calendar, Tienda Nube, Gmail, Notion, Stripe
  - [ ] Cada integración tiene acciones (triggers) y reacciones (actions) configurables desde UI
  - [ ] Nueva tabla `integration_connections` con credentials cifradas
  - [ ] Marketplace UI en `/app/integrations` con estado de conexión y logs
- **Dependencias técnicas**: OAuth flow genérico, cifrado de credentials, webhook router

---

### F-014 · Builder de flujos visual (no-code)
- **Prioridad**: 📈 P2
- **Esfuerzo**: ⚫ XL (20 días)
- **Descripción**: Reemplazar la configuración de flows con JSON por un editor visual drag-and-drop tipo Zapier/n8n embebido en el dashboard.
- **Criterios de aceptación**:
  - [ ] Canvas de nodos con conexiones arrastrables (React Flow o similar)
  - [ ] Nodos disponibles: Trigger, Send Message, Condition, Wait, Escalate, HTTP Request, Update Lead, Create Order
  - [ ] Preview en tiempo real del flujo antes de activarlo
  - [ ] Import/Export de flows como JSON
  - [ ] Compatibilidad hacia atrás con flows existentes en DB
- **Dependencias técnicas**: React Flow library, extensión del schema JSONB de `flows`

---

## Backlog técnico (deuda técnica y mejoras de infraestructura)

### T-001 · RAG con pgvector (prerequisito de F-010)
- **Esfuerzo**: 🟡 M
- Habilitar extensión `pgvector` en PostgreSQL, agregar columna `embedding` en `knowledge_items`

### T-002 · Tests automatizados E2E
- **Esfuerzo**: 🔴 L
- Implementar Playwright para flujos críticos: auth, chatbot webhook, pago MP, solicitud CAE

### T-003 · Cobertura de OpenAPI spec
- **Esfuerzo**: 🟡 M
- Agregar al `openapi.yaml` los ~70 endpoints que no están cubiertos actualmente

### T-004 · Migración de `user_id` a UUID v7
- **Esfuerzo**: 🟡 M
- Unificar tipos de ID (actualmente mezcla de `text`, `uuid` y `serial`)

### T-005 · Observabilidad con OpenTelemetry
- **Esfuerzo**: 🔴 L
- Integrar trazas distribuidas (Jaeger o Grafana Tempo) para debuggear latencia del chatbot

### T-006 · CI/CD con GitHub Actions
- **Esfuerzo**: 🟢 S
- Pipeline: `typecheck → test → build → deploy` en cada push a `main`

### T-007 · Cifrado de credenciales sensibles en DB
- **Esfuerzo**: 🟡 M
- Cifrar campos: `evolution_api_key`, `cert_pem`, `private_key_pem`, `groq_api_key` con AES-256-GCM antes de persistir

### T-008 · Paginación en todos los endpoints de listado
- **Esfuerzo**: 🟢 S
- `GET /leads`, `GET /orders`, `GET /conversations` no tienen cursor/offset pagination

### T-009 · Soft delete en entidades principales
- **Esfuerzo**: 🟢 S
- Agregar `deleted_at` en `conversations`, `orders`, `appointments` para borrado reversible

---

## Matriz de priorización

```
                    IMPACTO EN REVENUE
                    Alto        Bajo
                 ┌──────────┬──────────┐
        Alta     │  🔥 P0   │  ⚡ P1   │
URGENCIA         │ F-001    │ F-006    │
                 │ F-004    │ F-008    │
                 │ F-012    │ F-009    │
                 ├──────────┼──────────┤
        Baja     │  ⚡ P1   │  📈 P2  │
                 │ F-007    │ F-002    │
                 │ F-010    │ F-003    │
                 │          │ F-011    │
                 │          │ F-014    │
                 └──────────┴──────────┘
```

---

## Timeline estimado

```
Q3 2026 (Jul–Sep)
  ├── v2.6.0 → Reportes e Inteligencia de Negocio
  │   └── F-001 (Reporte semanal WA) · F-002 (Analytics avanzado) · F-003 (Benchmark)
  └── T-006 (CI/CD) · T-008 (Paginación) · T-009 (Soft delete)

Q4 2026 (Oct–Dic)
  ├── v2.7.0 → Multi-canal
  │   └── F-004 (Instagram DM) · F-005 (Email) · F-006 (Campañas)
  └── T-002 (Tests E2E) · T-007 (Cifrado credenciales)

Q1 2027 (Ene–Mar)
  ├── v2.8.0 → Multi-tenancy
  │   └── F-007 (Subdominio por cliente) · F-008 (Panel agencia) · F-009 (API pública)
  └── T-003 (OpenAPI cobertura) · T-004 (UUID v7)

Q2 2027 (Abr–Jun)
  ├── v2.9.0 → IA Avanzada
  │   └── F-010 (RAG semántico) · F-011 (Memoria por contacto) · F-012 (Outbound)
  └── T-001 (pgvector) · T-005 (OpenTelemetry)

Q3–Q4 2027
  └── v3.0.0 → Plataforma Abierta
      └── F-013 (Marketplace integraciones) · F-014 (Builder visual)
```

---

## Criterios de "Definition of Done" para cada feature

Antes de marcar una feature como completada, debe cumplir:

- [ ] Código revisado y aprobado (PR review)
- [ ] Tipos TypeScript sin errores (`pnpm typecheck`)
- [ ] Endpoint documentado en `openapi.yaml` (si aplica)
- [ ] Schema de DB con migración formal (`pnpm --filter @workspace/db run generate`)
- [ ] Feature testeada manualmente en staging
- [ ] Entrada agregada en `CHANGELOG.md`
- [ ] Documentación actualizada en `ARCHITECTURE.md` si cambia la arquitectura
- [ ] Rate limiter configurado si el endpoint es público
- [ ] Funcionalidad restringida por plan si corresponde

---

*Para proponer una nueva feature, agregala al backlog con el formato de esta plantilla.*
*Para reportar un bug, abrí un issue con el label `bug` y el módulo afectado.*
