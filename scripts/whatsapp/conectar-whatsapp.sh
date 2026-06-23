#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Clientum — Conectar WhatsApp desde la terminal
#  Crea una instancia en Evolution API y muestra el QR en consola.
#
#  Uso:
#    bash scripts/whatsapp/conectar-whatsapp.sh
#    bash scripts/whatsapp/conectar-whatsapp.sh mi-negocio
# ═══════════════════════════════════════════════════════════════
set -e

# ── Detectar Evolution API activo ────────────────────────────────────────────
EVO_ENV=""
EVO_PORT=3000

if [ -f "$HOME/evolution-lite/.env" ]; then
  EVO_ENV="$HOME/evolution-lite/.env"
elif [ -f "$HOME/evolution/.env" ]; then
  EVO_ENV="$HOME/evolution/.env"
fi

if [ -n "$EVO_ENV" ]; then
  _read() { grep -E "^${1}=" "$EVO_ENV" 2>/dev/null | cut -d= -f2 | tr -d '"'; }
  EVO_URL=$(_read "SERVER_URL")
  [ -z "$EVO_URL" ] && EVO_URL="http://localhost:${EVO_PORT}"
  EVO_KEY=$(_read "AUTHENTICATION_API_KEY")
  _PORT=$(_read "SERVER_PORT"); [ -n "$_PORT" ] && EVO_PORT="$_PORT"
else
  EVO_URL="http://localhost:${EVO_PORT}"
  EVO_KEY=""
fi

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║       Conectar WhatsApp — Asistente CLI              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Verificar URL de Evolution ───────────────────────────────────────────────
if [ -z "$EVO_KEY" ]; then
  echo -e "${YELLOW}⚠️  No se encontró la API key de Evolution API automáticamente.${NC}"
  echo ""
  read -p "  URL de Evolution API [http://localhost:$EVO_PORT]: " INPUT_URL
  EVO_URL="${INPUT_URL:-http://localhost:$EVO_PORT}"
  read -p "  API Key de Evolution API: " EVO_KEY
fi

EVO_URL="${EVO_URL%/}"
echo -e "  ${CYAN}Servidor:${NC} $EVO_URL"
echo ""

# ── Verificar conexión ───────────────────────────────────────────────────────
echo "▶ Verificando conexión con Evolution API..."
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
  "$EVO_URL/instance/fetchInstances" \
  -H "apikey: $EVO_KEY" 2>/dev/null || echo "000")

if [[ ! "$HTTP" =~ ^(200|201)$ ]]; then
  echo -e "${RED}❌ No se pudo conectar (HTTP $HTTP). Verificá que Evolution esté activo.${NC}"
  echo "   sudo systemctl status evolution-api-lite"
  exit 1
fi
echo -e "${GREEN}  ✅ Evolution API respondió (HTTP $HTTP)${NC}"

# ── Listar instancias existentes ─────────────────────────────────────────────
echo ""
echo "▶ Instancias existentes:"
INSTANCES=$(curl -s --max-time 5 \
  "$EVO_URL/instance/fetchInstances" \
  -H "apikey: $EVO_KEY" 2>/dev/null || echo "[]")

echo "$INSTANCES" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    items = data if isinstance(data, list) else data.get('instances', [data]) if isinstance(data, dict) else []
    if not items:
        print('  (ninguna)')
    for inst in items:
        name = inst.get('instance',{}).get('instanceName', inst.get('instanceName','?'))
        state = inst.get('instance',{}).get('state', inst.get('state','?'))
        print(f'  • {name}  [{state}]')
except: print('  (no se pudo parsear la respuesta)')
" 2>/dev/null || echo "  (no disponible)"

# ── Nombre de la instancia ───────────────────────────────────────────────────
echo ""
INSTANCE_NAME="${1:-}"
if [ -z "$INSTANCE_NAME" ]; then
  read -p "  Nombre para la nueva instancia (ej: mi-negocio): " INSTANCE_NAME
  INSTANCE_NAME="${INSTANCE_NAME:-mi-negocio-$(date +%H%M)}"
fi
INSTANCE_NAME=$(echo "$INSTANCE_NAME" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]//g')
echo -e "  ${CYAN}Instancia:${NC} $INSTANCE_NAME"

# ── Crear instancia ──────────────────────────────────────────────────────────
echo ""
echo "▶ Creando instancia '$INSTANCE_NAME'..."
CREATE_RESP=$(curl -s --max-time 10 -X POST \
  "$EVO_URL/instance/create" \
  -H "apikey: $EVO_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"instanceName\": \"$INSTANCE_NAME\", \"qrcode\": true, \"integration\": \"WHATSAPP-BAILEYS\"}" \
  2>/dev/null || echo "{}")

# Extraer QR si viene en la respuesta de creación
QR_DATA=$(echo "$CREATE_RESP" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    qr = d.get('qrcode',{}).get('base64','') or d.get('base64','') or d.get('qrCode','') or ''
    print(qr)
except: pass
" 2>/dev/null || echo "")

# Si no vino en create, pedirlo con /connect
if [ -z "$QR_DATA" ]; then
  echo "  Obteniendo QR..."
  sleep 2
  QR_RESP=$(curl -s --max-time 10 \
    "$EVO_URL/instance/connect/$INSTANCE_NAME" \
    -H "apikey: $EVO_KEY" 2>/dev/null || echo "{}")
  QR_DATA=$(echo "$QR_RESP" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    qr = d.get('base64','') or d.get('qrCode','') or d.get('code','') or ''
    print(qr)
except: pass
" 2>/dev/null || echo "")
fi

# ── Mostrar QR ───────────────────────────────────────────────────────────────
echo ""
if [ -n "$QR_DATA" ]; then
  # Intentar mostrar QR en terminal con qrencode
  QR_TEXT=$(echo "$QR_DATA" | sed 's|^data:image/[^;]*;base64,||')

  if command -v qrencode &>/dev/null; then
    echo "$QR_TEXT" | base64 -d 2>/dev/null | \
      qrencode --read-from=- -t UTF8 2>/dev/null || \
      echo "  (no se pudo renderizar el QR en terminal)"
  else
    echo -e "${YELLOW}  ⚠️  qrencode no instalado. Para verlo en terminal:${NC}"
    echo "     sudo apt-get install -y qrencode"
    echo ""
    echo "  Alternativa — pegá este base64 en: https://base64.guru/converter/decode/image"
    echo ""
    # Mostrar primeros 80 chars del base64 para confirmar que hay datos
    echo "  Base64 preview: ${QR_TEXT:0:80}..."
  fi

  echo ""
  echo -e "${YELLOW}  Escaneá el QR con WhatsApp:${NC}"
  echo "    Android: Menú (⋮) → Dispositivos vinculados → Vincular dispositivo"
  echo "    iPhone:  Configuración → Dispositivos vinculados → Vincular dispositivo"
else
  echo -e "${RED}  ❌ No se pudo obtener el QR. Verificá los logs:${NC}"
  echo "     bash scripts/monitoreo/logs.sh evo"
  exit 1
fi

# ── Polling de estado ────────────────────────────────────────────────────────
echo ""
echo "▶ Esperando que escanees el QR..."
echo "  (verificando cada 5 segundos, Ctrl+C para cancelar)"
echo ""

for i in $(seq 1 24); do  # 24 × 5s = 2 minutos
  sleep 5
  STATE_RESP=$(curl -s --max-time 5 \
    "$EVO_URL/instance/connectionState/$INSTANCE_NAME" \
    -H "apikey: $EVO_KEY" 2>/dev/null || echo "{}")
  STATE=$(echo "$STATE_RESP" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('instance',{}).get('state', d.get('state','?')))
except: print('?')
" 2>/dev/null || echo "?")

  if [ "$STATE" = "open" ]; then
    PHONE=$(echo "$STATE_RESP" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('instance',{}).get('owner','') or d.get('owner',''))
except: print('')
" 2>/dev/null || echo "")
    echo ""
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║  ✅  ¡WhatsApp conectado exitosamente!              ║"
    echo "╠══════════════════════════════════════════════════════╣"
    printf "║  Instancia: %-42s║\n" "$INSTANCE_NAME"
    [ -n "$PHONE" ] && printf "║  Número:    %-42s║\n" "+$PHONE"
    echo "╠══════════════════════════════════════════════════════╣"
    echo "║  PRÓXIMO PASO — Configurar en Clientum:             ║"
    echo "║    Ir a /app/connect-whatsapp (ya conectado)        ║"
    echo "║    O configurar en /app/agent → Credenciales:       ║"
    printf "║    URL:     %-42s║\n" "$EVO_URL"
    printf "║    API Key: %-42s║\n" "${EVO_KEY:0:40}..."
    printf "║    Instancia: %-40s║\n" "$INSTANCE_NAME"
    echo "╚══════════════════════════════════════════════════════╝"
    exit 0
  fi

  printf "  [%2d/24] Estado: %s\r" "$i" "$STATE"
done

echo ""
echo -e "${YELLOW}  ⏱  Tiempo de espera agotado. El QR puede haber vencido.${NC}"
echo "  Ejecutá de nuevo el script para obtener un QR fresco:"
echo "    bash scripts/whatsapp/conectar-whatsapp.sh $INSTANCE_NAME"
