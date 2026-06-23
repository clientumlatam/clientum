#!/bin/bash
# Configura Cloudflare Tunnel para publicar Clientum
# Uso: bash scripts/setup/setup-tunnel.sh [dominio] [nombre-tunnel]
set -e

DOMINIO="${1:-clientum.com.ar}"
TUNNEL_NAME="${2:-clientum}"
PUERTO_PROXY="${PROXY_PORT:-5000}"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║         Setup Cloudflare Tunnel                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo "  Dominio:  $DOMINIO"
echo "  Tunnel:   $TUNNEL_NAME"
echo "  App en:   http://localhost:$PUERTO_PROXY"
echo ""

# ─── 1. Instalar cloudflared ──────────────────────────────────────────────────
if ! command -v cloudflared &>/dev/null; then
  echo "▶ Instalando cloudflared..."
  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
    -o /tmp/cloudflared.deb
  sudo dpkg -i /tmp/cloudflared.deb
  rm /tmp/cloudflared.deb
  echo "   cloudflared $(cloudflared --version 2>&1 | head -1) instalado"
else
  echo "▶ cloudflared ya instalado: $(cloudflared --version 2>&1 | head -1)"
fi

# ─── 2. Login ─────────────────────────────────────────────────────────────────
echo ""
echo "▶ Autenticando con Cloudflare..."
echo "   Se va a abrir el browser. Seleccioná el dominio '$DOMINIO' y autorizá."
echo ""
cloudflared tunnel login

# ─── 3. Crear tunnel ─────────────────────────────────────────────────────────
echo ""
echo "▶ Creando tunnel '$TUNNEL_NAME'..."

if cloudflared tunnel list 2>/dev/null | grep -q "$TUNNEL_NAME"; then
  echo "   El tunnel '$TUNNEL_NAME' ya existe."
  TUNNEL_ID=$(cloudflared tunnel list 2>/dev/null | grep "$TUNNEL_NAME" | awk '{print $1}')
else
  cloudflared tunnel create "$TUNNEL_NAME"
  TUNNEL_ID=$(cloudflared tunnel list 2>/dev/null | grep "$TUNNEL_NAME" | awk '{print $1}')
fi

echo "   Tunnel ID: $TUNNEL_ID"

# ─── 4. Config ────────────────────────────────────────────────────────────────
echo ""
echo "▶ Escribiendo ~/.cloudflared/config.yml..."

mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << CFEOF
tunnel: $TUNNEL_NAME
credentials-file: $HOME/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: $DOMINIO
    service: http://localhost:$PUERTO_PROXY
  - hostname: www.$DOMINIO
    service: http://localhost:$PUERTO_PROXY
  - service: http_status:404
CFEOF

cat ~/.cloudflared/config.yml
echo ""

# ─── 5. DNS ───────────────────────────────────────────────────────────────────
echo "▶ Configurando registros DNS CNAME..."
cloudflared tunnel route dns "$TUNNEL_NAME" "$DOMINIO" || echo "   (CNAME ya existe)"
cloudflared tunnel route dns "$TUNNEL_NAME" "www.$DOMINIO" || echo "   (CNAME www ya existe)"

# ─── 6. Servicio systemd ──────────────────────────────────────────────────────
echo ""
echo "▶ Instalando cloudflared como servicio systemd..."
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

sleep 2

echo ""
if systemctl is-active --quiet cloudflared; then
  echo "   ✅ cloudflared activo"
else
  echo "   ⚠️  Verificar: sudo journalctl -u cloudflared -n 20"
fi

# ─── 7. Actualizar .env con URL de producción ─────────────────────────────────
DIR_PROYECTO=$(cd "$(dirname "$0")/../.." && pwd)

if [ -f "$DIR_PROYECTO/.env" ]; then
  echo ""
  echo "▶ Actualizando .env con REPLIT_DEV_DOMAIN=$DOMINIO..."
  if grep -q "REPLIT_DEV_DOMAIN" "$DIR_PROYECTO/.env"; then
    sed -i "s|REPLIT_DEV_DOMAIN=.*|REPLIT_DEV_DOMAIN=$DOMINIO|" "$DIR_PROYECTO/.env"
  else
    echo "REPLIT_DEV_DOMAIN=$DOMINIO" >> "$DIR_PROYECTO/.env"
  fi
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ¡Tunnel configurado!                                ║"
echo "╠══════════════════════════════════════════════════════╣"
printf "║  🌐 https://%-40s║\n" "$DOMINIO"
printf "║  🌐 https://www.%-37s║\n" "$DOMINIO"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "Si cambiás el WEBHOOK_GLOBAL_URL de Evolution API, usá:"
echo "  https://$DOMINIO/api/chatbot/webhook"
echo ""
echo "Logs del tunnel:"
echo "  sudo journalctl -u cloudflared -f"
echo ""
