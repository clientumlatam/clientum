#!/bin/bash
# Instalar servicios systemd de Clientum + Cloudflare Tunnel
# Uso: bash instalar-servicios.sh
set -e

# ── Detectar usuario actual ──────────────────────────────────────────────────
USER_ACTUAL=$(whoami)
HOME_ACTUAL=$(eval echo ~$USER_ACTUAL)
PROYECTO="$HOME_ACTUAL/clientum"

echo "▶ Usuario: $USER_ACTUAL"
echo "▶ Proyecto: $PROYECTO"
echo ""

# ── Verificar que el proyecto existe ────────────────────────────────────────
if [ ! -f "$PROYECTO/.env" ]; then
  echo "❌ No se encontró $PROYECTO/.env"
  echo "   Completá el setup primero (ver setup-local.md)"
  exit 1
fi

# ── Reemplazar TU_USUARIO en los archivos .service ──────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

for SERVICE in clientum-api clientum-vite clientum-proxy evolution-api; do
  SERVICE_FILE="$SCRIPT_DIR/../services/$SERVICE.service"
  if [ ! -f "$SERVICE_FILE" ]; then
    echo "❌ No se encontró $SERVICE_FILE"
    exit 1
  fi
  sed "s|TU_USUARIO|$USER_ACTUAL|g" "$SERVICE_FILE" > /tmp/$SERVICE.service
  sudo cp /tmp/$SERVICE.service /etc/systemd/system/$SERVICE.service
  echo "✅ Instalado: /etc/systemd/system/$SERVICE.service"
done

# ── Instalar cloudflared como servicio ──────────────────────────────────────
echo ""
if [ -f "$HOME_ACTUAL/.cloudflared/config.yml" ]; then
  echo "▶ Instalando cloudflared como servicio..."
  sudo cloudflared service install 2>/dev/null || true
  echo "✅ cloudflared instalado como servicio systemd"
else
  echo "⚠️  Cloudflare Tunnel no configurado aún (config.yml no encontrado)"
  echo "   Ejecutá setup-tunnel.sh para configurarlo, luego habilitalo con:"
  echo "   sudo cloudflared service install && sudo systemctl enable cloudflared"
fi

# ── Recargar systemd y habilitar servicios ──────────────────────────────────
echo ""
sudo systemctl daemon-reload

for SERVICE in clientum-api clientum-vite clientum-proxy evolution-api; do
  sudo systemctl enable $SERVICE
  echo "✅ Habilitado en arranque: $SERVICE"
done

if systemctl list-unit-files cloudflared.service &>/dev/null; then
  sudo systemctl enable cloudflared 2>/dev/null || true
  echo "✅ Habilitado en arranque: cloudflared"
fi

# ── Instalar dependencias del proyecto ──────────────────────────────────────
echo ""
echo "▶ Instalando dependencias pnpm..."
cd "$PROYECTO"

if [ ! -f "pnpm-lock.yaml" ]; then
  echo "❌ No se encontró pnpm-lock.yaml en $PROYECTO"
  exit 1
fi

pnpm install

# ── Aplicar schema de DB ─────────────────────────────────────────────────────
echo ""
echo "▶ Aplicando schema de base de datos..."
# Cargar .env de forma robusta (ignora comentarios, tolera valores sin comillas)
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line// }" ]] && continue
  [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]] || continue
  key="${BASH_REMATCH[1]}"
  val="${BASH_REMATCH[2]}"
  # quitar comillas envolventes si las tiene
  val="${val%"}" ; val="${val#"}"
  val="${val%'}" ; val="${val#'}"
  export "$key=$val"
done < "$PROYECTO/.env"
pnpm --filter @workspace/db run push

# ── Arrancar todo ────────────────────────────────────────────────────────────
echo ""
echo "▶ Arrancando servicios..."
for SERVICE in clientum-api clientum-vite clientum-proxy evolution-api cloudflared; do
  sudo systemctl start $SERVICE 2>/dev/null || true
  sleep 2
  STATUS=$(systemctl is-active $SERVICE 2>/dev/null || echo "no instalado")
  echo "  $SERVICE → $STATUS"
done

echo ""
echo "════════════════════════════════════════"
echo "✅ Setup completo"
echo ""
echo "  App local:  http://localhost:5000"
echo "  App web:    https://clientum.com.ar"
echo "  Dev login:  http://localhost:5000/api/auth/dev-login"
echo ""
echo "Logs en tiempo real:"
echo "  journalctl -f -u clientum-api -u clientum-vite -u clientum-proxy -u evolution-api"
echo "════════════════════════════════════════"
