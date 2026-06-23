#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Clientum — Setup Nginx + Let's Encrypt (alternativa a Cloudflare)
#  Publicá Clientum con HTTPS en tu dominio propio usando Nginx.
#
#  Uso:
#    bash scripts/setup/setup-nginx.sh clientum.com.ar
#    bash scripts/setup/setup-nginx.sh clientum.com.ar 5000
# ═══════════════════════════════════════════════════════════════
set -e

DOMINIO="${1:?Uso: bash setup-nginx.sh DOMINIO [PUERTO_APP]}"
APP_PORT="${2:-5000}"
EMAIL="${3:-admin@${DOMINIO}}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✅ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
paso() { echo -e "\n${CYAN}━━━ $1${NC}"; }

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║      Nginx + Let's Encrypt — Setup HTTPS            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo "  Dominio:   $DOMINIO"
echo "  App port:  $APP_PORT"
echo "  Email SSL: $EMAIL"
echo ""
echo "  ⚠️  Asegurate de que el dominio apunte a esta IP."
echo "  (DNS A/AAAA → IP pública de este servidor)"
echo ""
read -p "  ¿Continuar? [s/N] " CONF
[[ ! "$CONF" =~ ^[Ss]$ ]] && exit 0

# ── PASO 1: Instalar Nginx + Certbot ────────────────────────────────────────
paso "PASO 1 — Instalar Nginx y Certbot"
sudo apt-get update -q
sudo apt-get install -y nginx certbot python3-certbot-nginx
ok "Nginx $(nginx -v 2>&1 | grep -oP '[\d.]+') y Certbot instalados"

# ── PASO 2: Config Nginx HTTP (para validación certbot) ─────────────────────
paso "PASO 2 — Configurar Nginx"
NGINX_CONF="/etc/nginx/sites-available/clientum"

sudo tee "$NGINX_CONF" > /dev/null << NGINXEOF
server {
    listen 80;
    server_name ${DOMINIO} www.${DOMINIO};

    # Tamaño máximo de body (para audios/imágenes vía webhook)
    client_max_body_size 50M;

    location / {
        proxy_pass         http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }

    # Webhook de Evolution API — sin timeout largo
    location /api/chatbot/webhook {
        proxy_pass         http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_read_timeout 30s;
        client_max_body_size 10M;
    }
}
NGINXEOF

sudo ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/clientum" 2>/dev/null || true
sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx
ok "Nginx configurado para $DOMINIO"

# ── PASO 3: Certificado SSL con Let's Encrypt ────────────────────────────────
paso "PASO 3 — Obtener certificado SSL"
echo "  Esto puede tardar unos segundos..."
sudo certbot --nginx \
  -d "$DOMINIO" \
  -d "www.$DOMINIO" \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive \
  --redirect 2>/dev/null || {
    warn "Certbot con www.$DOMINIO falló, intentando solo $DOMINIO..."
    sudo certbot --nginx \
      -d "$DOMINIO" \
      --email "$EMAIL" \
      --agree-tos \
      --non-interactive \
      --redirect
  }
ok "Certificado SSL obtenido para $DOMINIO"

# ── PASO 4: Renovación automática ────────────────────────────────────────────
paso "PASO 4 — Renovación automática de certificados"
# certbot añade automáticamente el cron, pero verificamos
CRON_EXISTS=$(sudo crontab -l 2>/dev/null | grep -c "certbot" || echo 0)
if [ "$CRON_EXISTS" -eq 0 ]; then
  (sudo crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | sudo crontab -
fi
ok "Renovación automática configurada (cron diario 3am)"

# ── PASO 5: Actualizar .env con dominio público ──────────────────────────────
paso "PASO 5 — Actualizar .env"
DIR_PROYECTO=$(cd "$(dirname "$0")/../.." && pwd)
if [ -f "$DIR_PROYECTO/.env" ]; then
  if grep -q "REPLIT_DEV_DOMAIN" "$DIR_PROYECTO/.env"; then
    sed -i "s|REPLIT_DEV_DOMAIN=.*|REPLIT_DEV_DOMAIN=$DOMINIO|" "$DIR_PROYECTO/.env"
  else
    echo "REPLIT_DEV_DOMAIN=$DOMINIO" >> "$DIR_PROYECTO/.env"
  fi
  ok ".env actualizado con REPLIT_DEV_DOMAIN=$DOMINIO"
fi

# ── Resumen ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅  Nginx + HTTPS configurado                      ║"
echo "╠══════════════════════════════════════════════════════╣"
printf "║  🌐 https://%-42s║\n" "$DOMINIO"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Webhook WhatsApp (Evolution API):                  ║"
printf "║  https://%s/api/chatbot/webhook%-10s║\n" "$DOMINIO" " "
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Comandos útiles:                                   ║"
echo "║    sudo nginx -t              → verificar config    ║"
echo "║    sudo systemctl reload nginx → aplicar cambios    ║"
echo "║    sudo certbot renew --dry-run → testear renovación║"
echo "║    sudo journalctl -u nginx -f  → ver logs          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
