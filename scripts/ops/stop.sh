#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  Clientum — Detener todos los servicios
#
#  Uso:
#    bash scripts/ops/stop.sh               # detener todos los servicios
#    bash scripts/ops/stop.sh --api         # solo detener la API
#    bash scripts/ops/stop.sh --evolution   # solo detener Evolution API
#    bash scripts/ops/stop.sh --all         # incluir Evolution + Cloudflare
# ═══════════════════════════════════════════════════════════════════════════════
set -eo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "${GREEN}  ✅ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
info() { echo -e "  $1"; }

stop_service() {
  local SVC="$1" LABEL="$2"
  local STATUS
  STATUS=$(systemctl is-active "$SVC" 2>/dev/null || echo "inactivo")
  if [ "$STATUS" = "active" ]; then
    sudo systemctl stop "$SVC" 2>/dev/null && ok "$LABEL → detenido" || warn "$LABEL → no se pudo detener"
  elif [ "$STATUS" = "no instalado" ] || [ "$STATUS" = "inactivo" ]; then
    info "  —  $LABEL → ya estaba detenido"
  else
    warn "$LABEL → estado: $STATUS"
  fi
}

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  Clientum — Deteniendo servicios${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

case "${1:-}" in
  --api)
    stop_service "clientum-api" "API"
    ;;
  --evolution)
    stop_service "evolution-api-lite" "Evolution Lite"
    stop_service "evolution-api"      "Evolution"
    ;;
  --all)
    stop_service "clientum-proxy"      "Proxy"
    stop_service "clientum-api"        "API"
    stop_service "clientum-vite"       "Vite"
    stop_service "evolution-api-lite"  "Evolution Lite"
    stop_service "evolution-api"       "Evolution"
    stop_service "cloudflared"         "Cloudflare Tunnel"
    ;;
  *)
    # Default: detener Clientum (proxy + api + vite) pero no Evolution ni Cloudflare
    stop_service "clientum-proxy"  "Proxy"
    stop_service "clientum-api"    "API"
    stop_service "clientum-vite"   "Vite"
    ;;
esac

echo ""

# Mostrar estado final
echo -e "${BOLD}  Estado final:${NC}"
echo ""
for SVC in clientum-proxy clientum-api clientum-vite evolution-api-lite evolution-api cloudflared; do
  STATUS=$(systemctl is-active "$SVC" 2>/dev/null || echo "no instalado")
  if [ "$STATUS" = "active" ]; then
    printf "  ${GREEN}▶  %-28s activo${NC}\n" "$SVC"
  elif [ "$STATUS" = "no instalado" ]; then
    : # no mostrar los que no están instalados
  elif [ "$STATUS" = "inactive" ]; then
    printf "  ${YELLOW}⏹  %-28s detenido${NC}\n" "$SVC"
  else
    printf "  ${RED}⚠️  %-28s %s${NC}\n" "$SVC" "$STATUS"
  fi
done

echo ""
echo "  Para volver a arrancar:"
echo "    sudo systemctl start clientum-api clientum-vite clientum-proxy"
echo "  O actualizar y reiniciar:"
echo "    bash scripts/ops/update.sh"
echo ""
