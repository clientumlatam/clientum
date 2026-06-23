#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Clientum — Recompilar y reiniciar servicios
#  Para uso después de cambios de código sin git pull.
#  Para actualizar desde git, usá update.sh en su lugar.
#
#  Uso:
#    bash scripts/ops/rebuild.sh
#    bash scripts/ops/rebuild.sh --skip-migration
#    bash scripts/ops/rebuild.sh --only-api
# ═══════════════════════════════════════════════════════════════
set -e

DIR_PROYECTO=$(cd "$(dirname "$0")/../.." && pwd)
SKIP_MIGRATION=false
ONLY_API=false

for arg in "$@"; do
  case "$arg" in
    --skip-migration) SKIP_MIGRATION=true ;;
    --only-api)       ONLY_API=true        ;;
  esac
done

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✅ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
paso() { echo -e "\n${CYAN}━━━ $1${NC}"; }

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║      Clientum — Rebuild  [$(date '+%H:%M:%S')]               ║"
echo "╚══════════════════════════════════════════════════════╝"

cd "$DIR_PROYECTO"

# ── Dependencias ─────────────────────────────────────────────────────────────
paso "Dependencias pnpm"
if [ ! -f "pnpm-lock.yaml" ]; then
  echo "  ❌ No se encontró pnpm-lock.yaml en $DIR_PROYECTO"; exit 1
fi
CI=true pnpm install
ok "pnpm install completo"

# ── Migraciones ──────────────────────────────────────────────────────────────
if [ "$SKIP_MIGRATION" = false ]; then
  paso "Migraciones de base de datos"
  if pnpm --filter @workspace/db run migrate 2>/dev/null; then
    ok "Migraciones aplicadas"
  else
    warn "Sin migraciones pendientes (o migrate skipped)"
    echo "  Para forzar push directo: pnpm --filter @workspace/db run push"
  fi
fi

# ── Build ────────────────────────────────────────────────────────────────────
paso "Compilar API server"
pnpm --filter @workspace/api-server run build
ok "Build → artifacts/api-server/dist/"

# ── Reiniciar servicios ──────────────────────────────────────────────────────
paso "Reiniciar servicios"

restart_if_active() {
  local SVC="$1"
  if systemctl is-active --quiet "$SVC" 2>/dev/null; then
    sudo systemctl restart "$SVC" && ok "$SVC reiniciado" || warn "$SVC — error al reiniciar"
  elif systemctl list-unit-files "$SVC.service" &>/dev/null 2>&1; then
    warn "$SVC — instalado pero inactivo (no se reinicia)"
  fi
}

restart_if_active "clientum-api"

if [ "$ONLY_API" = false ]; then
  restart_if_active "clientum-vite"
  restart_if_active "clientum-proxy"
  restart_if_active "evolution-api-lite"
  restart_if_active "evolution-api"
fi

# ── Estado final ─────────────────────────────────────────────────────────────
paso "Estado"
sleep 3
for SVC in clientum-api clientum-vite clientum-proxy; do
  STATUS=$(systemctl is-active "$SVC" 2>/dev/null || echo "inactivo")
  [ "$STATUS" = "active" ] && ok "$SVC → activo" || warn "$SVC → $STATUS"
done

echo ""
echo "  App local:   http://localhost:5000"
echo "  Estado:      bash scripts/monitoreo/status.sh"
echo "  Logs:        bash scripts/monitoreo/logs.sh"
echo ""
