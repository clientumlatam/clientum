# ═══════════════════════════════════════════════════════════════════════════════
#  Clientum — Makefile
#  Comandos rápidos para desarrollo y operación.
#
#  Uso:
#    make dev       — arrancar todo en modo desarrollo (proxy + API + Vite)
#    make build     — compilar API server + typecheck
#    make seed      — crear usuario admin (info@clientum.com.ar)
#    make stop      — detener servicios Ubuntu (systemd)
#    make status    — ver estado de todos los servicios
#    make migrate   — aplicar migraciones de DB (producción)
#    make push      — sincronizar schema sin migraciones (solo dev)
#    make codegen   — regenerar hooks/schemas desde OpenAPI spec
#    make typecheck — typecheck completo de todos los paquetes
#    make logs      — ver logs de todos los servicios (Ubuntu)
#    make backup    — hacer backup manual de la base de datos
#    make update    — actualizar código desde git + rebuild + restart
# ═══════════════════════════════════════════════════════════════════════════════

.PHONY: dev build seed user users stop status migrate push codegen typecheck logs backup update help docker-up docker-down docker-build docker-logs docker-reset

# ── Desarrollo ────────────────────────────────────────────────────────────────

dev:
        @echo "▶  Arrancando Clientum en modo desarrollo..."
        bash start.sh

build:
        @echo "▶  Compilando API server..."
        pnpm --filter @workspace/api-server run build
        @echo "▶  Typecheck completo..."
        pnpm run typecheck
        @echo "✅ Build listo."

typecheck:
        @echo "▶  Typecheck..."
        pnpm run typecheck

# ── Base de datos ─────────────────────────────────────────────────────────────

seed:
        @echo "▶  Creando usuario admin (info@clientum.com.ar)..."
        pnpm --filter @workspace/scripts run seed:admin
        @echo "✅ Admin listo."

user:
        @pnpm --filter @workspace/scripts run create:user

users:
        @pnpm --filter @workspace/scripts run create:user --list

push:
        @echo "▶  Sincronizando schema de DB (sin migraciones)..."
        pnpm --filter @workspace/db run push

migrate:
        @echo "▶  Generando migración SQL..."
        pnpm --filter @workspace/db run generate
        @echo "▶  Aplicando migraciones..."
        pnpm --filter @workspace/db run migrate
        @echo "✅ Migraciones aplicadas."

# ── Codegen ───────────────────────────────────────────────────────────────────

codegen:
        @echo "▶  Regenerando hooks y schemas desde OpenAPI spec..."
        pnpm --filter @workspace/api-spec run codegen
        @echo "✅ Codegen listo."

# ── Operación Ubuntu (systemd) ────────────────────────────────────────────────

stop:
        @if command -v systemctl >/dev/null 2>&1; then \
                bash scripts/stop.sh; \
        else \
                echo "⚠️  systemd no disponible (¿estás en Replit?)"; \
                echo "   Para detener: Ctrl+C en el workflow"; \
        fi

status:
        @if command -v systemctl >/dev/null 2>&1; then \
                bash scripts/status.sh; \
        else \
                echo "Puertos en uso:"; \
                echo "  :5000 (proxy) :8080 (API) :21496 (Vite)"; \
                lsof -iTCP -sTCP:LISTEN -n -P 2>/dev/null | grep -E ':(5000|8080|21496)' || echo "  (sin datos — instalar lsof)"; \
        fi

logs:
        @if command -v journalctl >/dev/null 2>&1; then \
                bash scripts/logs.sh; \
        else \
                echo "⚠️  journalctl no disponible (¿estás en Replit?)"; \
                echo "   Ver logs en la consola del workflow."; \
        fi

backup:
        @echo "▶  Haciendo backup de la base de datos..."
        bash scripts/backup-db.sh

update:
        @echo "▶  Actualizando desde git + rebuild + restart..."
        bash scripts/update.sh

# ── Docker (desarrollo local sin instalar Node/pnpm) ──────────────────────────

docker-up:
        @echo "▶  Arrancando stack con Docker Compose..."
        @echo "   Primera vez: tarda ~2-3 min mientras instala dependencias."
        @echo "   Luego abrí http://localhost:5000"
        docker compose up

docker-up-d:
        docker compose up -d
        @echo "✅ Stack corriendo en background."
        @echo "   http://localhost:5000  — proxy (punto de entrada)"
        @echo "   Logs: make docker-logs"

docker-down:
        docker compose down
        @echo "✅ Contenedores detenidos."

docker-build:
        @echo "▶  Reconstruyendo imagen Docker (útil si cambiaron dependencias)..."
        docker compose build --no-cache

docker-logs:
        docker compose logs -f

docker-reset:
        @echo "⚠️  Esto borrará la base de datos de Docker y todos los volúmenes."
        @read -p "  ¿Confirmar? (Enter para continuar, Ctrl+C para cancelar): " && \
        docker compose down -v && \
        echo "✅ Volúmenes borrados. Próximo 'make docker-up' parte de cero."

docker-prod-up:
        docker compose -f docker-compose.prod.yml up -d

docker-prod-down:
        docker compose -f docker-compose.prod.yml down

# ── Ayuda ─────────────────────────────────────────────────────────────────────

help:
        @echo ""
        @echo "  Clientum — Comandos disponibles"
        @echo ""
        @echo "  Desarrollo:"
        @echo "    make dev        Arrancar en modo desarrollo"
        @echo "    make build      Compilar API + typecheck"
        @echo "    make typecheck  Solo typecheck"
        @echo "    make codegen    Regenerar código desde OpenAPI spec"
        @echo ""
        @echo "  Usuarios y base de datos:"
        @echo "    make seed       Crear usuario admin"
        @echo "    make user       Crear/gestionar un usuario (CLI interactivo)"
        @echo "    make users      Listar todos los usuarios"
        @echo "    make push       Sincronizar schema (dev)"
        @echo "    make migrate    Generar + aplicar migraciones (producción)"
        @echo ""
        @echo "  Operación (Ubuntu con systemd):"
        @echo "    make stop         Detener servicios"
        @echo "    make status       Ver estado del sistema"
        @echo "    make logs         Ver logs de todos los servicios"
        @echo "    make backup       Backup manual de DB"
        @echo "    make update       git pull + rebuild + restart"
        @echo ""
        @echo "  Docker (sin instalar Node/pnpm localmente):"
        @echo "    make docker-up    Arrancar stack completo (proxy+api+vite+postgres)"
        @echo "    make docker-down  Detener contenedores"
        @echo "    make docker-build Reconstruir imagen (si cambian dependencias)"
        @echo "    make docker-logs  Ver logs en tiempo real"
        @echo "    make docker-reset Borrar DB y volúmenes (reset total)"
        @echo ""
