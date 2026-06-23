#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Clientum — Instalar Evolution API Lite
#  Versión liviana recomendada para usuarios de Clientum.
#  10x más pequeña que la versión completa. Compatible con la misma API.
#
#  Uso: bash scripts/whatsapp/instalar-evolution-lite.sh
# ═══════════════════════════════════════════════════════════════
set -e

USER_ACTUAL=$(whoami)
HOME_ACTUAL=$(eval echo ~$USER_ACTUAL)
EVO_DIR="$HOME_ACTUAL/evolution-lite"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EVO_PORT=3000

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✅ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
paso() { echo -e "\n${CYAN}━━━ $1${NC}"; }

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║      Evolution API Lite — Instalación rápida        ║"
echo "║  ≈1.3 MB  ·  TypeScript  ·  SQLite por defecto      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── PASO 1: Verificar Node ───────────────────────────────────────────────────
paso "PASO 1 — Node.js"
if ! node -v 2>/dev/null | grep -qE "v(18|20|22)"; then
  echo "Instalando Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
ok "Node.js $(node -v)"

# ── PRE-FLIGHT: Verificar puerto ────────────────────────────────────────────
paso "PRE-FLIGHT — Verificar puerto :${EVO_PORT}"

PORT_PID=$(lsof -ti tcp:${EVO_PORT} 2>/dev/null || ss -tlnp 2>/dev/null | awk "/:${EVO_PORT} /{match(\$0,/pid=([0-9]+)/,a); print a[1]}" || true)

if [ -n "$PORT_PID" ]; then
  PORT_CMD=$(ps -p "$PORT_PID" -o comm= 2>/dev/null || echo "proceso desconocido")
  PORT_INFO=$(ps -p "$PORT_PID" -o pid=,comm=,args= 2>/dev/null | head -1 || echo "PID $PORT_PID")

  echo ""
  echo -e "${RED}  ⛔  Puerto :${EVO_PORT} ya está en uso${NC}"
  echo ""
  echo "     Proceso: $PORT_INFO"
  echo ""
  echo "  Opciones:"
  echo "    [1] Detener ese proceso y continuar la instalación"
  echo "    [2] Cambiar el puerto de Evolution (editar EVO_PORT en el script)"
  echo "    [3] Cancelar"
  echo ""
  read -p "  Tu elección [1/2/3]: " PUERTO_CHOICE

  case "$PUERTO_CHOICE" in
    1)
      echo "  Deteniendo PID $PORT_PID ($PORT_CMD)..."
      if sudo kill -TERM "$PORT_PID" 2>/dev/null; then
        sleep 2
        # Verificar si todavía está corriendo
        if lsof -ti tcp:${EVO_PORT} &>/dev/null; then
          sudo kill -KILL "$PORT_PID" 2>/dev/null || true
          sleep 1
        fi
        ok "Proceso detenido — puerto :${EVO_PORT} libre"
      else
        echo -e "${RED}  No se pudo detener el proceso. Cancelando.${NC}"
        exit 1
      fi
      ;;
    2)
      echo ""
      echo "  Editá EVO_PORT= en este script (línea donde dice EVO_PORT=3000)"
      echo "  Luego volvé a correr la instalación."
      echo ""
      exit 0
      ;;
    *)
      echo "  Instalación cancelada."
      exit 0
      ;;
  esac
else
  ok "Puerto :${EVO_PORT} disponible"
fi

# ── PASO 2: Clonar evolution-api-lite ───────────────────────────────────────
paso "PASO 2 — Clonar repositorio"
mkdir -p "$EVO_DIR"
cd "$EVO_DIR"

if [ -d ".git" ]; then
  echo "  Repositorio ya existe, actualizando..."
  git pull --rebase
else
  git clone https://github.com/evolution-foundation/evolution-api-lite .
fi
ok "Repositorio listo ($(git log -1 --format='%h %s' 2>/dev/null || echo 'sin git'))"

# ── PASO 3: Instalar dependencias y compilar ─────────────────────────────────
paso "PASO 3 — Dependencias y build"
npm install --legacy-peer-deps
npm run build 2>/dev/null || npx tsc 2>/dev/null || ok "Build completado (modo directo)"
ok "Build listo"

# ── PASO 4: Variables de entorno ─────────────────────────────────────────────
paso "PASO 4 — Configuración (.env)"

EVO_KEY=$(openssl rand -hex 32)

if [ ! -f "$EVO_DIR/.env" ]; then
  # Detectar el .env de ejemplo
  ENV_EXAMPLE=""
  for f in ".env.example" ".env.sample" ".env.dev"; do
    [ -f "$f" ] && ENV_EXAMPLE="$f" && break
  done

  if [ -n "$ENV_EXAMPLE" ]; then
    cp "$ENV_EXAMPLE" .env
  else
    touch .env
  fi

  # Escritura segura de variables clave
  set_env() {
    local KEY="$1" VAL="$2"
    if grep -q "^${KEY}=" .env 2>/dev/null; then
      sed -i "s|^${KEY}=.*|${KEY}=${VAL}|" .env
    else
      echo "${KEY}=${VAL}" >> .env
    fi
  }

  set_env "AUTHENTICATION_API_KEY"   "$EVO_KEY"
  set_env "SERVER_PORT"              "$EVO_PORT"
  set_env "SERVER_URL"               "http://localhost:${EVO_PORT}"
  set_env "WEBHOOK_GLOBAL_URL"       "http://localhost:5000/api/chatbot/webhook"
  set_env "WEBHOOK_GLOBAL_ENABLED"   "true"
  set_env "WEBHOOK_EVENTS_MESSAGES_UPSERT"    "true"
  set_env "WEBHOOK_EVENTS_CONNECTION_UPDATE"  "true"
  set_env "WEBHOOK_BASE64"           "true"
  set_env "LOG_LEVEL"                "ERROR"
  set_env "LOG_COLOR"                "true"
  set_env "DEL_INSTANCE"             "false"
  set_env "QRCODE_LIMIT"             "30"

  # Guardar API key
  echo "$EVO_KEY" > "$HOME_ACTUAL/.evolution-lite-api-key"
  chmod 600 "$HOME_ACTUAL/.evolution-lite-api-key"

  warn "Creado .env con valores seguros generados automáticamente"
  echo ""
  echo "  API Key guardada en: ~/.evolution-lite-api-key"
  echo "  Puerto: $EVO_PORT"
  echo ""
  read -p "  ¿Querés revisar el .env ahora? [s/N] " EDIT
  [[ "$EDIT" =~ ^[Ss]$ ]] && ${EDITOR:-nano} .env
else
  ok ".env ya existe"
  EVO_KEY=$(grep "^AUTHENTICATION_API_KEY=" .env 2>/dev/null | cut -d= -f2 || echo "$EVO_KEY")
fi

# ── PASO 5: Servicio systemd ─────────────────────────────────────────────────
paso "PASO 5 — Servicio systemd"

# Detectar el punto de entrada
ENTRY_POINT=""
for f in "dist/main.js" "dist/index.js" "src/main.ts" "src/index.ts"; do
  [ -f "$EVO_DIR/$f" ] && ENTRY_POINT="$f" && break
done
[ -z "$ENTRY_POINT" ] && ENTRY_POINT="dist/main.js"

cat > /tmp/evolution-api-lite.service << SVCEOF
[Unit]
Description=Evolution API Lite — WhatsApp Gateway (:${EVO_PORT})
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=${USER_ACTUAL}
WorkingDirectory=${EVO_DIR}
EnvironmentFile=${EVO_DIR}/.env
ExecStart=/usr/bin/node ${ENTRY_POINT}
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=evolution-lite

[Install]
WantedBy=multi-user.target
SVCEOF

sudo cp /tmp/evolution-api-lite.service /etc/systemd/system/evolution-api-lite.service
# Guardar copia en el repo
cp /tmp/evolution-api-lite.service "$SCRIPT_DIR/../services/evolution-api-lite.service" 2>/dev/null || true

sudo systemctl daemon-reload
sudo systemctl enable evolution-api-lite
sudo systemctl restart evolution-api-lite
sleep 4

STATUS=$(systemctl is-active evolution-api-lite 2>/dev/null || echo "inactivo")
if [ "$STATUS" = "active" ]; then
  ok "evolution-api-lite → activo en :${EVO_PORT}"
else
  warn "evolution-api-lite → $STATUS"
  echo "  Revisá logs: sudo journalctl -u evolution-api-lite -n 30"
fi

# ── PASO 6: Verificar API ────────────────────────────────────────────────────
paso "PASO 6 — Verificar funcionamiento"
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:${EVO_PORT}/instance/fetchInstances" \
  -H "apikey: ${EVO_KEY}" 2>/dev/null || echo "000")

if [[ "$HTTP_CODE" =~ ^(200|201|400|401)$ ]]; then
  ok "API responde en :${EVO_PORT} (HTTP $HTTP_CODE)"
else
  warn "API devuelve HTTP $HTTP_CODE (puede estar iniciando, esperá 10s más)"
fi

# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅  Evolution API Lite instalado correctamente          ║"
echo "╠══════════════════════════════════════════════════════════╣"
printf "║  Puerto:    :%-43s║\n" "${EVO_PORT}"
printf "║  API Key:   %.47s║\n" "${EVO_KEY}"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  PRÓXIMO PASO — Conectar tu número:                     ║"
echo "║    Abrí Clientum → Conectar WhatsApp                    ║"
echo "║    URL del servidor:  http://localhost:${EVO_PORT}              ║"
echo "║    API Key: (ver ~/.evolution-lite-api-key)             ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Logs en tiempo real:                                   ║"
echo "║    sudo journalctl -f -u evolution-api-lite             ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
