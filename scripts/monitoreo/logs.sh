#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Clientum — Ver logs en tiempo real
#  Uso:
#    bash scripts/monitoreo/logs.sh          → todos los servicios
#    bash scripts/monitoreo/logs.sh api      → solo API
#    bash scripts/monitoreo/logs.sh evo      → solo Evolution
#    bash scripts/monitoreo/logs.sh vite     → solo Vite
#    bash scripts/monitoreo/logs.sh proxy    → solo Proxy
#    bash scripts/monitoreo/logs.sh tunnel   → solo Cloudflare
#    bash scripts/monitoreo/logs.sh --errors → solo errores (última hora)
# ═══════════════════════════════════════════════════════════════

FILTER="${1:-all}"
CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'

# Detectar qué servicio de evolution está activo
EVO_SVC="evolution-api-lite"
systemctl is-active --quiet evolution-api-lite 2>/dev/null || \
  EVO_SVC="evolution-api"

case "$FILTER" in
  api)
    echo -e "${CYAN}▶ Logs de clientum-api (Ctrl+C para salir)${NC}"
    sudo journalctl -f -u clientum-api -n 50 --no-hostname
    ;;
  vite)
    echo -e "${CYAN}▶ Logs de clientum-vite (Ctrl+C para salir)${NC}"
    sudo journalctl -f -u clientum-vite -n 50 --no-hostname
    ;;
  proxy)
    echo -e "${CYAN}▶ Logs de clientum-proxy (Ctrl+C para salir)${NC}"
    sudo journalctl -f -u clientum-proxy -n 50 --no-hostname
    ;;
  evo|evolution)
    echo -e "${CYAN}▶ Logs de $EVO_SVC (Ctrl+C para salir)${NC}"
    sudo journalctl -f -u "$EVO_SVC" -n 50 --no-hostname
    ;;
  tunnel|cloudflare|cf)
    echo -e "${CYAN}▶ Logs de cloudflared (Ctrl+C para salir)${NC}"
    sudo journalctl -f -u cloudflared -n 50 --no-hostname
    ;;
  --errors|errors|err)
    echo -e "${YELLOW}▶ Errores en la última hora de todos los servicios:${NC}"
    echo ""
    for SVC in clientum-api clientum-vite clientum-proxy "$EVO_SVC" cloudflared; do
      COUNT=$(sudo journalctl -u "$SVC" -p err --since "1 hour ago" --no-pager 2>/dev/null | grep -c "." || echo 0)
      [ "$COUNT" -gt 0 ] && echo -e "${YELLOW}  $SVC — $COUNT error(s):${NC}" && \
        sudo journalctl -u "$SVC" -p err --since "1 hour ago" --no-pager 2>/dev/null | tail -5 | sed 's/^/    /'
    done
    ;;
  all|*)
    echo -e "${CYAN}▶ Todos los servicios Clientum (Ctrl+C para salir)${NC}"
    echo ""
    sudo journalctl -f \
      -u clientum-api \
      -u clientum-vite \
      -u clientum-proxy \
      -u "$EVO_SVC" \
      -n 80 \
      --no-hostname \
      --output short-iso
    ;;
esac
