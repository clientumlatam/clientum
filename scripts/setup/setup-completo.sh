#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Clientum — Setup completo desde cero
#  Instala y arranca: PostgreSQL, Clientum, Evolution API, Cloudflare Tunnel
#
#  Uso:
#    1. Descomprimí el ZIP del proyecto en ~/clientum
#    2. Copiá este script dentro de ~/clientum/
#    3. bash setup-completo.sh
# ═══════════════════════════════════════════════════════════════
set -e

USER_ACTUAL=$(whoami)
HOME_ACTUAL=$(eval echo ~$USER_ACTUAL)
CLIENTUM="$HOME_ACTUAL/clientum"
EVOLUTION="$HOME_ACTUAL/evolution"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
paso() { echo -e "\n${YELLOW}━━━ $1 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# ────────────────────────────────────────────────────────────────
paso "PASO 1 — Requisitos del sistema"
# ────────────────────────────────────────────────────────────────

# Verificar que el proyecto existe
if [ ! -d "$CLIENTUM" ]; then
  echo -e "${RED}❌ No se encontró el directorio $CLIENTUM${NC}"
  echo "   Descomprimí el ZIP del proyecto en ~/clientum primero."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_EXAMPLE="$SCRIPT_DIR/../.env.example"

if [ ! -f "$ENV_EXAMPLE" ]; then
  echo -e "${RED}❌ No se encontró $ENV_EXAMPLE${NC}"
  echo "   Verificá que el ZIP se descomprimió correctamente."
  exit 1
fi

# Node.js 20+ (acepta v20, v22, v24+)
NODE_MAJOR=$(node -v 2>/dev/null | grep -oP '(?<=v)\d+' | head -1)
if [ -z "$NODE_MAJOR" ] || [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Instalando Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
ok "Node.js $(node -v)"

# pnpm — pinear a v10 para compatibilidad con pnpm-lock.yaml
PNPM_MAJOR=$(pnpm -v 2>/dev/null | grep -oP '^\d+' || echo "0")
if [ "$PNPM_MAJOR" != "10" ]; then
  echo "Instalando pnpm@10 (requerido por el lockfile del proyecto)..."
  npm install -g pnpm@10
fi
ok "pnpm $(pnpm -v)"

# PostgreSQL
if ! command -v psql &>/dev/null; then
  echo "Instalando PostgreSQL..."
  sudo apt-get install -y postgresql postgresql-contrib
fi
sudo systemctl start postgresql
sudo systemctl enable postgresql
ok "PostgreSQL activo"

# cloudflared
if ! command -v cloudflared &>/dev/null; then
  echo "Instalando cloudflared..."
  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
  sudo dpkg -i /tmp/cloudflared.deb
  rm /tmp/cloudflared.deb
fi
ok "cloudflared $(cloudflared --version 2>&1 | head -1)"

# ────────────────────────────────────────────────────────────────
paso "PRE-FLIGHT — Verificar puertos del sistema"
# ────────────────────────────────────────────────────────────────

declare -A PUERTOS
PUERTOS[3000]="Evolution API (WhatsApp)"
PUERTOS[5000]="Clientum Proxy"
PUERTOS[8080]="Clientum API Server"

CONFLICTOS=()
echo ""
printf "  %-8s  %-28s  %s\n" "Puerto" "Servicio" "Estado"
printf "  %-8s  %-28s  %s\n" "--------" "----------------------------" "-------"

for PUERTO in 3000 5000 8080; do
  SERVICIO="${PUERTOS[$PUERTO]}"
  PID_EN_PUERTO=$(lsof -ti tcp:${PUERTO} 2>/dev/null || true)
  if [ -n "$PID_EN_PUERTO" ]; then
    PROC=$(ps -p "$PID_EN_PUERTO" -o comm= 2>/dev/null || echo "?")
    printf "  ${RED}:%-7s${NC}  %-28s  ${RED}⛔ ocupado por %s (PID %s)${NC}\n" \
      "$PUERTO" "$SERVICIO" "$PROC" "$PID_EN_PUERTO"
    CONFLICTOS+=("$PUERTO:$PID_EN_PUERTO:$PROC")
  else
    printf "  ${GREEN}:%-7s${NC}  %-28s  ${GREEN}✅ libre${NC}\n" "$PUERTO" "$SERVICIO"
  fi
done

echo ""

if [ ${#CONFLICTOS[@]} -gt 0 ]; then
  echo -e "  ${YELLOW}⚠️  Hay ${#CONFLICTOS[@]} conflicto(s) de puerto.${NC}"
  echo "  El setup no puede completarse con esos puertos ocupados."
  echo ""
  echo "  Opciones:"
  echo "    [1] Detener todos los procesos conflictivos y continuar"
  echo "    [2] Cancelar (resolver manualmente y volver a correr)"
  echo ""
  read -p "  Tu elección [1/2]: " FLIGHT_CHOICE

  case "$FLIGHT_CHOICE" in
    1)
      for ENTRY in "${CONFLICTOS[@]}"; do
        P=$(echo "$ENTRY" | cut -d: -f1)
        PID=$(echo "$ENTRY" | cut -d: -f2)
        PROC=$(echo "$ENTRY" | cut -d: -f3)
        echo "  Deteniendo $PROC (PID $PID) en :$P..."
        sudo kill -TERM "$PID" 2>/dev/null || true
        sleep 1
        lsof -ti tcp:${P} &>/dev/null && sudo kill -KILL "$PID" 2>/dev/null || true
      done
      sleep 2
      echo ""
      # Re-verificar
      STILL_BUSY=0
      for ENTRY in "${CONFLICTOS[@]}"; do
        P=$(echo "$ENTRY" | cut -d: -f1)
        lsof -ti tcp:${P} &>/dev/null && { STILL_BUSY=$((STILL_BUSY+1)); warn "Puerto :$P todavía ocupado — matalo manualmente con: sudo kill -9 \$(lsof -ti tcp:$P)"; }
      done
      [ "$STILL_BUSY" -eq 0 ] && ok "Todos los puertos liberados — continuando instalación"
      [ "$STILL_BUSY" -gt 0 ] && { echo ""; echo "  Resolvé los conflictos y volvé a correr el script."; exit 1; }
      ;;
    *)
      echo ""
      echo "  Para liberar puertos manualmente:"
      for ENTRY in "${CONFLICTOS[@]}"; do
        P=$(echo "$ENTRY" | cut -d: -f1)
        PID=$(echo "$ENTRY" | cut -d: -f2)
        echo "    sudo kill -9 $PID   # libera :$P"
      done
      echo ""
      exit 0
      ;;
  esac
else
  ok "Los 3 puertos críticos están libres (:3000 :5000 :8080)"
fi

# ────────────────────────────────────────────────────────────────
paso "PASO 2 — Base de datos"
# ────────────────────────────────────────────────────────────────

# Generar passwords seguros para las DBs
DB_PASS_CLIENTUM=$(openssl rand -hex 16)
DB_PASS_EVOLUTION=$(openssl rand -hex 16)

# DB Clientum
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='clientum'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER clientum WITH PASSWORD '$DB_PASS_CLIENTUM';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='clientum'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE clientum OWNER clientum;"
ok "DB clientum lista"

# DB Evolution
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='evolution'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER evolution WITH PASSWORD '$DB_PASS_EVOLUTION';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='evolution'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE evolution OWNER evolution;"
ok "DB evolution lista"

# Guardar passwords generados para referencia
echo "DB_PASS_CLIENTUM=$DB_PASS_CLIENTUM" > "$HOME_ACTUAL/.clientum-db-credentials"
echo "DB_PASS_EVOLUTION=$DB_PASS_EVOLUTION" >> "$HOME_ACTUAL/.clientum-db-credentials"
chmod 600 "$HOME_ACTUAL/.clientum-db-credentials"
ok "Credenciales de DB guardadas en ~/.clientum-db-credentials"

# ────────────────────────────────────────────────────────────────
paso "PASO 3 — Variables de entorno de Clientum"
# ────────────────────────────────────────────────────────────────

cd "$CLIENTUM"

if [ ! -f ".env" ]; then
  cp "$ENV_EXAMPLE" .env
  # Precompletar SESSION_SECRET y DATABASE_URL con valores seguros
  SESSION_SECRET=$(openssl rand -hex 32)
  sed -i "s|SESSION_SECRET=.*|SESSION_SECRET=$SESSION_SECRET|" .env
  sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://clientum:${DB_PASS_CLIENTUM}@localhost:5432/clientum|" .env
  warn "Creado .env con SESSION_SECRET y DATABASE_URL generados automáticamente"
  echo ""
  echo "  Editá el .env ahora. Opcionales útiles:"
  echo "    OPENROUTER_API_KEY  → chatbot IA    (openrouter.ai)"
  echo "    GROQ_API_KEY        → audios WA     (console.groq.com)"
  echo "    GOOGLE_CLIENT_ID/SECRET → login Google"
  echo ""
  read -p "  ¿Abrís el editor? [s/N] " EDIT
  [[ "$EDIT" =~ ^[Ss]$ ]] && ${EDITOR:-nano} .env
else
  ok ".env ya existe"
fi

# ────────────────────────────────────────────────────────────────
paso "PASO 4 — Instalar dependencias de Clientum"
# ────────────────────────────────────────────────────────────────

cd "$CLIENTUM"

if [ ! -f "pnpm-lock.yaml" ]; then
  echo -e "${RED}❌ No se encontró pnpm-lock.yaml en $CLIENTUM${NC}"
  echo "   Verificá que el ZIP del proyecto está completo."
  exit 1
fi

pnpm install
ok "pnpm install completo"

# Cargar .env de forma robusta (ignora comentarios, tolera valores sin comillas)
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line// }" ]] && continue
  [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]] || continue
  key="${BASH_REMATCH[1]}"
  val="${BASH_REMATCH[2]}"
  # quitar comillas envolventes si las tiene
  val="${val%\"}" ; val="${val#\"}"
  val="${val%'}" ; val="${val#'}"
  export "$key=$val"
done < .env
pnpm --filter @workspace/db run push
ok "Schema de DB aplicado"

pnpm --filter @workspace/scripts run seed:admin
ok "Usuario admin creado (info@clientum.com.ar)"

# ────────────────────────────────────────────────────────────────
paso "PASO 5 — Instalar Evolution API"
# ────────────────────────────────────────────────────────────────

mkdir -p "$EVOLUTION"
cd "$EVOLUTION"

if [ ! -d ".git" ]; then
  git clone https://github.com/EvolutionAPI/evolution-api .
else
  git pull
fi
npm install
npm run build
ok "Evolution API clonado y compilado"

if [ ! -f "$EVOLUTION/.env" ]; then
  cp .env.example "$EVOLUTION/.env"

  # Generar API key y configurar DB con password seguro
  EVOLUTION_KEY=$(openssl rand -hex 32)
  sed -i "s|AUTHENTICATION_API_KEY=.*|AUTHENTICATION_API_KEY=$EVOLUTION_KEY|" "$EVOLUTION/.env"
  sed -i "s|DATABASE_CONNECTION_URI=.*|DATABASE_CONNECTION_URI=postgresql://evolution:${DB_PASS_EVOLUTION}@localhost:5432/evolution|" "$EVOLUTION/.env"
  sed -i "s|WEBHOOK_GLOBAL_URL=.*|WEBHOOK_GLOBAL_URL=http://localhost:5000/api/chatbot/webhook|" "$EVOLUTION/.env"
  sed -i "s|WEBHOOK_GLOBAL_ENABLED=.*|WEBHOOK_GLOBAL_ENABLED=true|" "$EVOLUTION/.env"
  sed -i "s|WEBHOOK_EVENTS_MESSAGES_UPSERT=.*|WEBHOOK_EVENTS_MESSAGES_UPSERT=true|" "$EVOLUTION/.env"
  sed -i "s|WEBHOOK_EVENTS_CONNECTION_UPDATE=.*|WEBHOOK_EVENTS_CONNECTION_UPDATE=true|" "$EVOLUTION/.env"

  echo "$EVOLUTION_KEY" > "$HOME_ACTUAL/.evolution-api-key"
  chmod 600 "$HOME_ACTUAL/.evolution-api-key"
  ok "Evolution .env creado — API key guardada en ~/.evolution-api-key"
else
  EVOLUTION_KEY=$(grep AUTHENTICATION_API_KEY "$EVOLUTION/.env" | cut -d= -f2)
  ok "Evolution .env ya existe"
fi

cd "$EVOLUTION"
npx prisma migrate deploy 2>/dev/null || npx prisma db push 2>/dev/null || warn "Migration skipped (puede que ya esté aplicada)"
ok "Schema Evolution API aplicado"

# ────────────────────────────────────────────────────────────────
paso "PASO 6 — Servicios systemd"
# ────────────────────────────────────────────────────────────────

instalar_service() {
  local NAME=$1
  local CONTENT=$2
  echo "$CONTENT" | sed "s|TU_USUARIO|$USER_ACTUAL|g" > /tmp/$NAME.service
  sudo cp /tmp/$NAME.service /etc/systemd/system/$NAME.service
  ok "Instalado: $NAME.service"
}

instalar_service "clientum-api" "[Unit]
Description=Clientum API Server (Express — puerto definido por PORT en .env)
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=TU_USUARIO
WorkingDirectory=/home/TU_USUARIO/clientum
EnvironmentFile=/home/TU_USUARIO/clientum/.env
ExecStartPre=/usr/bin/pnpm --filter @workspace/api-server run build
ExecStart=/usr/bin/node --enable-source-maps artifacts/api-server/dist/index.mjs
Restart=always
RestartSec=5
SyslogIdentifier=clientum-api

[Install]
WantedBy=multi-user.target"

instalar_service "clientum-vite" "[Unit]
Description=Clientum Frontend (Vite :21496)
After=network.target

[Service]
Type=simple
User=TU_USUARIO
WorkingDirectory=/home/TU_USUARIO/clientum
EnvironmentFile=/home/TU_USUARIO/clientum/.env
ExecStart=/usr/bin/pnpm --filter @workspace/clientum run dev
Restart=always
RestartSec=5
SyslogIdentifier=clientum-vite

[Install]
WantedBy=multi-user.target"

instalar_service "clientum-proxy" "[Unit]
Description=Clientum Proxy (:5000)
After=clientum-api.service clientum-vite.service
Wants=clientum-api.service clientum-vite.service

[Service]
Type=simple
User=TU_USUARIO
WorkingDirectory=/home/TU_USUARIO/clientum
EnvironmentFile=/home/TU_USUARIO/clientum/.env
ExecStart=/usr/bin/node proxy.mjs
Restart=always
RestartSec=5
SyslogIdentifier=clientum-proxy

[Install]
WantedBy=multi-user.target"

instalar_service "evolution-api" "[Unit]
Description=Evolution API (WhatsApp :3000)
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=TU_USUARIO
WorkingDirectory=/home/TU_USUARIO/evolution
EnvironmentFile=/home/TU_USUARIO/evolution/.env
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=5
SyslogIdentifier=evolution-api

[Install]
WantedBy=multi-user.target"

if [ -f "$HOME_ACTUAL/.cloudflared/config.yml" ]; then
  sudo cloudflared service install 2>/dev/null || true
  ok "cloudflared instalado como servicio"
else
  warn "Cloudflare Tunnel no configurado aún (ver PASO 8)"
fi

# ────────────────────────────────────────────────────────────────
paso "PASO 7 — Arrancar todo"
# ────────────────────────────────────────────────────────────────

sudo systemctl daemon-reload

SERVICIOS="clientum-api clientum-vite clientum-proxy evolution-api"

for SVC in $SERVICIOS; do
  sudo systemctl enable $SVC 2>/dev/null
  sudo systemctl restart $SVC
done

echo ""
echo "Esperando que los servicios levanten..."
sleep 8

for SVC in $SERVICIOS cloudflared; do
  STATUS=$(systemctl is-active $SVC 2>/dev/null || echo "no instalado")
  if [ "$STATUS" = "active" ]; then
    ok "$SVC → activo"
  else
    warn "$SVC → $STATUS"
  fi
done

# ────────────────────────────────────────────────────────────────
paso "PASO 8 — Cloudflare Tunnel (si no está configurado)"
# ────────────────────────────────────────────────────────────────

if [ ! -f "$HOME_ACTUAL/.cloudflared/config.yml" ]; then
  echo ""
  echo "  Todavía no configuraste el tunnel. Ejecutá:"
  echo "    bash $CLIENTUM/scripts/setup/setup-tunnel.sh"
  echo ""
  echo "  O manualmente:"
  echo "    1. cloudflared tunnel login"
  echo "    2. cloudflared tunnel create clientum"
  echo "    3. Crear ~/.cloudflared/config.yml"
  echo "    4. cloudflared tunnel route dns clientum clientum.com.ar"
  echo "    5. sudo cloudflared service install"
fi

# ────────────────────────────────────────────────────────────────
paso "PASO 9 — Backup automático diario (crontab)"
# ────────────────────────────────────────────────────────────────

BACKUP_SCRIPT="$CLIENTUM/scripts/db/backup-db.sh"
CRON_JOB="0 2 * * * bash $BACKUP_SCRIPT >> /var/log/clientum-backup.log 2>&1"
LOG_ROTATE="/etc/logrotate.d/clientum-backup"

sudo mkdir -p /var/backups/clientum
sudo chown "$USER_ACTUAL":"$USER_ACTUAL" /var/backups/clientum
ok "Directorio /var/backups/clientum listo"

if crontab -l 2>/dev/null | grep -qF "backup-db.sh"; then
  ok "Cron de backup ya estaba configurado"
else
  (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
  ok "Backup automático configurado: todos los días a las 2am"
fi

sudo tee "$LOG_ROTATE" > /dev/null <<LOGEOF
/var/log/clientum-backup.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
LOGEOF
ok "Rotación de logs de backup configurada"

# ────────────────────────────────────────────────────────────────
paso "PASO 10 — Monitoreo automático con alertas por WhatsApp"
# ────────────────────────────────────────────────────────────────

MONITOR_SCRIPT="$CLIENTUM/scripts/monitoreo/monitoreo.sh"
REPORTE_SCRIPT="$CLIENTUM/scripts/monitoreo/reporte-diario.sh"

# Leer número de WA del .env si ya fue configurado
MONITOR_WA_NUMBER=$(grep -E '^MONITOR_WA_NUMBER=' "$CLIENTUM/.env" 2>/dev/null | cut -d= -f2 || echo "")

if [ -n "$MONITOR_WA_NUMBER" ]; then
  # Instalar cron de monitoreo (cada 5 min) si no existe
  if crontab -l 2>/dev/null | grep -q "clientum-monitor"; then
    ok "Cron de monitoreo ya estaba configurado"
  else
    ( crontab -l 2>/dev/null; echo "*/5 * * * * bash $MONITOR_SCRIPT >> /var/log/clientum-monitor.log 2>&1 # clientum-monitor" ) | crontab -
    ok "Monitoreo automático configurado: alerta a +$MONITOR_WA_NUMBER si algo cae"
  fi
  # Instalar reporte diario a las 8am si no existe
  if crontab -l 2>/dev/null | grep -q "clientum-reporte-diario"; then
    ok "Cron de reporte diario ya estaba configurado"
  else
    ( crontab -l 2>/dev/null; echo "0 8 * * * bash $REPORTE_SCRIPT >> /var/log/clientum-reporte.log 2>&1 # clientum-reporte-diario" ) | crontab -
    ok "Reporte diario configurado: WhatsApp a las 8:00 AM todos los días"
  fi
  # Permisos de log
  for LOG in /var/log/clientum-monitor.log /var/log/clientum-reporte.log; do
    sudo touch "$LOG" 2>/dev/null || true
    sudo chmod 666 "$LOG" 2>/dev/null || true
  done
else
  warn "MONITOR_WA_NUMBER no configurado en .env — monitoreo no instalado"
  echo ""
  echo "  Para activarlo después, agregar al .env:"
  echo "    MONITOR_WA_NUMBER=5492984510883"
  echo "    MONITOR_WA_INSTANCE=clientum"
  echo ""
  echo "  Luego ejecutar:"
  echo "    bash $MONITOR_SCRIPT --setup-cron"
  echo "    bash $REPORTE_SCRIPT --setup-cron"
fi

# ────────────────────────────────────────────────────────────────
paso "RESUMEN FINAL"
# ────────────────────────────────────────────────────────────────

EVOLUTION_KEY_DISPLAY=$(cat "$HOME_ACTUAL/.evolution-api-key" 2>/dev/null || grep AUTHENTICATION_API_KEY "$EVOLUTION/.env" 2>/dev/null | cut -d= -f2 || echo "(no encontrada)")

echo ""
echo "  App local:    http://localhost:5000"
echo "  App pública:  https://clientum.com.ar  (cuando tunnel esté activo)"
echo "  Dev login:    http://localhost:5000/api/auth/dev-login"
echo ""
echo "  Evolution API key: $EVOLUTION_KEY_DISPLAY"
echo ""
echo "  Credenciales DB:  ~/.clientum-db-credentials  (modo 600)"
echo "  Backup DB:        /var/backups/clientum/  (diario a las 2am)"
echo "  Backup log:       /var/log/clientum-backup.log"
echo "  Monitor log:      /var/log/clientum-monitor.log"
echo "  Reporte log:      /var/log/clientum-reporte.log"
echo "  Restaurar DB:     bash $CLIENTUM/scripts/db/restore-db.sh"
echo ""
echo "  Estado rápido:"
echo "    bash $CLIENTUM/scripts/monitoreo/status.sh"
echo ""
echo "  Detener servicios:"
echo "    bash $CLIENTUM/scripts/ops/stop.sh"
echo ""
echo "  PRÓXIMO PASO — Conectar WhatsApp:"
echo "  1. Ir a http://localhost:5000/dashboard → Chatbot → Configuración"
echo "  2. Poner Evolution URL: http://localhost:3000"
echo "  3. Pegar la API key de arriba"
echo "  4. Crear instancia y escanear QR"
echo ""
echo "  LOGS:"
echo "  bash $CLIENTUM/scripts/monitoreo/logs.sh"
echo ""
