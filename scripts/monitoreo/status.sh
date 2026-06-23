#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Clientum — Estado rápido de todos los servicios
#  Uso: bash scripts/monitoreo/status.sh
# ═══════════════════════════════════════════════════════════════

CLIENTUM="${CLIENTUM:-$HOME/clientum}"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# Leer puertos del .env
API_PORT=8080; PROXY_PORT=5000; VITE_PORT=21496; EVO_PORT=3000
if [ -f "$CLIENTUM/.env" ]; then
  _read() { grep -E "^${1}=" "$CLIENTUM/.env" 2>/dev/null | cut -d= -f2; }
  v=$(_read "API_PORT");   [ -n "$v" ] && API_PORT="$v"
  v=$(_read "PROXY_PORT"); [ -n "$v" ] && PROXY_PORT="$v"
  v=$(_read "VITE_PORT");  [ -n "$v" ] && VITE_PORT="$v"
  v=$(_read "EVO_PORT");   [ -n "$v" ] && EVO_PORT="$v"
fi
# Leer puerto real desde el .env de Evolution si existe
if [ -f "$HOME/evolution-lite/.env" ]; then
  _evo_port=$(grep -E "^SERVER_PORT=" "$HOME/evolution-lite/.env" 2>/dev/null | cut -d= -f2 || echo "")
  [ -n "$_evo_port" ] && EVO_PORT="$_evo_port"
fi

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  Clientum — Estado del sistema  [$(date '+%H:%M:%S')]${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ── Servicios ────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}  Servicios systemd:${NC}"

svc_line() {
  local NAME="$1" LABEL="$2"
  local STATUS; STATUS=$(systemctl is-active "$NAME" 2>/dev/null || echo "no instalado")
  local UPTIME=""
  if [ "$STATUS" = "active" ]; then
    SINCE=$(systemctl show "$NAME" --property=ActiveEnterTimestamp --value 2>/dev/null | \
            sed 's/[A-Z]* [A-Z]*//' | awk '{print $2, $3}' 2>/dev/null || echo "")
    [ -n "$SINCE" ] && UPTIME="  (desde $SINCE)"
    printf "  ${GREEN}✅ %-28s activo${NC}%s\n" "$LABEL" "$UPTIME"
  elif [ "$STATUS" = "inactive" ]; then
    printf "  ${YELLOW}⏸  %-28s detenido${NC}\n" "$LABEL"
  elif [ "$STATUS" = "no instalado" ]; then
    printf "  ${YELLOW}—  %-28s no instalado${NC}\n" "$LABEL"
  else
    printf "  ${RED}❌ %-28s %s${NC}\n" "$LABEL" "$STATUS"
  fi
}

svc_line "clientum-proxy"    "Proxy  (:$PROXY_PORT)"
svc_line "clientum-api"      "API    (:$API_PORT)"
svc_line "clientum-vite"     "Vite   (:$VITE_PORT)"
svc_line "evolution-api-lite" "Evolution Lite (:$EVO_PORT)"
svc_line "evolution-api"     "Evolution Full (:$EVO_PORT)"
svc_line "cloudflared"       "Cloudflare Tunnel"

# ── Puertos TCP ──────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}  Puertos TCP:${NC}"

port_line() {
  local PUERTO="$1" LABEL="$2" ESPERADO="$3"
  local PID; PID=$(lsof -ti tcp:${PUERTO} 2>/dev/null || true)
  if [ -n "$PID" ]; then
    PROC=$(ps -p "$PID" -o comm= 2>/dev/null || echo "?")
    if [ "$PROC" = "$ESPERADO" ] || [ -z "$ESPERADO" ]; then
      printf "  ${GREEN}✅ :%-5s  %-22s en uso por ${BOLD}%s${NC}${GREEN} (PID %s)${NC}\n" \
        "$PUERTO" "$LABEL" "$PROC" "$PID"
    else
      printf "  ${YELLOW}⚠️  :%-5s  %-22s esperaba ${BOLD}%s${NC}${YELLOW}, tiene ${BOLD}%s${NC}${YELLOW} (PID %s)${NC}\n" \
        "$PUERTO" "$LABEL" "$ESPERADO" "$PROC" "$PID"
    fi
  else
    printf "  ${RED}❌ :%-5s  %-22s sin proceso escuchando${NC}\n" "$PUERTO" "$LABEL"
  fi
}

port_line "$PROXY_PORT" "Clientum Proxy"   "node"
port_line "$API_PORT"   "Clientum API"     "node"
port_line "$EVO_PORT"   "Evolution API"    "node"
port_line "$VITE_PORT"  "Vite Dev Server"  "node"

# ── Conectividad HTTP ────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}  Endpoints HTTP:${NC}"

http_check() {
  local URL="$1" LABEL="$2"
  local CODE; CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$URL" 2>/dev/null || echo "000")
  if [[ "$CODE" =~ ^(200|201|302|401|404)$ ]]; then
    printf "  ${GREEN}✅ %-38s HTTP %s${NC}\n" "$LABEL" "$CODE"
  else
    printf "  ${RED}❌ %-38s no responde (HTTP %s)${NC}\n" "$LABEL" "$CODE"
  fi
}

http_check "http://localhost:$PROXY_PORT"             "Proxy  http://localhost:$PROXY_PORT"
http_check "http://localhost:$API_PORT/api/health"    "API    http://localhost:$API_PORT/api/health"
http_check "http://localhost:$EVO_PORT/manager"       "Evolution  http://localhost:$EVO_PORT"

# ── Cloudflare tunnel dominio ────────────────────────────────────────────────
DOMINIO=""
[ -f "$HOME/.cloudflared/config.yml" ] && \
  DOMINIO=$(grep -E '^\s+hostname:' "$HOME/.cloudflared/config.yml" 2>/dev/null | head -1 | awk '{print $2}')
if [ -n "$DOMINIO" ]; then
  http_check "https://$DOMINIO"  "Web    https://$DOMINIO"
fi

# ── Base de datos ────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}  Base de datos:${NC}"
if sudo -u postgres psql -lqt 2>/dev/null | cut -d\| -f1 | grep -qw "clientum"; then
  SESSIONS=$(sudo -u postgres psql -d clientum -t -c \
    "SELECT COUNT(*) FROM sessions;" 2>/dev/null | tr -d ' ' || echo "?")
  printf "  ${GREEN}✅ PostgreSQL — DB clientum OK  (sesiones: %s)${NC}\n" "$SESSIONS"
else
  printf "  ${RED}❌ PostgreSQL — no se puede conectar a 'clientum'${NC}\n"
fi

# ── Disco y RAM ──────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}  Recursos:${NC}"
DISK_PCT=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
DISK_FREE=$(df -h / | tail -1 | awk '{print $4}')
MEM_FREE=$(free -m | awk '/^Mem:/ {print $4}')
MEM_TOT=$(free -m  | awk '/^Mem:/ {print $2}')
MEM_PCT=$(( 100 - MEM_FREE * 100 / MEM_TOT ))

DISK_COLOR=$GREEN;  [ "$DISK_PCT" -ge 80 ] && DISK_COLOR=$YELLOW; [ "$DISK_PCT" -ge 90 ] && DISK_COLOR=$RED
MEM_COLOR=$GREEN;   [ "$MEM_PCT"  -ge 80 ] && MEM_COLOR=$YELLOW;  [ "$MEM_PCT"  -ge 90 ] && MEM_COLOR=$RED

printf "  ${DISK_COLOR}Disco: %s%% usado, %s libre${NC}\n" "$DISK_PCT" "$DISK_FREE"
printf "  ${MEM_COLOR}RAM:   %s%% usada (%s MB libres de %s MB)${NC}\n" "$MEM_PCT" "$MEM_FREE" "$MEM_TOT"

# ── Último backup ────────────────────────────────────────────────────────────
LATEST_BACKUP=$(ls -t /var/backups/clientum/clientum_*.sql.gz 2>/dev/null | head -1)
echo ""
echo -e "${CYAN}  Backup:${NC}"
if [ -n "$LATEST_BACKUP" ]; then
  AGE_H=$(( ( $(date +%s) - $(stat -c %Y "$LATEST_BACKUP") ) / 3600 ))
  SIZE=$(du -sh "$LATEST_BACKUP" | cut -f1)
  BCK_COLOR=$GREEN; [ "$AGE_H" -gt 26 ] && BCK_COLOR=$YELLOW
  printf "  ${BCK_COLOR}Último: %s hace %sh (%s)${NC}\n" "$(basename "$LATEST_BACKUP")" "$AGE_H" "$SIZE"
else
  printf "  ${YELLOW}Sin backups en /var/backups/clientum/${NC}\n"
fi

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${CYAN}logs:${NC}   bash scripts/monitoreo/logs.sh"
echo -e "  ${CYAN}update:${NC} bash scripts/ops/update.sh"
echo -e "  ${CYAN}backup:${NC} bash scripts/db/backup-db.sh"
echo ""
