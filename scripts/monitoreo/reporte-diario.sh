#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  Clientum — Reporte Diario por WhatsApp
#
#  Envía un resumen diario por WhatsApp con el estado del servidor:
#  uptime de servicios, sesiones activas, mensajes procesados, pagos,
#  conversaciones del chatbot, uso de disco/RAM y estado del último backup.
#
#  Uso:
#    bash scripts/monitoreo/reporte-diario.sh              # enviar reporte ahora
#    bash scripts/monitoreo/reporte-diario.sh --setup-cron # instalar cron (default: 8:00 AM)
#    bash scripts/monitoreo/reporte-diario.sh --setup-cron "30 7"  # a las 7:30 AM
#    bash scripts/monitoreo/reporte-diario.sh --remove-cron # desinstalar cron
#    bash scripts/monitoreo/reporte-diario.sh --preview    # ver el reporte en terminal (sin enviar)
#    bash scripts/monitoreo/reporte-diario.sh --status     # ver config y último envío
#
#  Configuración (~/clientum/.env):
#    MONITOR_WA_NUMBER   — número de WhatsApp destino (ej: 5492984510883)
#    MONITOR_WA_INSTANCE — instancia Evolution API (default: clientum)
#    EVO_PORT            — puerto Evolution API (default: 3000)
#    EVO_API_KEY         — API key (se lee de ~/.evolution-lite-api-key)
#    REPORTE_HORA        — hora del cron en formato "MM HH" (default: "0 8" = 8:00 AM)
# ═══════════════════════════════════════════════════════════════════════════════
set -eo pipefail

# ─── Colores (solo para terminal, no para el WA) ──────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# ─── Config base ──────────────────────────────────────────────────────────────
CLIENTUM="${CLIENTUM:-$HOME/clientum}"
LOG_FILE="/var/log/clientum-reporte.log"
LAST_SENT_FILE="/tmp/clientum-reporte-last-sent"

# ─── Leer .env ────────────────────────────────────────────────────────────────
if [ -f "$CLIENTUM/.env" ]; then
  _env() { grep -E "^${1}=" "$CLIENTUM/.env" 2>/dev/null | cut -d= -f2; }
  v=$(_env "API_PORT");   [ -n "$v" ] && API_PORT="$v"
  v=$(_env "EVO_PORT");   [ -n "$v" ] && EVO_PORT="$v"
  v=$(_env "MONITOR_WA_NUMBER");   [ -n "$v" ] && MONITOR_WA_NUMBER="$v"
  v=$(_env "MONITOR_WA_INSTANCE"); [ -n "$v" ] && MONITOR_WA_INSTANCE="$v"
  v=$(_env "REPORTE_HORA");        [ -n "$v" ] && REPORTE_HORA="$v"
fi

API_PORT="${API_PORT:-8080}"
EVO_PORT="${EVO_PORT:-3000}"
MONITOR_WA_NUMBER="${MONITOR_WA_NUMBER:-}"
MONITOR_WA_INSTANCE="${MONITOR_WA_INSTANCE:-clientum}"
REPORTE_HORA="${REPORTE_HORA:-0 8}"  # minuto hora → "0 8" = 8:00 AM

# API key de Evolution
EVO_API_KEY="${EVO_API_KEY:-}"
if [ -z "$EVO_API_KEY" ]; then
  [ -f "$HOME/.evolution-lite-api-key" ] && EVO_API_KEY=$(cat "$HOME/.evolution-lite-api-key")
  [ -z "$EVO_API_KEY" ] && [ -f "$HOME/.evolution-api-key" ] && EVO_API_KEY=$(cat "$HOME/.evolution-api-key")
fi

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
FECHA_LEGIBLE=$(date '+%A %d de %B de %Y' 2>/dev/null || date '+%d/%m/%Y')
HORA_LEGIBLE=$(date '+%H:%M')

# ─── Helpers ──────────────────────────────────────────────────────────────────
log() { echo -e "$1" | tee -a "$LOG_FILE" 2>/dev/null || echo -e "$1"; }

send_whatsapp() {
  local TEXTO="$1"
  local NUMERO="$MONITOR_WA_NUMBER"

  if [ -z "$NUMERO" ]; then
    log "${YELLOW}  ⚠️  MONITOR_WA_NUMBER no configurado${NC}"
    log "  Agregá en ~/clientum/.env:"
    log "    MONITOR_WA_NUMBER=5492984510883"
    return 1
  fi
  if [ -z "$EVO_API_KEY" ]; then
    log "${YELLOW}  ⚠️  EVO_API_KEY no encontrado${NC}"
    return 1
  fi

  local EVO_OK
  EVO_OK=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 \
    "http://localhost:$EVO_PORT/manager" 2>/dev/null || echo "000")
  if [[ ! "$EVO_OK" =~ ^(200|302|301)$ ]]; then
    log "${YELLOW}  ⚠️  Evolution API no responde (HTTP $EVO_OK)${NC}"
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
    log "${GREEN}  📱 Reporte enviado a +$NUMERO${NC}"
    date '+%Y-%m-%d %H:%M:%S' > "$LAST_SENT_FILE"
    return 0
  else
    log "${RED}  ❌ No se pudo enviar (HTTP $HTTP_CODE)${NC}"
    return 1
  fi
}

# ─── Subcomandos ──────────────────────────────────────────────────────────────

cmd_setup_cron() {
  local HORA_ARG="${1:-$REPORTE_HORA}"
  local SCRIPT_ABS
  SCRIPT_ABS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"

  echo ""
  echo -e "${BOLD}  Instalando cron para reporte diario...${NC}"
  echo ""

  if [ -z "$MONITOR_WA_NUMBER" ]; then
    echo -e "${YELLOW}  ⚠️  MONITOR_WA_NUMBER no configurado.${NC}"
    echo "  Agregá en ~/clientum/.env:"
    echo "    MONITOR_WA_NUMBER=5492984510883"
    echo "    MONITOR_WA_INSTANCE=clientum"
    echo ""
    read -r -p "  ¿Continuar de todas formas? [s/N] " RESP
    [[ ! "$RESP" =~ ^[sS]$ ]] && echo "  Cancelado." && exit 0
  fi

  local MIN HORA
  MIN=$(echo "$HORA_ARG" | awk '{print $1}')
  HORA=$(echo "$HORA_ARG" | awk '{print $2}')
  MIN="${MIN:-0}"; HORA="${HORA:-8}"

  local HORA_F
  HORA_F=$(printf "%02d:%02d" "$HORA" "$MIN")

  local CRON_LINE="$MIN $HORA * * * bash $SCRIPT_ABS >> /var/log/clientum-reporte.log 2>&1"
  local CRON_MARKER="# clientum-reporte-diario"

  crontab -l 2>/dev/null | grep -v "$CRON_MARKER" | crontab - 2>/dev/null || true
  ( crontab -l 2>/dev/null; echo "$CRON_LINE $CRON_MARKER" ) | crontab -

  sudo touch "$LOG_FILE" 2>/dev/null || touch "$LOG_FILE" 2>/dev/null || true
  sudo chmod 666 "$LOG_FILE" 2>/dev/null || true

  echo -e "${GREEN}  ✅ Cron instalado:${NC} reporte diario a las $HORA_F"
  echo -e "  ${CYAN}Destino:${NC} +$MONITOR_WA_NUMBER (instancia: $MONITOR_WA_INSTANCE)"
  echo -e "  ${CYAN}Log:${NC}     $LOG_FILE"
  echo ""
  echo "  Para cambiar la hora:"
  echo "    bash scripts/monitoreo/reporte-diario.sh --setup-cron \"30 9\"   # 9:30 AM"
  echo "    bash scripts/monitoreo/reporte-diario.sh --setup-cron \"0 20\"   # 8:00 PM"
  echo ""
}

cmd_remove_cron() {
  local CRON_MARKER="# clientum-reporte-diario"
  crontab -l 2>/dev/null | grep -v "$CRON_MARKER" | crontab - 2>/dev/null || true
  echo -e "${GREEN}  ✅ Cron de reporte diario eliminado.${NC}"
}

cmd_status() {
  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  Clientum Reporte Diario — Config${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  local CRON_ENTRY
  CRON_ENTRY=$(crontab -l 2>/dev/null | grep "clientum-reporte-diario" || echo "")
  if [ -n "$CRON_ENTRY" ]; then
    local MIN HORA
    MIN=$(echo "$CRON_ENTRY" | awk '{print $1}')
    HORA=$(echo "$CRON_ENTRY" | awk '{print $2}')
    local HORA_F; HORA_F=$(printf "%02d:%02d" "$HORA" "$MIN")
    echo -e "  ${GREEN}✅ Cron:${NC} activo — todos los días a las $HORA_F"
  else
    echo -e "  ${YELLOW}—  Cron:${NC} no instalado"
    echo "     Instalar: bash scripts/monitoreo/reporte-diario.sh --setup-cron"
  fi
  echo ""
  echo -e "  ${CYAN}WhatsApp:${NC}  +${MONITOR_WA_NUMBER:-⚠️ no configurado}"
  echo -e "  ${CYAN}Instancia:${NC} $MONITOR_WA_INSTANCE"
  echo -e "  ${CYAN}API Key:${NC}   ${EVO_API_KEY:+configurada}${EVO_API_KEY:-⚠️ no encontrada}"

  if [ -f "$LAST_SENT_FILE" ]; then
    echo -e "  ${CYAN}Último envío:${NC} $(cat "$LAST_SENT_FILE")"
  else
    echo -e "  ${CYAN}Último envío:${NC} nunca"
  fi
  echo ""
  if [ -f "$LOG_FILE" ]; then
    echo -e "  ${CYAN}Últimas líneas del log:${NC}"
    echo ""
    tail -15 "$LOG_FILE" 2>/dev/null | sed 's/^/    /'
  fi
  echo ""
}

# ─── Construir el reporte ─────────────────────────────────────────────────────
build_reporte() {

  # ── Servicios ────────────────────────────────────────────────────────────────
  local SVCS_OK=() SVCS_DOWN=()
  svc_check() {
    local NAME="$1" LABEL="$2"
    local ST; ST=$(systemctl is-active "$NAME" 2>/dev/null || echo "inactivo")
    if [ "$ST" = "active" ]; then
      SVCS_OK+=("$LABEL")
    elif [ "$ST" != "no instalado" ] && [ "$ST" != "inactive" ]; then
      SVCS_DOWN+=("$LABEL")
    fi
    # "inactive" = instalado pero detenido intencionalmente → no reportar como fallo
  }
  svc_check "clientum-proxy"      "Proxy"
  svc_check "clientum-api"        "API"
  svc_check "clientum-vite"       "Vite"
  svc_check "evolution-api-lite"  "Evolution Lite"
  svc_check "evolution-api"       "Evolution"
  svc_check "cloudflared"         "Cloudflare Tunnel"
  svc_check "postgresql"          "PostgreSQL"
  svc_check "nginx"               "Nginx"

  local SVCS_LINE=""
  if [ ${#SVCS_DOWN[@]} -eq 0 ]; then
    SVCS_LINE="✅ Todos operativos (${#SVCS_OK[@]} servicios)"
  else
    SVCS_LINE="⚠️ Caídos: $(IFS=', '; echo "${SVCS_DOWN[*]}")"
  fi

  # ── Uptime del servidor ───────────────────────────────────────────────────────
  local UPTIME_STR
  UPTIME_STR=$(uptime -p 2>/dev/null | sed 's/^up //' || uptime | awk '{print $3, $4}' | sed 's/,//')

  # ── Datos de DB ───────────────────────────────────────────────────────────────
  local DB_OK=false
  local SESIONES="-" USUARIOS="-" SUSCRIPCIONES_ACTIVAS="-"
  local CONV_HOY="-" MENSAJES_HOY="-" PEDIDOS_HOY="-" TURNOS_HOY="-" PAGOS_HOY="-"

  if sudo -u postgres psql -lqt 2>/dev/null | cut -d\| -f1 | grep -qw "clientum"; then
    DB_OK=true
    _sql() { sudo -u postgres psql -d clientum -t -c "$1" 2>/dev/null | tr -d ' \n' || echo "-"; }

    SESIONES=$(_sql "SELECT COUNT(*) FROM sessions WHERE expires_at > NOW();")
    USUARIOS=$(_sql "SELECT COUNT(*) FROM users;")
    SUSCRIPCIONES_ACTIVAS=$(_sql "SELECT COUNT(*) FROM subscriptions WHERE status='active';")

    # Conversaciones del chatbot hoy (si la tabla existe)
    CONV_HOY=$(_sql "SELECT COUNT(*) FROM conversations WHERE DATE(created_at) = CURRENT_DATE;" 2>/dev/null || echo "-")
    MENSAJES_HOY=$(_sql "SELECT COUNT(*) FROM messages WHERE DATE(created_at) = CURRENT_DATE;" 2>/dev/null || echo "-")
    PEDIDOS_HOY=$(_sql "SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE;" 2>/dev/null || echo "-")
    TURNOS_HOY=$(_sql "SELECT COUNT(*) FROM appointments WHERE DATE(created_at) = CURRENT_DATE;" 2>/dev/null || echo "-")
    PAGOS_HOY=$(_sql "SELECT COUNT(*) FROM payment_events WHERE DATE(created_at) = CURRENT_DATE AND status='approved';" 2>/dev/null || echo "-")
  fi

  # ── Errores en la API (última hora) ───────────────────────────────────────────
  local ERRORES_API="-"
  ERRORES_API=$(journalctl -u clientum-api -p err --since "24 hours ago" --no-pager 2>/dev/null | grep -c "." || echo "0")

  # ── Disco ─────────────────────────────────────────────────────────────────────
  local DISK_PCT DISK_FREE DISK_EMOJI
  DISK_PCT=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
  DISK_FREE=$(df -h / | tail -1 | awk '{print $4}')
  DISK_EMOJI="✅"; [ "$DISK_PCT" -ge 80 ] && DISK_EMOJI="⚠️"; [ "$DISK_PCT" -ge 90 ] && DISK_EMOJI="🔴"

  # ── RAM ───────────────────────────────────────────────────────────────────────
  local MEM_FREE MEM_TOT MEM_PCT MEM_EMOJI
  MEM_FREE=$(free -m | awk '/^Mem:/ {print $4}')
  MEM_TOT=$(free -m | awk '/^Mem:/ {print $2}')
  MEM_PCT=$(( 100 - MEM_FREE * 100 / MEM_TOT ))
  MEM_EMOJI="✅"; [ "$MEM_PCT" -ge 80 ] && MEM_EMOJI="⚠️"; [ "$MEM_PCT" -ge 90 ] && MEM_EMOJI="🔴"

  # ── Backup ────────────────────────────────────────────────────────────────────
  local BACKUP_INFO="sin backups"
  local LATEST_BACKUP
  LATEST_BACKUP=$(ls -t /var/backups/clientum/clientum_*.sql.gz 2>/dev/null | head -1 || echo "")
  if [ -n "$LATEST_BACKUP" ]; then
    local AGE_H SIZE
    AGE_H=$(( ( $(date +%s) - $(stat -c %Y "$LATEST_BACKUP") ) / 3600 ))
    SIZE=$(du -sh "$LATEST_BACKUP" 2>/dev/null | cut -f1 || echo "?")
    local BCK_EMOJI="✅"; [ "$AGE_H" -gt 26 ] && BCK_EMOJI="⚠️"
    BACKUP_INFO="${BCK_EMOJI} hace ${AGE_H}h (${SIZE})"
  else
    BACKUP_INFO="⚠️ sin backups"
  fi

  # ── Dominio público ───────────────────────────────────────────────────────────
  local DOMINIO_INFO=""
  if [ -f "$HOME/.cloudflared/config.yml" ]; then
    local D
    D=$(grep -E '^\s+hostname:' "$HOME/.cloudflared/config.yml" 2>/dev/null | head -1 | awk '{print $2}')
    [ -n "$D" ] && DOMINIO_INFO="🌐 $D"
  fi

  # ── Hora de próximo reporte ───────────────────────────────────────────────────
  local PROX_REPORTE=""
  local CRON_ENTRY
  CRON_ENTRY=$(crontab -l 2>/dev/null | grep "clientum-reporte-diario" || echo "")
  if [ -n "$CRON_ENTRY" ]; then
    local C_MIN C_HORA
    C_MIN=$(echo "$CRON_ENTRY" | awk '{print $1}')
    C_HORA=$(echo "$CRON_ENTRY" | awk '{print $2}')
    PROX_REPORTE="Próximo: mañana a las $(printf '%02d:%02d' "$C_HORA" "$C_MIN")"
  fi

  # ── Armar mensaje ─────────────────────────────────────────────────────────────
  local SEPARADOR="─────────────────────"

  REPORTE="📊 *Clientum — Reporte Diario*
${FECHA_LEGIBLE} · ${HORA_LEGIBLE}
${SEPARADOR}

🖥️ *Servidor*
• Uptime: ${UPTIME_STR}
• Servicios: ${SVCS_LINE}
• Errores API (24h): ${ERRORES_API}

${SEPARADOR}
👥 *Usuarios y planes*
• Usuarios registrados: ${USUARIOS}
• Suscripciones activas: ${SUSCRIPCIONES_ACTIVAS}
• Sesiones abiertas: ${SESIONES}

${SEPARADOR}
📱 *Actividad de hoy*
• Conversaciones: ${CONV_HOY}
• Mensajes: ${MENSAJES_HOY}
• Pedidos: ${PEDIDOS_HOY}
• Turnos agendados: ${TURNOS_HOY}
• Pagos aprobados: ${PAGOS_HOY}

${SEPARADOR}
💾 *Recursos*
• ${DISK_EMOJI} Disco: ${DISK_PCT}% usado (${DISK_FREE} libre)
• ${MEM_EMOJI} RAM: ${MEM_PCT}% usada (${MEM_FREE}MB libre)
• 🗄️ Backup: ${BACKUP_INFO}
${DOMINIO_INFO:+• ${DOMINIO_INFO}}

${SEPARADOR}
${PROX_REPORTE:+⏰ ${PROX_REPORTE}}"

  echo "$REPORTE"
}

# ─── Parsear subcomandos ──────────────────────────────────────────────────────
case "${1:-}" in
  --setup-cron)   cmd_setup_cron "${2:-}"; exit 0 ;;
  --remove-cron)  cmd_remove_cron; exit 0 ;;
  --status)       cmd_status; exit 0 ;;
  --preview)
    echo ""
    echo -e "${BOLD}  Generando reporte (sin enviar)...${NC}"
    echo ""
    build_reporte
    echo ""
    exit 0
    ;;
esac

# ─── Enviar el reporte ────────────────────────────────────────────────────────
log ""
log "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
log "${BOLD}  Clientum Reporte Diario  [$TIMESTAMP]${NC}"
log "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
log ""
log "  Recopilando datos del servidor..."

REPORTE=$(build_reporte)

log "  Datos recopilados. Enviando por WhatsApp..."
log ""

send_whatsapp "$REPORTE"

log ""
