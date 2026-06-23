#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  Clientum — Monitor con alertas por WhatsApp
#
#  Corre como cron cada N minutos. Detecta fallos en servicios, HTTP, DB,
#  disco y RAM, y manda un mensaje por WhatsApp si algo está caído.
#
#  Uso:
#    bash scripts/monitoreo/monitoreo.sh              # chequeo manual
#    bash scripts/monitoreo/monitoreo.sh --setup-cron # instalar cron (cada 5 min)
#    bash scripts/monitoreo/monitoreo.sh --remove-cron # desinstalar cron
#    bash scripts/monitoreo/monitoreo.sh --test-alerta # enviar alerta de prueba
#    bash scripts/monitoreo/monitoreo.sh --status      # ver config y última ejecución
#
#  Configuración (~/clientum/.env o variables de entorno):
#    MONITOR_WA_NUMBER   — número de WhatsApp a alertar (ej: 5492984510883)
#    MONITOR_WA_INSTANCE — nombre de instancia en Evolution API (ej: clientum)
#    MONITOR_INTERVALO   — minutos entre chequeos cuando se instala el cron (default: 5)
#    MONITOR_DISCO_MAX   — % de uso de disco para alertar (default: 85)
#    MONITOR_RAM_MAX     — % de uso de RAM para alertar (default: 90)
#    EVO_PORT            — puerto de Evolution API (default: 3000)
#    EVO_API_KEY         — API key de Evolution (se lee de ~/.evolution-lite-api-key)
# ═══════════════════════════════════════════════════════════════════════════════
set -eo pipefail

# ─── Colores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# ─── Rutas y config base ──────────────────────────────────────────────────────
CLIENTUM="${CLIENTUM:-$HOME/clientum}"
STATE_DIR="/tmp/clientum-monitor"
LAST_ALERT_FILE="$STATE_DIR/last-alert"
FAILURES_FILE="$STATE_DIR/prev-failures"
LOG_FILE="/var/log/clientum-monitor.log"

mkdir -p "$STATE_DIR"

# ─── Leer .env si existe ──────────────────────────────────────────────────────
if [ -f "$CLIENTUM/.env" ]; then
  _env() { grep -E "^${1}=" "$CLIENTUM/.env" 2>/dev/null | cut -d= -f2; }
  v=$(_env "API_PORT");   [ -n "$v" ] && API_PORT="$v"
  v=$(_env "PROXY_PORT"); [ -n "$v" ] && PROXY_PORT="$v"
  v=$(_env "EVO_PORT");   [ -n "$v" ] && EVO_PORT="$v"
fi

API_PORT="${API_PORT:-8080}"
PROXY_PORT="${PROXY_PORT:-5000}"
EVO_PORT="${EVO_PORT:-3000}"

# ─── Config de alertas ────────────────────────────────────────────────────────
MONITOR_WA_NUMBER="${MONITOR_WA_NUMBER:-}"
MONITOR_WA_INSTANCE="${MONITOR_WA_INSTANCE:-clientum}"
MONITOR_INTERVALO="${MONITOR_INTERVALO:-5}"
MONITOR_DISCO_MAX="${MONITOR_DISCO_MAX:-85}"
MONITOR_RAM_MAX="${MONITOR_RAM_MAX:-90}"
COOLDOWN_MINUTOS="${COOLDOWN_MINUTOS:-30}"  # mínimo entre alertas del mismo fallo

# Intentar leer número y instancia del .env de Evolution si no están seteados
if [ -z "$MONITOR_WA_NUMBER" ] && [ -f "$CLIENTUM/.env" ]; then
  v=$(_env "MONITOR_WA_NUMBER"); [ -n "$v" ] && MONITOR_WA_NUMBER="$v"
  v=$(_env "MONITOR_WA_INSTANCE"); [ -n "$v" ] && MONITOR_WA_INSTANCE="$v"
fi

# API key de Evolution
EVO_API_KEY="${EVO_API_KEY:-}"
if [ -z "$EVO_API_KEY" ]; then
  [ -f "$HOME/.evolution-lite-api-key" ] && EVO_API_KEY=$(cat "$HOME/.evolution-lite-api-key")
  [ -z "$EVO_API_KEY" ] && [ -f "$HOME/.evolution-api-key" ] && EVO_API_KEY=$(cat "$HOME/.evolution-api-key")
fi

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# ─── Funciones auxiliares ─────────────────────────────────────────────────────
log() { echo -e "$1" | tee -a "$LOG_FILE" 2>/dev/null || echo -e "$1"; }

ok()   { log "${GREEN}  ✅ $1${NC}"; }
warn() { log "${YELLOW}  ⚠️  $1${NC}"; }
fail() { log "${RED}  ❌ $1${NC}"; FAILURES+=("$1"); }

# Enviar mensaje por WhatsApp vía Evolution API
send_whatsapp() {
  local TEXTO="$1"
  local NUMERO="$MONITOR_WA_NUMBER"

  if [ -z "$NUMERO" ]; then
    log "${YELLOW}  ⚠️  MONITOR_WA_NUMBER no configurado — la alerta no se envió${NC}"
    log "  Configurá el número en ~/clientum/.env:"
    log "    MONITOR_WA_NUMBER=5492984510883"
    return 1
  fi

  if [ -z "$EVO_API_KEY" ]; then
    log "${YELLOW}  ⚠️  EVO_API_KEY no encontrado — la alerta no se envió${NC}"
    return 1
  fi

  # Verificar que Evolution API esté activa
  local EVO_OK
  EVO_OK=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 \
    "http://localhost:$EVO_PORT/manager" 2>/dev/null || echo "000")
  if [[ ! "$EVO_OK" =~ ^(200|302|301)$ ]]; then
    log "${YELLOW}  ⚠️  Evolution API no responde (HTTP $EVO_OK) — alerta no enviada${NC}"
    return 1
  fi

  local PAYLOAD
  PAYLOAD=$(printf '{"number":"%s@s.whatsapp.net","textMessage":{"text":"%s"}}' \
    "$NUMERO" "$(echo "$TEXTO" | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')")

  local HTTP_CODE
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    -X POST "http://localhost:$EVO_PORT/message/sendText/$MONITOR_WA_INSTANCE" \
    -H "Content-Type: application/json" \
    -H "apikey: $EVO_API_KEY" \
    -d "$PAYLOAD" 2>/dev/null || echo "000")

  if [[ "$HTTP_CODE" =~ ^(200|201)$ ]]; then
    log "${GREEN}  📱 Alerta enviada a +$NUMERO (HTTP $HTTP_CODE)${NC}"
    return 0
  else
    log "${YELLOW}  ⚠️  No se pudo enviar alerta (HTTP $HTTP_CODE)${NC}"
    return 1
  fi
}

# Verificar si debemos enviar alerta (cooldown para no spamear)
should_alert() {
  local FAILURE_KEY="$1"
  local COOLDOWN_SECS=$(( COOLDOWN_MINUTOS * 60 ))
  local KEY_FILE="$STATE_DIR/alert-$(echo "$FAILURE_KEY" | tr ' /' '__')"

  if [ -f "$KEY_FILE" ]; then
    local LAST_TS
    LAST_TS=$(cat "$KEY_FILE" 2>/dev/null || echo 0)
    local NOW
    NOW=$(date +%s)
    local DIFF=$(( NOW - LAST_TS ))
    if [ "$DIFF" -lt "$COOLDOWN_SECS" ]; then
      local WAIT=$(( (COOLDOWN_SECS - DIFF) / 60 ))
      log "  ⏱️  Cooldown activo para '$FAILURE_KEY' — próxima alerta en ${WAIT}min"
      return 1  # no alertar aún
    fi
  fi

  date +%s > "$KEY_FILE"
  return 0  # alertar
}

# ─── Subcomandos ──────────────────────────────────────────────────────────────

cmd_setup_cron() {
  local INTERVALO="${1:-$MONITOR_INTERVALO}"
  local SCRIPT_ABS
  SCRIPT_ABS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"

  echo ""
  echo -e "${BOLD}  Instalando cron para monitoreo cada ${INTERVALO} minutos...${NC}"
  echo ""

  # Verificar configuración mínima
  if [ -z "$MONITOR_WA_NUMBER" ]; then
    echo -e "${YELLOW}  ⚠️  MONITOR_WA_NUMBER no está configurado.${NC}"
    echo "  Agregá esto a ~/clientum/.env antes de instalar el cron:"
    echo ""
    echo "    MONITOR_WA_NUMBER=5492984510883    # tu número de WhatsApp"
    echo "    MONITOR_WA_INSTANCE=clientum        # nombre de instancia en Evolution"
    echo ""
    read -r -p "  ¿Continuar de todas formas? [s/N] " RESP
    [[ ! "$RESP" =~ ^[sS]$ ]] && echo "  Cancelado." && exit 0
  fi

  # Crear entrada de cron
  local CRON_LINE="*/$INTERVALO * * * * bash $SCRIPT_ABS >> /var/log/clientum-monitor.log 2>&1"
  local CRON_MARKER="# clientum-monitor"

  # Eliminar entradas previas
  crontab -l 2>/dev/null | grep -v "$CRON_MARKER" | crontab - 2>/dev/null || true

  # Agregar nueva entrada
  ( crontab -l 2>/dev/null; echo "$CRON_LINE $CRON_MARKER" ) | crontab -

  # Crear el archivo de log con permisos correctos
  sudo touch "$LOG_FILE" 2>/dev/null || touch "$LOG_FILE" 2>/dev/null || true
  sudo chmod 666 "$LOG_FILE" 2>/dev/null || true

  echo -e "${GREEN}  ✅ Cron instalado:${NC} cada $INTERVALO minutos"
  echo -e "  ${CYAN}Log:${NC}    $LOG_FILE"
  echo -e "  ${CYAN}Alertas:${NC} +$MONITOR_WA_NUMBER (instancia: $MONITOR_WA_INSTANCE)"
  echo ""
  echo "  Para ver el cron activo:"
  echo "    crontab -l"
  echo ""
  echo "  Para ver los logs:"
  echo "    tail -f $LOG_FILE"
  echo ""
}

cmd_remove_cron() {
  local CRON_MARKER="# clientum-monitor"
  crontab -l 2>/dev/null | grep -v "$CRON_MARKER" | crontab - 2>/dev/null || true
  echo -e "${GREEN}  ✅ Cron de monitoreo eliminado.${NC}"
}

cmd_test_alerta() {
  echo ""
  echo -e "${BOLD}  Enviando alerta de prueba...${NC}"
  echo ""
  local MSG
  MSG="🧪 *Clientum Monitor — Prueba*

Esta es una alerta de prueba del sistema de monitoreo.
Hora: $TIMESTAMP
Servidor: $(hostname)

Si recibís este mensaje, las alertas de WhatsApp están funcionando correctamente. ✅"

  if send_whatsapp "$MSG"; then
    echo ""
    echo -e "${GREEN}  ✅ Alerta de prueba enviada exitosamente.${NC}"
  else
    echo ""
    echo -e "${RED}  ❌ No se pudo enviar la alerta de prueba.${NC}"
    echo "  Verificá que:"
    echo "    1. MONITOR_WA_NUMBER esté en ~/clientum/.env"
    echo "    2. Evolution API esté corriendo: sudo systemctl status evolution-api-lite"
    echo "    3. La instancia '$MONITOR_WA_INSTANCE' esté conectada al número"
  fi
  echo ""
}

cmd_status() {
  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  Clientum Monitor — Configuración${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  # Cron
  local CRON_ENTRY
  CRON_ENTRY=$(crontab -l 2>/dev/null | grep "clientum-monitor" || echo "")
  if [ -n "$CRON_ENTRY" ]; then
    echo -e "  ${GREEN}✅ Cron:${NC} activo"
    echo "     $CRON_ENTRY"
  else
    echo -e "  ${YELLOW}—  Cron:${NC} no instalado"
    echo "     Instalar: bash scripts/monitoreo/monitoreo.sh --setup-cron"
  fi
  echo ""

  # Config
  echo -e "  ${CYAN}WhatsApp:${NC}  +${MONITOR_WA_NUMBER:-⚠️ no configurado (MONITOR_WA_NUMBER)}"
  echo -e "  ${CYAN}Instancia:${NC} $MONITOR_WA_INSTANCE"
  echo -e "  ${CYAN}API Key:${NC}   ${EVO_API_KEY:+configurada}${EVO_API_KEY:-⚠️ no encontrada}"
  echo -e "  ${CYAN}Cooldown:${NC}  ${COOLDOWN_MINUTOS} min entre alertas del mismo fallo"
  echo -e "  ${CYAN}Disco max:${NC} ${MONITOR_DISCO_MAX}%"
  echo -e "  ${CYAN}RAM max:${NC}   ${MONITOR_RAM_MAX}%"
  echo ""

  # Últimos logs
  if [ -f "$LOG_FILE" ]; then
    echo -e "  ${CYAN}Últimas ejecuciones (log: $LOG_FILE):${NC}"
    echo ""
    tail -20 "$LOG_FILE" 2>/dev/null | sed 's/^/    /'
  else
    echo -e "  ${YELLOW}  Sin logs todavía.${NC}"
  fi
  echo ""
}

# ─── Parsear subcomandos ──────────────────────────────────────────────────────
case "${1:-}" in
  --setup-cron)   cmd_setup_cron "${2:-}"; exit 0 ;;
  --remove-cron)  cmd_remove_cron; exit 0 ;;
  --test-alerta)  cmd_test_alerta; exit 0 ;;
  --status)       cmd_status; exit 0 ;;
esac

# ─── Modo chequeo ─────────────────────────────────────────────────────────────
FAILURES=()

log ""
log "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
log "${BOLD}  Clientum Monitor  [$TIMESTAMP]${NC}"
log "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ─── 1. Servicios systemd ─────────────────────────────────────────────────────
log ""
log "${CYAN}  Servicios:${NC}"

check_service() {
  local SVC="$1" LABEL="$2"
  local STATUS
  STATUS=$(systemctl is-active "$SVC" 2>/dev/null || echo "no instalado")
  if [ "$STATUS" = "active" ]; then
    ok "$LABEL → activo"
  elif [ "$STATUS" = "no instalado" ]; then
    : # ignorar servicios no instalados
  else
    fail "$LABEL → $STATUS"
  fi
}

check_service "clientum-proxy"     "Proxy"
check_service "clientum-api"       "API"
check_service "clientum-vite"      "Vite"
check_service "evolution-api-lite" "Evolution Lite"
check_service "evolution-api"      "Evolution"
check_service "cloudflared"        "Cloudflare Tunnel"
check_service "postgresql"         "PostgreSQL"
check_service "nginx"              "Nginx"

# ─── 2. Endpoints HTTP ────────────────────────────────────────────────────────
log ""
log "${CYAN}  Endpoints HTTP:${NC}"

check_http() {
  local URL="$1" LABEL="$2"
  local CODE
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$URL" 2>/dev/null || echo "000")
  if [[ "$CODE" =~ ^(200|201|302|301|401|404)$ ]]; then
    ok "$LABEL → HTTP $CODE"
  else
    fail "$LABEL → no responde (HTTP $CODE)"
  fi
}

check_http "http://localhost:$PROXY_PORT"           "Proxy  :$PROXY_PORT"
check_http "http://localhost:$API_PORT/api/health"  "API    :$API_PORT/api/health"

# Cloudflare tunnel — solo si está activo
if systemctl is-active cloudflared >/dev/null 2>&1; then
  DOMINIO=""
  [ -f "$HOME/.cloudflared/config.yml" ] && \
    DOMINIO=$(grep -E '^\s+hostname:' "$HOME/.cloudflared/config.yml" 2>/dev/null | head -1 | awk '{print $2}')
  if [ -n "$DOMINIO" ]; then
    check_http "https://$DOMINIO/api/health" "Web    $DOMINIO"
  fi
fi

# ─── 3. Base de datos ─────────────────────────────────────────────────────────
log ""
log "${CYAN}  Base de datos:${NC}"

if sudo -u postgres psql -lqt 2>/dev/null | cut -d\| -f1 | grep -qw "clientum"; then
  ok "PostgreSQL — DB clientum accesible"
else
  fail "PostgreSQL — no se puede conectar a la DB clientum"
fi

# ─── 4. Disco ─────────────────────────────────────────────────────────────────
log ""
log "${CYAN}  Recursos:${NC}"

DISK_PCT=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
DISK_FREE=$(df -h / | tail -1 | awk '{print $4}')
if [ "$DISK_PCT" -lt "$MONITOR_DISCO_MAX" ]; then
  ok "Disco: ${DISK_PCT}% usado, ${DISK_FREE} libre"
elif [ "$DISK_PCT" -lt 95 ]; then
  warn "Disco: ${DISK_PCT}% usado — quedan ${DISK_FREE}"
  FAILURES+=("Disco al ${DISK_PCT}% — solo ${DISK_FREE} libre")
else
  fail "Disco CRÍTICO: ${DISK_PCT}% usado — solo ${DISK_FREE} libre"
fi

# ─── 5. RAM ───────────────────────────────────────────────────────────────────
MEM_FREE=$(free -m | awk '/^Mem:/ {print $4}')
MEM_TOT=$(free -m | awk '/^Mem:/ {print $2}')
MEM_PCT=$(( 100 - MEM_FREE * 100 / MEM_TOT ))
if [ "$MEM_PCT" -lt "$MONITOR_RAM_MAX" ]; then
  ok "RAM: ${MEM_PCT}% usada (${MEM_FREE}MB libres)"
else
  FAILURES+=("RAM al ${MEM_PCT}% — solo ${MEM_FREE}MB libres de ${MEM_TOT}MB")
  fail "RAM: ${MEM_PCT}% usada — solo ${MEM_FREE}MB libres"
fi

# ─── Resumen ──────────────────────────────────────────────────────────────────
log ""
TOTAL_FAIL=${#FAILURES[@]}

if [ $TOTAL_FAIL -eq 0 ]; then
  log "${GREEN}${BOLD}  ✅ Todo OK${NC}"
else
  log "${RED}${BOLD}  ❌ $TOTAL_FAIL fallo(s) detectado(s)${NC}"
fi
log "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
log ""

# ─── Alerta por WhatsApp si hay fallos ────────────────────────────────────────
if [ $TOTAL_FAIL -gt 0 ]; then
  # Armar lista de fallos para el mensaje
  LISTA_FALLOS=""
  for F in "${FAILURES[@]}"; do
    LISTA_FALLOS="${LISTA_FALLOS}• $F
"
  done

  # Determinar la "clave" del fallo para el cooldown
  # Usamos todos los fallos concatenados para que nuevos fallos siempre alerten
  FAILURE_KEY=$(printf '%s\n' "${FAILURES[@]}" | sort | md5sum | cut -c1-8)

  # Obtener dominio si está configurado
  DOMINIO_INFO=""
  if [ -f "$HOME/.cloudflared/config.yml" ]; then
    D=$(grep -E '^\s+hostname:' "$HOME/.cloudflared/config.yml" 2>/dev/null | head -1 | awk '{print $2}')
    [ -n "$D" ] && DOMINIO_INFO="Dominio: $D"
  fi

  MSG="🚨 *Clientum — Alerta del servidor*

$([ $TOTAL_FAIL -eq 1 ] && echo "Se detectó 1 problema:" || echo "Se detectaron $TOTAL_FAIL problemas:")

${LISTA_FALLOS}
🕐 Hora: $TIMESTAMP
🖥️ Servidor: $(hostname)
${DOMINIO_INFO:+🌐 $DOMINIO_INFO}

Revisá el estado con:
  bash scripts/monitoreo/status.sh
  bash scripts/monitoreo/logs.sh"

  if should_alert "$FAILURE_KEY"; then
    log "${YELLOW}  📱 Enviando alerta por WhatsApp...${NC}"
    send_whatsapp "$MSG" || true
  fi

# Si no hay fallos y había fallos antes, enviar alerta de recuperación
elif [ -f "$STATE_DIR/had-failures" ]; then
  RECOVERY_FILE="$STATE_DIR/recovery-sent"
  SEND_RECOVERY=true

  # Cooldown de 60 min para alertas de recuperación
  if [ -f "$RECOVERY_FILE" ]; then
    LAST_R=$(cat "$RECOVERY_FILE" 2>/dev/null || echo 0)
    NOW=$(date +%s)
    [ $(( NOW - LAST_R )) -lt 3600 ] && SEND_RECOVERY=false
  fi

  if $SEND_RECOVERY; then
    MSG="✅ *Clientum — Sistema recuperado*

Todos los servicios están operativos nuevamente.

🕐 Hora: $TIMESTAMP
🖥️ Servidor: $(hostname)"

    log "${GREEN}  📱 Enviando alerta de recuperación...${NC}"
    send_whatsapp "$MSG" || true
    date +%s > "$RECOVERY_FILE"
  fi

  rm -f "$STATE_DIR/had-failures"
fi

# Guardar estado de fallos para la próxima ejecución
if [ $TOTAL_FAIL -gt 0 ]; then
  touch "$STATE_DIR/had-failures"
  printf '%s\n' "${FAILURES[@]}" > "$FAILURES_FILE"
else
  rm -f "$STATE_DIR/had-failures" "$FAILURES_FILE"
fi

# Exit code: 0=ok, 1=fallos
[ $TOTAL_FAIL -gt 0 ] && exit 1
exit 0
