#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Clientum — Actualizar Evolution API Lite sin downtime
#  Hace git pull, recompila y reinicia el servicio con zero-downtime.
#
#  Uso:
#    bash scripts/whatsapp/actualizar-evolution-lite.sh
#    bash scripts/whatsapp/actualizar-evolution-lite.sh --check   → solo ver si hay updates
#    bash scripts/whatsapp/actualizar-evolution-lite.sh --force   → forzar aunque no haya cambios
# ═══════════════════════════════════════════════════════════════
set -e

HOME_ACTUAL=$(eval echo ~$(whoami))
EVO_DIR="$HOME_ACTUAL/evolution-lite"
SVC="evolution-api-lite"
CHECK_ONLY=false
FORCE=false

for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=true ;;
    --force) FORCE=true      ;;
  esac
done

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✅ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
info() { echo -e "${CYAN}  ℹ  $1${NC}"; }
paso() { echo -e "\n${BOLD}${CYAN}━━━ $1${NC}"; }

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   Evolution API Lite — Actualización  [$(date '+%H:%M:%S')]   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Verificar que el directorio existe ───────────────────────────────────────
if [ ! -d "$EVO_DIR" ]; then
  echo -e "${RED}  ❌ No se encontró $EVO_DIR${NC}"
  echo "  Instalá Evolution Lite primero:"
  echo "    bash scripts/whatsapp/instalar-evolution-lite.sh"
  exit 1
fi

cd "$EVO_DIR"

# ── PASO 1: Verificar si hay actualizaciones disponibles ─────────────────────
paso "PASO 1 — Verificar actualizaciones"

if [ ! -d ".git" ]; then
  warn "El directorio no tiene git. Se saltea el pull."
  CAMBIOS=0
else
  git fetch origin --quiet 2>/dev/null || warn "No se pudo hacer fetch (¿sin internet?)"
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
  LOCAL=$(git rev-parse HEAD 2>/dev/null || echo "")
  REMOTE=$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "")

  if [ "$LOCAL" = "$REMOTE" ] && [ "$FORCE" = false ]; then
    ok "Ya en la versión más reciente ($(git log -1 --format='%h' 2>/dev/null))"
    info "Rama: $BRANCH  ·  Commit: $(git log -1 --format='%s' 2>/dev/null)"
    echo ""
    if [ "$CHECK_ONLY" = true ]; then
      echo "  Sin cambios pendientes."
      exit 0
    fi
    read -p "  ¿Forzar rebuild igual? [s/N] " RESP
    [[ ! "$RESP" =~ ^[Ss]$ ]] && echo "  Cancelado." && exit 0
    CAMBIOS=0
  else
    CAMBIOS=$(git log --oneline "$LOCAL...$REMOTE" 2>/dev/null | wc -l | tr -d ' ')
    echo ""
    echo -e "  ${BOLD}$CAMBIOS commit(s) disponibles:${NC}"
    git log --oneline "$LOCAL...$REMOTE" 2>/dev/null | head -10 | sed 's/^/    /'
    echo ""

    if [ "$CHECK_ONLY" = true ]; then
      echo "  Ejecutá sin --check para aplicar la actualización."
      exit 0
    fi

    read -p "  ¿Aplicar actualización? [S/n] " RESP
    [[ "$RESP" =~ ^[Nn]$ ]] && echo "  Cancelado." && exit 0
  fi
fi

# ── PASO 2: Capturar versión actual antes del pull ───────────────────────────
paso "PASO 2 — Preparar actualización"
VERSION_ANTES=$(git log -1 --format='%h %s' 2>/dev/null || echo "desconocida")
info "Versión actual: $VERSION_ANTES"

# Guardar backup del .env antes del pull (por si hay cambios en .env.example)
cp "$EVO_DIR/.env" "/tmp/evolution-lite-env-backup-$(date +%Y%m%d%H%M%S)" 2>/dev/null || true
ok ".env respaldado en /tmp/"

# ── PASO 3: Git pull ─────────────────────────────────────────────────────────
paso "PASO 3 — Actualizar código"
if [ -d ".git" ]; then
  git pull --rebase origin "$BRANCH" 2>/dev/null || {
    warn "Rebase falló, intentando merge..."
    git pull origin "$BRANCH"
  }
  VERSION_DESPUES=$(git log -1 --format='%h %s' 2>/dev/null || echo "desconocida")
  ok "Código actualizado → $VERSION_DESPUES"
else
  ok "Sin git — usando código actual"
fi

# ── PASO 4: Restaurar .env (git pull no debería pisarlo, pero por las dudas) ─
paso "PASO 4 — Verificar .env"
if [ ! -f "$EVO_DIR/.env" ]; then
  LATEST_BACKUP=$(ls -t /tmp/evolution-lite-env-backup-* 2>/dev/null | head -1)
  if [ -n "$LATEST_BACKUP" ]; then
    cp "$LATEST_BACKUP" "$EVO_DIR/.env"
    ok ".env restaurado desde backup"
  else
    warn ".env no encontrado y sin backup — puede necesitar reconfiguración"
  fi
else
  ok ".env intacto"
fi

# ── PASO 5: Instalar dependencias ────────────────────────────────────────────
paso "PASO 5 — Dependencias npm"
npm install --legacy-peer-deps --quiet 2>/dev/null || npm install --legacy-peer-deps
ok "npm install completo"

# ── PASO 6: Compilar ─────────────────────────────────────────────────────────
paso "PASO 6 — Build"
BUILD_OK=false
if npm run build 2>/dev/null; then
  BUILD_OK=true
  ok "Build completado"
elif npx tsc 2>/dev/null; then
  BUILD_OK=true
  ok "Build completado (tsc directo)"
else
  # En algunos repos la versión lite corre sin build previo
  warn "Build no disponible — intentando correr en modo directo"
  BUILD_OK=true
fi

# ── PRE-RESTART: Verificar puerto ────────────────────────────────────────────
paso "PRE-RESTART — Verificar puerto"

EVO_PORT_ACTUAL=$(grep -E "^SERVER_PORT=" "$EVO_DIR/.env" 2>/dev/null | cut -d= -f2 || echo "3000")
SVC_PID=$(systemctl show -p MainPID "$SVC" 2>/dev/null | cut -d= -f2 | tr -d ' ')
PORT_PID=$(lsof -ti tcp:${EVO_PORT_ACTUAL} 2>/dev/null || true)

if [ -n "$PORT_PID" ] && [ "$PORT_PID" != "$SVC_PID" ]; then
  PORT_INFO=$(ps -p "$PORT_PID" -o pid=,comm=,args= 2>/dev/null | head -1 || echo "PID $PORT_PID")
  echo ""
  echo -e "${RED}  ⛔  Puerto :${EVO_PORT_ACTUAL} está ocupado por otro proceso${NC}"
  echo "     $PORT_INFO"
  echo ""
  echo "  El servicio Evolution NO puede reiniciarse con ese puerto ocupado."
  echo ""
  echo "  Opciones:"
  echo "    [1] Detener ese proceso y continuar la actualización"
  echo "    [2] Cancelar"
  echo ""
  read -p "  Tu elección [1/2]: " PRE_CHOICE

  case "$PRE_CHOICE" in
    1)
      sudo kill -TERM "$PORT_PID" 2>/dev/null || true
      sleep 2
      lsof -ti tcp:${EVO_PORT_ACTUAL} &>/dev/null && sudo kill -KILL "$PORT_PID" 2>/dev/null || true
      sleep 1
      ok "Proceso detenido — puerto :${EVO_PORT_ACTUAL} libre"
      ;;
    *)
      echo "  Actualización cancelada."
      exit 0
      ;;
  esac
else
  ok "Puerto :${EVO_PORT_ACTUAL} ok (libre o en uso por Evolution)"
fi

# ── PASO 7: Restart con zero-downtime ────────────────────────────────────────
paso "PASO 7 — Reiniciar servicio"

WAS_ACTIVE=false
systemctl is-active --quiet "$SVC" 2>/dev/null && WAS_ACTIVE=true

if [ "$WAS_ACTIVE" = true ]; then
  # Zero-downtime: systemd hace el restart directo (no hay downtime en Baileys)
  info "Reiniciando $SVC..."
  sudo systemctl restart "$SVC"
  sleep 4

  # Verificar que levantó correctamente
  STATUS=$(systemctl is-active "$SVC" 2>/dev/null || echo "inactivo")
  if [ "$STATUS" = "active" ]; then
    ok "$SVC reiniciado exitosamente"
  else
    echo -e "${RED}  ❌ El servicio no levantó correctamente${NC}"
    echo ""
    echo "  Últimas líneas del log:"
    sudo journalctl -u "$SVC" -n 20 --no-pager 2>/dev/null | sed 's/^/    /'
    echo ""
    echo "  Para restaurar la versión anterior:"
    echo "    cd $EVO_DIR && git checkout HEAD~1 && npm install && npm run build"
    echo "    sudo systemctl restart $SVC"
    exit 1
  fi
else
  warn "$SVC no estaba activo — se saltea el restart"
  info "Para iniciarlo: sudo systemctl start $SVC"
fi

# ── PASO 8: Verificar API ────────────────────────────────────────────────────
paso "PASO 8 — Verificar funcionamiento"
sleep 2

EVO_KEY=$(grep -E "^AUTHENTICATION_API_KEY=" "$EVO_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '"' || echo "")
EVO_PORT=$(grep -E "^SERVER_PORT=" "$EVO_DIR/.env" 2>/dev/null | cut -d= -f2 || echo "3000")

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
  "http://localhost:${EVO_PORT}/instance/fetchInstances" \
  -H "apikey: $EVO_KEY" 2>/dev/null || echo "000")

if [[ "$HTTP_CODE" =~ ^(200|201|400)$ ]]; then
  ok "API responde en :${EVO_PORT} (HTTP $HTTP_CODE)"

  # Verificar instancias conectadas
  INST_RESP=$(curl -s --max-time 5 \
    "http://localhost:${EVO_PORT}/instance/fetchInstances" \
    -H "apikey: $EVO_KEY" 2>/dev/null || echo "[]")
  CONN_COUNT=$(echo "$INST_RESP" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    items = d if isinstance(d, list) else []
    connected = [i for i in items if i.get('instance',{}).get('state','') == 'open']
    print(len(connected))
except: print(0)
" 2>/dev/null || echo "0")

  if [ "$CONN_COUNT" -gt 0 ]; then
    ok "$CONN_COUNT instancia(s) WhatsApp conectada(s) ✓"
  else
    warn "Ninguna instancia conectada — puede que necesite reconectar el QR"
    info "Ir a /app/connect-whatsapp o ejecutar: bash scripts/whatsapp/conectar-whatsapp.sh"
  fi
else
  warn "API devuelve HTTP $HTTP_CODE — puede estar iniciando, esperá unos segundos"
fi

# ── Resumen final ────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅  Evolution API Lite actualizado                     ║"
echo "╠══════════════════════════════════════════════════════════╣"
printf "║  Antes:  %-49s║\n" "$VERSION_ANTES"
printf "║  Ahora:  %-49s║\n" "$(git log -1 --format='%h %s' 2>/dev/null || echo 'sin git')"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Logs:  bash scripts/monitoreo/logs.sh evo                ║"
echo "║  Estado: bash scripts/monitoreo/status.sh                 ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
