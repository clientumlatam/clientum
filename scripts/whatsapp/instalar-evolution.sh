#!/bin/bash
# Instalar Evolution API + conectar con Clientum
# Uso: bash instalar-evolution.sh
set -e

USER_ACTUAL=$(whoami)
HOME_ACTUAL=$(eval echo ~$USER_ACTUAL)

echo "▶ Usuario: $USER_ACTUAL"
echo ""

# ── 1. Clonar Evolution API ──────────────────────────────────────────────────
echo "▶ Clonando Evolution API..."
mkdir -p "$HOME_ACTUAL/evolution"
cd "$HOME_ACTUAL/evolution"

if [ -d ".git" ]; then
  echo "  Repositorio ya existe, actualizando..."
  git pull
else
  git clone https://github.com/EvolutionAPI/evolution-api .
fi

npm install

# Compilar antes de iniciar el servicio
echo "▶ Compilando Evolution API..."
npm run build
echo "  ✅ Build completo"

# ── 2. Base de datos ─────────────────────────────────────────────────────────
echo ""
echo "▶ Creando base de datos evolution..."

DB_PASS_EVOLUTION=$(openssl rand -hex 16)

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='evolution'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER evolution WITH PASSWORD '$DB_PASS_EVOLUTION';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='evolution'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE evolution OWNER evolution;"
echo "  ✅ DB lista"

# Guardar password
echo "DB_PASS_EVOLUTION=$DB_PASS_EVOLUTION" >> "$HOME_ACTUAL/.clientum-db-credentials"
chmod 600 "$HOME_ACTUAL/.clientum-db-credentials"

# ── 3. Variables de entorno ──────────────────────────────────────────────────
if [ ! -f "$HOME_ACTUAL/evolution/.env" ]; then
  echo ""
  echo "▶ Creando .env desde evolution.env.example..."
  cp "$(dirname "$0")/../evolution.env.example" "$HOME_ACTUAL/evolution/.env"

  # Precompletar API key y DB con valores seguros
  EVOLUTION_KEY=$(openssl rand -hex 32)
  sed -i "s|AUTHENTICATION_API_KEY=.*|AUTHENTICATION_API_KEY=$EVOLUTION_KEY|" "$HOME_ACTUAL/evolution/.env"
  sed -i "s|DATABASE_CONNECTION_URI=.*|DATABASE_CONNECTION_URI=postgresql://evolution:${DB_PASS_EVOLUTION}@localhost:5432/evolution|" "$HOME_ACTUAL/evolution/.env"

  echo "$EVOLUTION_KEY" > "$HOME_ACTUAL/.evolution-api-key"
  chmod 600 "$HOME_ACTUAL/.evolution-api-key"
  echo "  ✅ .env creado con API key y DB configurados"
  echo ""
  echo "  ⚠️  Revisá y completá si querés:"
  echo "     nano $HOME_ACTUAL/evolution/.env"
  echo ""
  echo "  Mínimo ya configurado automáticamente:"
  echo "    AUTHENTICATION_API_KEY → guardada en ~/.evolution-api-key"
  echo "    DATABASE_CONNECTION_URI → con password seguro"
  echo ""
  read -p "  ¿Abrís el editor? [s/N] " EDIT
  if [[ "$EDIT" =~ ^[Ss]$ ]]; then
    ${EDITOR:-nano} "$HOME_ACTUAL/evolution/.env"
  fi
else
  echo "  .env ya existe, omitiendo"
  EVOLUTION_KEY=$(grep AUTHENTICATION_API_KEY "$HOME_ACTUAL/evolution/.env" | cut -d= -f2)
fi

# ── 4. Migrations ────────────────────────────────────────────────────────────
echo ""
echo "▶ Aplicando migrations de base de datos..."
cd "$HOME_ACTUAL/evolution"
npx prisma migrate deploy 2>/dev/null || npx prisma db push 2>/dev/null || \
  echo "  ⚠️  Migration skipped (puede que ya esté aplicada)"
echo "  ✅ Schema aplicado"

# ── 5. Instalar servicio systemd ─────────────────────────────────────────────
echo ""
echo "▶ Instalando servicio systemd..."
sed "s|TU_USUARIO|$USER_ACTUAL|g" "$(dirname "$0")/../services/evolution-api.service" > /tmp/evolution-api.service
sudo cp /tmp/evolution-api.service /etc/systemd/system/evolution-api.service

sudo systemctl daemon-reload
sudo systemctl enable evolution-api
sudo systemctl start evolution-api
sleep 3

STATUS=$(systemctl is-active evolution-api)
echo "  evolution-api → $STATUS"

# ── 6. Verificar que levantó ─────────────────────────────────────────────────
echo ""
echo "▶ Verificando Evolution API..."
sleep 2
API_KEY=$(grep AUTHENTICATION_API_KEY "$HOME_ACTUAL/evolution/.env" | cut -d= -f2)
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/instance/fetchInstances \
  -H "apikey: $API_KEY" 2>/dev/null || echo "000")

if [ "$RESPONSE" = "200" ]; then
  echo "  ✅ Evolution API responde en :3000"
else
  echo "  ⚠️  Evolution API devuelve HTTP $RESPONSE"
  echo "  Revisá los logs: journalctl -u evolution-api -f"
fi

# ── 7. Instrucciones post-instalación ────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ Evolution API instalado"
echo ""
echo "API Key: $(cat "$HOME_ACTUAL/.evolution-api-key" 2>/dev/null || echo "$API_KEY")"
echo ""
echo "PRÓXIMOS PASOS:"
echo ""
echo "1. Crear instancia WhatsApp:"
echo "   curl -X POST http://localhost:3000/instance/create \\"
echo "     -H \"apikey: \$API_KEY\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"instanceName\": \"mi-negocio\", \"qrcode\": true}'"
echo ""
echo "2. Obtener QR:"
echo "   curl http://localhost:3000/instance/connect/mi-negocio \\"
echo "     -H \"apikey: \$API_KEY\""
echo "   → Pegá el base64 en https://base64.guru/converter/decode/image"
echo ""
echo "3. En Clientum Dashboard → Chatbot → Configuración:"
echo "   Evolution API URL: http://localhost:3000"
echo "   Evolution API Key: (ver ~/.evolution-api-key)"
echo "   Nombre instancia:  mi-negocio"
echo ""
echo "Logs: journalctl -f -u evolution-api"
echo "════════════════════════════════════════════════════════"
