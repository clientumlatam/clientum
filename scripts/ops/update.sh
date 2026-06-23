#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Clientum — Actualizar código y reiniciar servicios
#  Hace git pull, instala deps, compila y reinicia todo.
#
#  Uso:
#    bash scripts/ops/update.sh             → actualización completa
#    bash scripts/ops/update.sh --no-pull   → solo rebuild (sin git pull)
#    bash scripts/ops/update.sh --api-only  → solo reiniciar API
# ═══════════════════════════════════════════════════════════════
set -e

DIR_PROYECTO=$(cd "$(dirname "$0")/../.." && pwd)
SKIP_PULL=false
API_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --no-pull)  SKIP_PULL=true ;;
    --api-only) API_ONLY=true  ;;
  esac
done

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✅ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
paso() { echo -e "\n${CYAN}━━━ $1${NC}"; }

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║          Clientum — Update  [$(date '+%H:%M:%S')]              ║"
echo "╚══════════════════════════════════════════════════════╝"

cd "$DIR_PROYECTO"

# ── 1. Git pull ──────────────────────────────────────────────────────────────
if [ "$SKIP_PULL" = false ] && [ -d ".git" ]; then
  paso "PASO 1 — Actualizando código"
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
  echo "  Rama: $BRANCH"
  BEFORE=$(git rev-parse HEAD 2>/dev/null || echo "")
  git pull --rebase origin "$BRANCH" 2>/dev/null || git pull origin "$BRANCH"
  AFTER=$(git rev-parse HEAD 2>/dev/null || echo "")
  if [ "$BEFORE" != "$AFTER" ]; then
    echo ""
    echo "  Cambios:"
    git log --oneline "$BEFORE...$AFTER" 2>/dev/null | sed 's/^/    /' || true
    ok "Código actualizado"
  else
    ok "Ya estaba en la versión más reciente"
  fi
else
  paso "PASO 1 — Git pull (omitido con --no-pull)"
fi

# ── 2. Dependencias pnpm ─────────────────────────────────────────────────────
paso "PASO 2 — Dependencias pnpm"
CI=true pnpm install --frozen-lockfile 2>/dev/null || \
  CI=true pnpm install
ok "pnpm install completo"

# ── 3. Migraciones DB ────────────────────────────────────────────────────────
if [ "$API_ONLY" = false ]; then
  paso "PASO 3 — Migraciones de base de datos"
  if pnpm --filter @workspace/db run migrate 2>/dev/null; then
    ok "Migraciones aplicadas"
  else
    warn "Sin migraciones pendientes (o skipped)"
  fi
fi

# ── 4. Build ─────────────────────────────────────────────────────────────────
paso "PASO 4 — Compilar API server"
pnpm --filter @workspace/api-server run build
ok "Build completado → artifacts/api-server/dist/"

# ── 5. Reiniciar servicios ───────────────────────────────────────────────────
paso "PASO 5 — Reiniciar servicios"

restart_svc() {
  local SVC="$1"
  if systemctl list-unit-files "$SVC.service" &>/dev/null 2>&1; then
    sudo systemctl restart "$SVC" 2>/dev/null && \
      ok "$SVC reiniciado" || warn "$SVC — no se pudo reiniciar"
  fi
}

restart_svc "clientum-api"
restart_svc "clientum-vite"
restart_svc "clientum-proxy"
# Evolution: solo reiniciar si ya estaba activo (no forzamos)
if systemctl is-active --quiet evolution-api-lite 2>/dev/null; then
  restart_svc "evolution-api-lite"
elif systemctl is-active --quiet evolution-api 2>/dev/null; then
  restart_svc "evolution-api"
fi

# ── 6. Verificación ─────────────────────────────────────────────────────────
paso "PASO 6 — Estado final"
sleep 3

for SVC in clientum-api clientum-vite clientum-proxy; do
  STATUS=$(systemctl is-active "$SVC" 2>/dev/null || echo "inactivo")
  [ "$STATUS" = "active" ] && ok "$SVC → activo" || warn "$SVC → $STATUS"
done

echo ""
echo "  App: http://localhost:5000"
[ -f "$HOME/.cloudflared/config.yml" ] && \
  DOMINIO=$(grep -E '^\s+hostname:' "$HOME/.cloudflared/config.yml" 2>/dev/null | head -1 | awk '{print $2}') && \
  [ -n "$DOMINIO" ] && echo "  Web: https://$DOMINIO"
echo ""
echo -e "${GREEN}  ✅ Update completado [$(date '+%H:%M:%S')]${NC}"
echo ""
