#!/bin/bash
# ─── Clientum — Health Check Completo ────────────────────────────────────────
set -eo pipefail
# Nota: no usamos -u (nounset) para compatibilidad con arrays vacíos en bash < 4.4

CLIENTUM="${CLIENTUM:-$HOME/clientum}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/clientum}"
NOTIFY_EMAIL="${NOTIFY_EMAIL:-}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✅ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠️  $1${NC}"; WARNINGS+=("$1"); }
fail() { echo -e "${RED}  ❌ $1${NC}"; FAILURES+=("$1"); }

WARNINGS=()
FAILURES=()
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo ""
echo "══════════════════════════════════════════════"
echo "  Clientum — Health Check  [$TIMESTAMP]"
echo "══════════════════════════════════════════════"

# ─── 1. Servicios systemd ─────────────────────────────────────────────────────
echo ""
echo "── Servicios ──"
for SVC in clientum-api clientum-vite clientum-proxy cloudflared evolution-api; do
  STATUS=$(systemctl is-active "$SVC" 2>/dev/null || echo "inactivo")
  if [ "$STATUS" = "active" ]; then
    UPTIME=$(systemctl show "$SVC" --property=ActiveEnterTimestamp --value 2>/dev/null | sed 's/ [A-Z]*$//')
    ok "$SVC → activo (desde $UPTIME)"
  else
    fail "$SVC → $STATUS"
  fi
done

# ─── 2. Conectividad local ────────────────────────────────────────────────────
echo ""
echo "── Conectividad local ──"

# Leer puerto del .env si existe, o usar defaults
API_PORT=8080
PROXY_PORT=5000
VITE_PORT=21496
EVOLUTION_PORT=3000

if [ -f "$CLIENTUM/.env" ]; then
  API_PORT=$(grep -E '^API_PORT=' "$CLIENTUM/.env" 2>/dev/null | cut -d= -f2 || echo "8080")
  PROXY_PORT=$(grep -E '^PROXY_PORT=' "$CLIENTUM/.env" 2>/dev/null | cut -d= -f2 || echo "5000")
  VITE_PORT=$(grep -E '^VITE_PORT=' "$CLIENTUM/.env" 2>/dev/null | cut -d= -f2 || echo "21496")
  EVO_ENV_PORT=$(grep -E '^EVO_PORT=' "$CLIENTUM/.env" 2>/dev/null | cut -d= -f2 || echo "")
  [ -n "$EVO_ENV_PORT" ] && EVOLUTION_PORT="$EVO_ENV_PORT"
fi
# También leer desde el .env de Evolution si existe
if [ -f "$HOME/evolution-lite/.env" ]; then
  EVO_SRV=$(grep -E '^SERVER_PORT=' "$HOME/evolution-lite/.env" 2>/dev/null | cut -d= -f2 || echo "")
  [ -n "$EVO_SRV" ] && EVOLUTION_PORT="$EVO_SRV"
fi

for PORT_DESC in "${PROXY_PORT}:Proxy" "${API_PORT}:API" "${VITE_PORT}:Vite" "${EVOLUTION_PORT}:Evolution"; do
  PORT=$(echo "$PORT_DESC" | cut -d: -f1)
  DESC=$(echo "$PORT_DESC" | cut -d: -f2)
  if curl -sf "http://localhost:$PORT" > /dev/null 2>&1 || \
     curl -sf "http://localhost:$PORT/api/health" > /dev/null 2>&1; then
    ok "$DESC :$PORT → responde"
  else
    warn "$DESC :$PORT → no responde (puede ser normal si el servicio está iniciando)"
  fi
done

# ─── 3. Base de datos ─────────────────────────────────────────────────────────
echo ""
echo "── Base de datos ──"
if sudo -u postgres psql -c "\l clientum" 2>/dev/null | grep -q clientum; then
  ROW_COUNT=$(sudo -u postgres psql -d clientum -c "SELECT COUNT(*) FROM sessions;" -t 2>/dev/null | tr -d ' ' || echo "?")
  ok "PostgreSQL → DB clientum accesible (sessions: $ROW_COUNT)"
else
  fail "PostgreSQL → no se puede conectar a la DB clientum"
fi

# ─── 4. Tunnel Cloudflare ─────────────────────────────────────────────────────
echo ""
echo "── Cloudflare Tunnel ──"
# Leer dominio desde config si existe
DOMINIO="clientum.com.ar"
if [ -f "$HOME/.cloudflared/config.yml" ]; then
  DOMINIO_CFG=$(grep -E '^\s+hostname:' "$HOME/.cloudflared/config.yml" 2>/dev/null | head -1 | awk '{print $2}' || echo "")
  [ -n "$DOMINIO_CFG" ] && DOMINIO="$DOMINIO_CFG"
fi

if systemctl is-active cloudflared > /dev/null 2>&1; then
  if curl -sf --max-time 10 "https://$DOMINIO/api/health" > /dev/null 2>&1; then
    ok "Tunnel → $DOMINIO responde desde internet"
  else
    warn "Tunnel → servicio activo pero $DOMINIO no responde (puede tardar unos segundos)"
  fi
else
  warn "Tunnel → cloudflared no está activo"
fi

# ─── 5. Backups ───────────────────────────────────────────────────────────────
echo ""
echo "── Backups ──"
if [ -d "$BACKUP_DIR" ]; then
  LATEST=$(ls -t "$BACKUP_DIR"/clientum_*.sql.gz 2>/dev/null | head -1)
  if [ -n "$LATEST" ]; then
    AGE_HOURS=$(( ( $(date +%s) - $(stat -c %Y "$LATEST") ) / 3600 ))
    SIZE=$(du -sh "$LATEST" | cut -f1)
    if [ "$AGE_HOURS" -lt 26 ]; then
      ok "Último backup: $(basename "$LATEST") hace ${AGE_HOURS}h ($SIZE)"
    else
      warn "Último backup tiene ${AGE_HOURS}h de antigüedad — cron puede no estar corriendo"
    fi
    COUNT=$(ls "$BACKUP_DIR"/clientum_*.sql.gz 2>/dev/null | wc -l)
    ok "Total backups guardados: $COUNT"
  else
    warn "No hay backups en $BACKUP_DIR — ejecutá backup-db.sh"
  fi
else
  warn "Directorio $BACKUP_DIR no existe"
fi

# ─── 6. Espacio en disco ──────────────────────────────────────────────────────
echo ""
echo "── Disco ──"
DISK_USE=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
DISK_FREE=$(df -h / | tail -1 | awk '{print $4}')
if [ "$DISK_USE" -lt 80 ]; then
  ok "Disco: ${DISK_USE}% usado, ${DISK_FREE} libre"
elif [ "$DISK_USE" -lt 90 ]; then
  warn "Disco: ${DISK_USE}% usado — quedan solo ${DISK_FREE}"
else
  fail "Disco: ${DISK_USE}% usado — ¡CRÍTICO! Solo ${DISK_FREE} libre"
fi

# ─── 7. Memoria RAM ───────────────────────────────────────────────────────────
echo ""
echo "── Memoria ──"
MEM_FREE=$(free -m | awk '/^Mem:/ {print $4}')
MEM_TOTAL=$(free -m | awk '/^Mem:/ {print $2}')
MEM_USE=$(( 100 - MEM_FREE * 100 / MEM_TOTAL ))
if [ "$MEM_USE" -lt 85 ]; then
  ok "RAM: ${MEM_USE}% usada (${MEM_FREE}MB libres de ${MEM_TOTAL}MB)"
else
  warn "RAM: ${MEM_USE}% usada — solo ${MEM_FREE}MB libres"
fi

# ─── 8. Logs de errores recientes ────────────────────────────────────────────
echo ""
echo "── Errores recientes (última hora) ──"
ERR_COUNT=$(journalctl -u clientum-api -p err --since "1 hour ago" --no-pager 2>/dev/null | grep -c "." || echo 0)
if [ "$ERR_COUNT" -eq 0 ]; then
  ok "Sin errores en clientum-api en la última hora"
else
  warn "$ERR_COUNT error(es) en clientum-api en la última hora"
  journalctl -u clientum-api -p err --since "1 hour ago" --no-pager 2>/dev/null | tail -5 | sed 's/^/    /'
fi

# ─── Resumen ──────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
TOTAL_FAIL=${#FAILURES[@]}
TOTAL_WARN=${#WARNINGS[@]}

if [ $TOTAL_FAIL -eq 0 ] && [ $TOTAL_WARN -eq 0 ]; then
  echo -e "${GREEN}  ✅ Todo OK — sistema saludable${NC}"
elif [ $TOTAL_FAIL -eq 0 ]; then
  echo -e "${YELLOW}  ⚠️  $TOTAL_WARN advertencia(s) — revisar arriba${NC}"
else
  echo -e "${RED}  ❌ $TOTAL_FAIL fallo(s), $TOTAL_WARN advertencia(s) — acción requerida${NC}"
fi
echo "══════════════════════════════════════════════"
echo ""

# ─── Línea machine-readable para cron / alertas ───────────────────────────────
if [ $TOTAL_FAIL -gt 0 ]; then
  HC_STATUS="FAIL"
elif [ $TOTAL_WARN -gt 0 ]; then
  HC_STATUS="WARN"
else
  HC_STATUS="PASS"
fi

# Formato parseable: grep "^CLIENTUM_HEALTH" en los logs
FAIL_DETAIL=""
WARN_DETAIL=""
[ ${#FAILURES[@]} -gt 0 ] && FAIL_DETAIL=" | FALLOS: $(IFS='; '; echo "${FAILURES[*]}")"
[ ${#WARNINGS[@]} -gt 0 ] && WARN_DETAIL=" | AVISOS: $(IFS='; '; echo "${WARNINGS[*]}")"

echo ""
echo "CLIENTUM_HEALTH: $HC_STATUS  failures=$TOTAL_FAIL warnings=$TOTAL_WARN  [$TIMESTAMP]${FAIL_DETAIL}${WARN_DETAIL}"

# ─── Notificación si hay fallos ───────────────────────────────────────────────
if [ $TOTAL_FAIL -gt 0 ] && [ -n "$NOTIFY_EMAIL" ]; then
  SUBJECT="[Clientum] ❌ Health Check FALLÓ — $TOTAL_FAIL error(s)"
  BODY="Health check ejecutado el $TIMESTAMP\n\nFALLOS:\n$(printf '%s\n' "${FAILURES[@]}")\n\nADVERTENCIAS:\n$(printf '%s\n' "${WARNINGS[@]}")"
  echo -e "$BODY" | mail -s "$SUBJECT" "$NOTIFY_EMAIL" 2>/dev/null || true
fi

# ─── Notificación WhatsApp si hay fallos y Evolution está activo ──────────────
if [ $TOTAL_FAIL -gt 0 ]; then
  WA_NUMBER="${MONITOR_WA_NUMBER:-}"
  WA_INSTANCE="${MONITOR_WA_INSTANCE:-}"
  EVO_KEY_FILE="$HOME/.evolution-lite-api-key"
  EVO_KEY="${MONITOR_EVO_KEY:-$(cat "$EVO_KEY_FILE" 2>/dev/null || echo "")}"
  EVO_URL="${MONITOR_EVO_URL:-http://localhost:3000}"

  if [ -n "$WA_NUMBER" ] && [ -n "$WA_INSTANCE" ] && [ -n "$EVO_KEY" ]; then
    WA_MSG="🚨 *Clientum Health Check — $HC_STATUS*%0A"
    WA_MSG+="$TOTAL_FAIL fallo(s), $TOTAL_WARN aviso(s)%0A"
    WA_MSG+="$(date '+%d/%m/%Y %H:%M')%0A"
    [ ${#FAILURES[@]} -gt 0 ] && WA_MSG+="❌ $(IFS=$'\\n'; printf '%s' "${FAILURES[*]}" | head -3 | tr '\n' '|' | sed 's/|$//;s/|/%0A❌ /g')"

    curl -s -X POST "$EVO_URL/message/sendText/$WA_INSTANCE" \
      -H "Content-Type: application/json" \
      -H "apikey: $EVO_KEY" \
      -d "{\"number\":\"$WA_NUMBER\",\"text\":\"$(echo -e "$WA_MSG" | sed 's/%0A/\\n/g')\"}" \
      --max-time 5 > /dev/null 2>&1 || true
  fi
fi

# Exit code: 0=ok, 1=warnings, 2=failures
[ $TOTAL_FAIL -gt 0 ] && exit 2
[ $TOTAL_WARN -gt 0 ] && exit 1
exit 0
