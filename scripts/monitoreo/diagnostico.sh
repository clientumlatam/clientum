#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  Clientum — Diagnóstico completo de configuración
#
#  Verifica variables de entorno, Evolution API, chatbot, DB, tunnel y build.
#  Muestra el comando exacto para corregir cada problema encontrado.
#
#  Uso:
#    bash scripts/monitoreo/diagnostico.sh            → diagnóstico completo
#    bash scripts/monitoreo/diagnostico.sh --env      → solo variables de entorno
#    bash scripts/monitoreo/diagnostico.sh --db       → solo base de datos
#    bash scripts/monitoreo/diagnostico.sh --build    → solo build/binarios
#    bash scripts/monitoreo/diagnostico.sh --evolution → solo Evolution API / WhatsApp
#    bash scripts/monitoreo/diagnostico.sh --chatbot  → solo chatbot / IA
#    bash scripts/monitoreo/diagnostico.sh --afip     → solo AFIP (cert, tokens, conectividad)
#    bash scripts/monitoreo/diagnostico.sh --tunel    → solo tunnel / dominio público
# ═══════════════════════════════════════════════════════════════════════════════

CLIENTUM="${CLIENTUM:-$HOME/clientum}"
ENV_FILE="$CLIENTUM/.env"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
CYAN='\033[0;36m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

WARNINGS=(); FAILURES=(); FIXES=()

ok()   { printf "  ${GREEN}✅  %-52s${NC}\n" "$1"; }
warn() { printf "  ${YELLOW}⚠️   %-52s${NC}\n" "$1"; WARNINGS+=("$1"); }
fail() { printf "  ${RED}❌  %-52s${NC}\n" "$1"; FAILURES+=("$1"); }
fix()  { FIXES+=("$1"); printf "  ${DIM}      → %s${NC}\n" "$1"; }
sec()  { echo ""; echo -e "${CYAN}  ── $1 ──${NC}"; }

# Leer variable del .env
_env() {
  [ -f "$ENV_FILE" ] && grep -E "^${1}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' || echo ""
}

FILTER="${1:-all}"

# ─── Banner ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  Clientum — Diagnóstico  [$(date '+%d/%m/%Y %H:%M:%S')]${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ─────────────────────────────────────────────────────────────────────────────
# 1. VARIABLES DE ENTORNO
# ─────────────────────────────────────────────────────────────────────────────
check_env() {
  sec "Variables de entorno"

  if [ ! -f "$ENV_FILE" ]; then
    fail ".env no encontrado en $CLIENTUM"
    fix "cp $CLIENTUM/scripts/ubuntu-local.env.example $ENV_FILE && nano $ENV_FILE"
    return
  fi
  ok ".env encontrado"

  # Requeridas
  DB_URL=$(_env "DATABASE_URL")
  SESSION=$(_env "SESSION_SECRET")
  REPL=$(_env "REPL_ID")
  NODE=$(_env "NODE_ENV")
  PORT=$(_env "PORT")

  if [ -z "$DB_URL" ]; then
    fail "DATABASE_URL — no configurada"
    fix "echo 'DATABASE_URL=postgresql://clientum:PASSWORD@localhost:5432/clientum' >> $ENV_FILE"
  else
    ok "DATABASE_URL"
  fi

  if [ -z "$SESSION" ]; then
    fail "SESSION_SECRET — no configurada (requerida para auth)"
    fix "echo \"SESSION_SECRET=\$(openssl rand -hex 32)\" >> $ENV_FILE"
  elif [ "${#SESSION}" -lt 32 ]; then
    warn "SESSION_SECRET — muy corta (mínimo 32 caracteres recomendado)"
    fix "# Reemplazá SESSION_SECRET en $ENV_FILE con: openssl rand -hex 32"
  else
    ok "SESSION_SECRET"
  fi

  if [ -z "$REPL" ] && [ "$NODE" != "production" ]; then
    warn "REPL_ID — no configurada (requerida en Ubuntu para evitar Replit OIDC)"
    fix "echo 'REPL_ID=local-dev' >> $ENV_FILE"
  else
    ok "REPL_ID / NODE_ENV=${NODE:-development}"
  fi

  if [ -z "$PORT" ]; then
    warn "PORT — no configurada (default 8080)"
    fix "echo 'PORT=8080' >> $ENV_FILE"
  else
    ok "PORT=$PORT"
  fi

  # IA / Chatbot
  OR_KEY=$(_env "OPENROUTER_API_KEY")
  GROQ_KEY=$(_env "GROQ_API_KEY")
  if [ -z "$OR_KEY" ]; then
    warn "OPENROUTER_API_KEY — no configurada (bot no responderá)"
    fix "# Obtener clave gratis en https://openrouter.ai → agregarla en $ENV_FILE"
  else
    ok "OPENROUTER_API_KEY (${#OR_KEY} chars)"
  fi

  if [ -z "$GROQ_KEY" ]; then
    warn "GROQ_API_KEY — no configurada (audios de WhatsApp no se transcriben)"
    fix "# Opcional: obtener clave en https://console.groq.com → agregarla en $ENV_FILE"
  else
    ok "GROQ_API_KEY (${#GROQ_KEY} chars)"
  fi

  # Pagos
  MP_TOKEN=$(_env "MP_ACCESS_TOKEN")
  if [ -z "$MP_TOKEN" ]; then
    warn "MP_ACCESS_TOKEN — no configurada (pagos devolverán 503)"
    fix "# Obtener en https://www.mercadopago.com.ar/developers → agregarla en $ENV_FILE"
  else
    ok "MP_ACCESS_TOKEN"
  fi

  # Producción
  NODE_ENV=$(_env "NODE_ENV")
  if [ "$NODE_ENV" = "production" ]; then
    MP_WH=$(_env "MP_WEBHOOK_SECRET")
    if [ -z "$MP_WH" ]; then
      warn "MP_WEBHOOK_SECRET — requerida en producción para webhooks de MercadoPago"
      fix "echo \"MP_WEBHOOK_SECRET=\$(openssl rand -hex 32)\" >> $ENV_FILE"
    else
      ok "MP_WEBHOOK_SECRET"
    fi
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# 2. BASE DE DATOS
# ─────────────────────────────────────────────────────────────────────────────
check_db() {
  sec "Base de datos"

  # PostgreSQL corriendo
  if ! systemctl is-active --quiet postgresql 2>/dev/null; then
    fail "PostgreSQL no está activo"
    fix "sudo systemctl start postgresql && sudo systemctl enable postgresql"
    return
  fi
  ok "PostgreSQL activo"

  # DB clientum accesible
  if ! sudo -u postgres psql -lqt 2>/dev/null | cut -d\| -f1 | grep -qw "clientum"; then
    fail "DB 'clientum' no existe"
    fix "sudo -u postgres createdb clientum && pnpm --filter @workspace/db run push"
    return
  fi
  ok "DB 'clientum' existe"

  # Tablas principales
  TABLES=$(sudo -u postgres psql -d clientum -t \
    -c "SELECT tablename FROM pg_tables WHERE schemaname='public';" 2>/dev/null | tr -d ' ' | sort | tr '\n' ',')

  for TBL in users sessions subscriptions conversations messages; do
    if echo "$TABLES" | grep -qw "$TBL"; then
      ok "Tabla '$TBL'"
    else
      fail "Tabla '$TBL' no existe"
      fix "pnpm --filter @workspace/db run push   # o: pnpm --filter @workspace/db run migrate"
    fi
  done

  # Conteos de referencia
  USERS=$(sudo -u postgres psql -d clientum -t \
    -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "?")
  SESSIONS=$(sudo -u postgres psql -d clientum -t \
    -c "SELECT COUNT(*) FROM sessions;" 2>/dev/null | tr -d ' ' || echo "?")
  SUBS=$(sudo -u postgres psql -d clientum -t \
    -c "SELECT COUNT(*) FROM subscriptions;" 2>/dev/null | tr -d ' ' || echo "?")
  ok "Usuarios: $USERS  |  Sesiones: $SESSIONS  |  Suscripciones: $SUBS"

  # Admin user
  ADMIN=$(sudo -u postgres psql -d clientum -t \
    -c "SELECT id FROM users WHERE id='admin_clientum';" 2>/dev/null | tr -d ' ')
  if [ -z "$ADMIN" ]; then
    warn "Usuario admin no encontrado (admin_clientum)"
    fix "pnpm --filter @workspace/scripts run seed:admin"
  else
    ok "Usuario admin OK (admin_clientum)"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# 3. BUILD
# ─────────────────────────────────────────────────────────────────────────────
check_build() {
  sec "Build y binarios"

  # pnpm disponible
  if ! command -v pnpm &>/dev/null; then
    fail "pnpm no instalado"
    fix "npm install -g pnpm@latest"
    return
  fi
  PNPM_VER=$(pnpm --version 2>/dev/null || echo "?")
  ok "pnpm $PNPM_VER"

  # Node.js
  NODE_VER=$(node --version 2>/dev/null || echo "no encontrado")
  NODE_MAJOR=$(echo "$NODE_VER" | grep -oP '(?<=v)\d+' | head -1 || echo "0")
  if [ "$NODE_VER" = "no encontrado" ] || [ "${NODE_MAJOR:-0}" -lt 18 ]; then
    fail "Node.js no encontrado o versión muy vieja ($NODE_VER)"
    fix "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
  else
    ok "Node.js $NODE_VER"
  fi

  # dist/ del API server
  DIST_DIR="$CLIENTUM/artifacts/api-server/dist"
  if [ ! -d "$DIST_DIR" ] || [ -z "$(ls -A "$DIST_DIR" 2>/dev/null)" ]; then
    fail "Build de API server no encontrado ($DIST_DIR)"
    fix "pnpm --filter @workspace/api-server run build"
  else
    DIST_FILE=$(ls -t "$DIST_DIR"/*.js 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo "?")
    DIST_AGE_H=$(( ( $(date +%s) - $(stat -c %Y "$DIST_DIR/$DIST_FILE" 2>/dev/null || echo 0) ) / 3600 ))
    if [ "$DIST_AGE_H" -gt 48 ]; then
      warn "Build de API server tiene más de ${DIST_AGE_H}h — puede estar desactualizado"
      fix "pnpm --filter @workspace/api-server run build"
    else
      ok "Build API server OK ($DIST_FILE, hace ${DIST_AGE_H}h)"
    fi
  fi

  # node_modules
  if [ ! -d "$CLIENTUM/node_modules" ]; then
    fail "node_modules no encontrado"
    fix "cd $CLIENTUM && pnpm install"
  else
    ok "node_modules OK"
  fi

  # http-proxy en dependencias raíz (requerido para proxy.mjs)
  if [ ! -d "$CLIENTUM/node_modules/http-proxy" ]; then
    fail "http-proxy no encontrado — proxy.mjs fallará"
    fix "cd $CLIENTUM && pnpm add http-proxy"
  else
    ok "http-proxy instalado"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# 4. EVOLUTION API / WHATSAPP
# ─────────────────────────────────────────────────────────────────────────────
check_evolution() {
  sec "Evolution API / WhatsApp"

  # Detectar servicio activo
  EVO_SVC=""
  EVO_PORT=3000
  if systemctl is-active --quiet evolution-api-lite 2>/dev/null; then
    EVO_SVC="evolution-api-lite"
    ok "Servicio: $EVO_SVC activo"
  elif systemctl is-active --quiet evolution-api 2>/dev/null; then
    EVO_SVC="evolution-api"
    ok "Servicio: $EVO_SVC activo"
  else
    warn "Evolution API no está corriendo"
    fix "bash $CLIENTUM/scripts/whatsapp/instalar-evolution-lite.sh"
    return
  fi

  # Endpoint /manager
  EVO_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 \
    "http://localhost:$EVO_PORT/manager" 2>/dev/null || echo "000")
  if [[ "$EVO_CODE" =~ ^(200|301|302)$ ]]; then
    ok "HTTP :$EVO_PORT → responde (HTTP $EVO_CODE)"
  else
    fail "HTTP :$EVO_PORT → no responde (HTTP $EVO_CODE)"
    fix "sudo systemctl restart $EVO_SVC && sleep 3 && curl http://localhost:$EVO_PORT/manager"
    return
  fi

  # API key de Evolution
  EVO_KEY_FILE="$HOME/.evolution-lite-api-key"
  [ "$EVO_SVC" = "evolution-api" ] && EVO_KEY_FILE="$HOME/.evolution-api-key"

  if [ ! -f "$EVO_KEY_FILE" ]; then
    warn "API key de Evolution no encontrada en $EVO_KEY_FILE"
    fix "cat $EVO_KEY_FILE   # verificar si fue guardada en otro lugar"
  else
    EVO_KEY=$(cat "$EVO_KEY_FILE" 2>/dev/null | tr -d '\n')
    ok "API key de Evolution encontrada (${#EVO_KEY} chars)"

    # Verificar que la key funciona
    EVO_RESP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 \
      -H "apikey: $EVO_KEY" \
      "http://localhost:$EVO_PORT/instance/fetchInstances" 2>/dev/null || echo "000")
    if [ "$EVO_RESP" = "200" ]; then
      ok "API key válida (HTTP 200)"

      # Contar instancias
      INSTANCES=$(curl -s --max-time 3 \
        -H "apikey: $EVO_KEY" \
        "http://localhost:$EVO_PORT/instance/fetchInstances" 2>/dev/null)
      COUNT=$(echo "$INSTANCES" | grep -o '"instance"' | wc -l || echo "0")
      if [ "$COUNT" -eq 0 ]; then
        warn "No hay instancias de WhatsApp creadas"
        fix "bash $CLIENTUM/scripts/whatsapp/conectar-whatsapp.sh"
      else
        # Verificar si alguna está conectada
        CONNECTED=$(echo "$INSTANCES" | grep -c '"CONNECTED"' || echo "0")
        if [ "$CONNECTED" -gt 0 ]; then
          ok "$COUNT instancia(s) — $CONNECTED conectada(s) a WhatsApp"
        else
          warn "$COUNT instancia(s) — ninguna conectada a WhatsApp"
          fix "bash $CLIENTUM/scripts/whatsapp/conectar-whatsapp.sh"
        fi
      fi
    elif [ "$EVO_RESP" = "401" ]; then
      fail "API key de Evolution inválida (HTTP 401)"
      fix "# La key guardada no coincide con la de Evolution. Reinstalar: bash scripts/whatsapp/instalar-evolution-lite.sh"
    else
      warn "No se pudo verificar la API key (HTTP $EVO_RESP)"
    fi
  fi

  # Webhook configurado en .env
  EVO_URL=$(_env "EVOLUTION_API_URL")
  EVO_KEY_ENV=$(_env "EVOLUTION_API_KEY")
  if [ -z "$EVO_URL" ]; then
    warn "EVOLUTION_API_URL — no configurada en .env"
    fix "echo 'EVOLUTION_API_URL=http://localhost:$EVO_PORT' >> $ENV_FILE"
  else
    ok "EVOLUTION_API_URL=$EVO_URL"
  fi
  if [ -z "$EVO_KEY_ENV" ]; then
    warn "EVOLUTION_API_KEY — no configurada en .env"
    KEY_HINT=$([ -f "$EVO_KEY_FILE" ] && cat "$EVO_KEY_FILE" | tr -d '\n' || echo "VER_ARCHIVO")
    fix "echo 'EVOLUTION_API_KEY=$KEY_HINT' >> $ENV_FILE"
  else
    ok "EVOLUTION_API_KEY en .env"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# 5. CHATBOT / IA
# ─────────────────────────────────────────────────────────────────────────────
check_chatbot() {
  sec "Chatbot e IA"

  # Verificar si la API está corriendo
  API_PORT=$(_env "API_PORT"); API_PORT="${API_PORT:-8080}"
  API_PROXY_PORT=$(_env "PROXY_PORT"); API_PROXY_PORT="${API_PROXY_PORT:-5000}"

  HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 \
    "http://localhost:$API_PORT/api/health" 2>/dev/null || echo "000")

  if [ "$HEALTH_CODE" = "200" ]; then
    ok "API server corriendo (:$API_PORT)"
  else
    fail "API server no responde en :$API_PORT (HTTP $HEALTH_CODE)"
    fix "sudo systemctl restart clientum-api && sleep 3 && curl http://localhost:$API_PORT/api/health"
    return
  fi

  # OpenRouter key
  OR_KEY=$(_env "OPENROUTER_API_KEY")
  OR_KEY_PREM=$(_env "OPENROUTER_API_KEY_CLIENTUM")
  if [ -z "$OR_KEY" ]; then
    fail "OPENROUTER_API_KEY no configurada — el bot no responderá"
    fix "# Agregar en $ENV_FILE: OPENROUTER_API_KEY=sk-or-v1-..."
  else
    ok "OPENROUTER_API_KEY configurada"
    # Test rápido a OpenRouter
    OR_TEST=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
      -H "Authorization: Bearer $OR_KEY" \
      "https://openrouter.ai/api/v1/models" 2>/dev/null || echo "000")
    if [ "$OR_TEST" = "200" ]; then
      ok "OpenRouter API → responde OK"
    elif [ "$OR_TEST" = "401" ]; then
      fail "OpenRouter API → clave inválida (HTTP 401)"
      fix "# Verificar la clave en https://openrouter.ai/keys"
    elif [ "$OR_TEST" = "000" ]; then
      warn "OpenRouter API → sin conectividad (¿hay internet?)"
    else
      warn "OpenRouter API → HTTP $OR_TEST"
    fi
  fi

  [ -n "$OR_KEY_PREM" ] && ok "OPENROUTER_API_KEY_CLIENTUM configurada (clave premium)"

  # Groq para audio
  GROQ_KEY=$(_env "GROQ_API_KEY")
  if [ -z "$GROQ_KEY" ]; then
    warn "GROQ_API_KEY no configurada — audios de WhatsApp no se transcribirán"
    fix "# Opcional: https://console.groq.com → agregar GROQ_API_KEY en $ENV_FILE"
  else
    GROQ_TEST=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
      -H "Authorization: Bearer $GROQ_KEY" \
      "https://api.groq.com/openai/v1/models" 2>/dev/null || echo "000")
    if [ "$GROQ_TEST" = "200" ]; then
      ok "GROQ_API_KEY válida — transcripción de audio activa"
    elif [ "$GROQ_TEST" = "401" ]; then
      fail "GROQ_API_KEY inválida (HTTP 401)"
      fix "# Verificar la clave en https://console.groq.com"
    else
      ok "GROQ_API_KEY configurada"
    fi
  fi

  # Chatbot status via API
  STATUS_RESP=$(curl -s --max-time 3 \
    "http://localhost:$API_PORT/api/chatbot/status" 2>/dev/null || echo "{}")
  BOT_ACTIVE=$(echo "$STATUS_RESP" | grep -o '"active":true' | wc -l || echo "0")
  [ "$BOT_ACTIVE" -gt 0 ] && ok "Chatbot activo (al menos 1 instancia)" || \
    warn "No hay chatbots activos — activarlos desde el dashboard"
}

# ─────────────────────────────────────────────────────────────────────────────
# 6. AFIP (Facturación Electrónica)
# ─────────────────────────────────────────────────────────────────────────────
check_afip() {
  sec "AFIP — Facturación Electrónica"

  # ── Tablas en DB ─────────────────────────────────────────────────────────
  if ! sudo -u postgres psql -lqt 2>/dev/null | cut -d\| -f1 | grep -qw "clientum"; then
    warn "DB 'clientum' no accesible — saltando checks de AFIP"
    fix "sudo systemctl start postgresql"
    return
  fi

  AFIP_TABLES=$(sudo -u postgres psql -d clientum -t \
    -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'afip%';" \
    2>/dev/null | tr -d ' \n')

  if echo "$AFIP_TABLES" | grep -q "afip_configs"; then
    ok "Tabla 'afip_configs' existe"
  else
    fail "Tabla 'afip_configs' no existe"
    fix "pnpm --filter @workspace/db run push"
    return
  fi

  if echo "$AFIP_TABLES" | grep -q "afip_comprobantes"; then
    ok "Tabla 'afip_comprobantes' existe"
  else
    fail "Tabla 'afip_comprobantes' no existe"
    fix "pnpm --filter @workspace/db run push"
  fi

  # ── Configuraciones por usuario ──────────────────────────────────────────
  TOTAL_CONFIGS=$(sudo -u postgres psql -d clientum -t \
    -c "SELECT COUNT(*) FROM afip_configs;" 2>/dev/null | tr -d ' ' || echo "0")
  ok "Configs AFIP en DB: $TOTAL_CONFIGS"

  if [ "$TOTAL_CONFIGS" -eq 0 ]; then
    warn "Ningún usuario tiene AFIP configurado"
    fix "# Configurar AFIP desde el dashboard → Facturación → Configurar"
    return
  fi

  CONFIGURED=$(sudo -u postgres psql -d clientum -t \
    -c "SELECT COUNT(*) FROM afip_configs WHERE cuit IS NOT NULL AND cert_pem IS NOT NULL;" \
    2>/dev/null | tr -d ' ' || echo "0")
  PENDING=$(( TOTAL_CONFIGS - CONFIGURED ))

  [ "$CONFIGURED" -gt 0 ] && ok "$CONFIGURED config(s) completa(s) (CUIT + certificado cargado)"
  [ "$PENDING"    -gt 0 ] && warn "$PENDING config(s) incompleta(s) (sin CUIT o sin certificado)"

  # ── Entornos ──────────────────────────────────────────────────────────────
  HOMO_COUNT=$(sudo -u postgres psql -d clientum -t \
    -c "SELECT COUNT(*) FROM afip_configs WHERE environment='homologacion' AND cert_pem IS NOT NULL;" \
    2>/dev/null | tr -d ' ' || echo "0")
  PROD_COUNT=$(sudo -u postgres psql -d clientum -t \
    -c "SELECT COUNT(*) FROM afip_configs WHERE environment='produccion' AND cert_pem IS NOT NULL;" \
    2>/dev/null | tr -d ' ' || echo "0")

  [ "$HOMO_COUNT" -gt 0 ] && ok "Homologación: $HOMO_COUNT usuario(s)"
  [ "$PROD_COUNT" -gt 0 ] && ok "Producción:   $PROD_COUNT usuario(s)"

  # ── Expiración de tokens WSAA ─────────────────────────────────────────────
  AHORA_EPOCH=$(date +%s)

  # Tokens vivos (con expiración futura)
  while IFS='|' read -r USER_ID CUIT EXPIRY ENV; do
    USER_ID=$(echo "$USER_ID" | tr -d ' ')
    CUIT=$(echo "$CUIT" | tr -d ' ')
    EXPIRY=$(echo "$EXPIRY" | tr -d ' ')
    ENV=$(echo "$ENV" | tr -d ' ')
    [ -z "$USER_ID" ] && continue

    if [ -n "$EXPIRY" ] && [ "$EXPIRY" != "NULL" ]; then
      EXP_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || echo "0")
      SECS_LEFT=$(( EXP_EPOCH - AHORA_EPOCH ))
      HORAS_LEFT=$(( SECS_LEFT / 3600 ))

      if [ "$SECS_LEFT" -le 0 ]; then
        fail "Token WSAA vencido — CUIT $CUIT ($ENV)"
        fix "# Token se renueva automáticamente en la próxima factura. O forzar desde API:"
        fix "curl -X POST http://localhost:8080/api/afip/refresh-token -H 'Cookie: sid=<tu-sesion>'"
      elif [ "$HORAS_LEFT" -le 2 ]; then
        warn "Token WSAA vence en ${HORAS_LEFT}h — CUIT $CUIT ($ENV)"
        fix "# Se renovará automáticamente en la próxima operación AFIP"
      else
        ok "Token WSAA válido — CUIT $CUIT ($ENV, vence en ${HORAS_LEFT}h)"
      fi
    else
      warn "Sin token WSAA — CUIT $CUIT ($ENV) (se obtendrá al facturar por primera vez)"
    fi
  done < <(sudo -u postgres psql -d clientum -t \
    -c "SELECT user_id, cuit, token_expiry, environment FROM afip_configs WHERE cert_pem IS NOT NULL ORDER BY environment;" \
    2>/dev/null | grep -v '^$' || true)

  # ── Certificados por vencer (expiración del cert X.509, no del token) ────
  while IFS='|' read -r CUIT CERT_PEM ENV; do
    CUIT=$(echo "$CUIT" | tr -d ' ')
    CERT_PEM=$(echo "$CERT_PEM" | tr -d ' ')
    ENV=$(echo "$ENV" | tr -d ' ')
    [ -z "$CUIT" ] || [ -z "$CERT_PEM" ] && continue

    # Extraer fecha de vencimiento del certificado PEM con openssl
    CERT_EXPIRY=$(echo "$CERT_PEM" | openssl x509 -noout -enddate 2>/dev/null | \
      sed 's/notAfter=//' || echo "")

    if [ -z "$CERT_EXPIRY" ]; then
      warn "CUIT $CUIT — no se pudo leer la fecha de vencimiento del certificado"
      continue
    fi

    CERT_EPOCH=$(date -d "$CERT_EXPIRY" +%s 2>/dev/null || echo "0")
    DAYS_LEFT=$(( (CERT_EPOCH - AHORA_EPOCH) / 86400 ))

    if [ "$DAYS_LEFT" -le 0 ]; then
      fail "Certificado AFIP VENCIDO — CUIT $CUIT ($ENV)"
      fix "# Renovar certificado en AFIP → https://auth.afip.gob.ar/contribuyente_v2/"
      fix "# Luego subir el nuevo .crt desde dashboard → Facturación → Configurar"
    elif [ "$DAYS_LEFT" -le 30 ]; then
      warn "Certificado AFIP vence en ${DAYS_LEFT} días — CUIT $CUIT ($ENV)"
      fix "# Renovar ANTES de que venza: https://auth.afip.gob.ar/contribuyente_v2/"
    elif [ "$DAYS_LEFT" -le 90 ]; then
      warn "Certificado AFIP vence en ${DAYS_LEFT} días — CUIT $CUIT (considerar renovar pronto)"
    else
      ok "Certificado X.509 válido — CUIT $CUIT (vence en ${DAYS_LEFT} días)"
    fi
  done < <(sudo -u postgres psql -d clientum -t \
    -c "SELECT cuit, cert_pem, environment FROM afip_configs WHERE cert_pem IS NOT NULL;" \
    2>/dev/null | grep -v '^$' || true)

  # ── Conectividad con servidores AFIP ────────────────────────────────────
  WSAA_HOMO_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
    "https://wsaahomo.afip.gov.ar/ws/services/LoginCms" 2>/dev/null || echo "000")
  WSAA_PROD_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
    "https://wsaa.afip.gov.ar/ws/services/LoginCms" 2>/dev/null || echo "000")
  WSFE_HOMO_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
    "https://wswhomo.afip.gov.ar/wsfev1/service.asmx" 2>/dev/null || echo "000")
  WSFE_PROD_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
    "https://servicios1.afip.gov.ar/wsfev1/service.asmx" 2>/dev/null || echo "000")

  _afip_endpoint() {
    local LABEL="$1" CODE="$2"
    if [[ "$CODE" =~ ^(200|405|500)$ ]]; then
      ok "$LABEL → responde (HTTP $CODE)"
    elif [ "$CODE" = "000" ]; then
      fail "$LABEL → sin respuesta (¿hay internet? ¿firewall?)"
      fix "# Verificar conectividad: curl -v https://wsaa.afip.gov.ar/ws/services/LoginCms"
    else
      warn "$LABEL → HTTP $CODE (puede ser normal si AFIP tiene mantenimiento)"
    fi
  }

  if [ "$HOMO_COUNT" -gt 0 ]; then
    _afip_endpoint "WSAA Homologación" "$WSAA_HOMO_CODE"
    _afip_endpoint "WSFE Homologación" "$WSFE_HOMO_CODE"
  fi
  if [ "$PROD_COUNT" -gt 0 ]; then
    _afip_endpoint "WSAA Producción" "$WSAA_PROD_CODE"
    _afip_endpoint "WSFE Producción" "$WSFE_PROD_CODE"
  fi

  # ── Comprobantes emitidos ────────────────────────────────────────────────
  COMP_COUNT=$(sudo -u postgres psql -d clientum -t \
    -c "SELECT COUNT(*) FROM afip_comprobantes;" 2>/dev/null | tr -d ' ' || echo "0")
  ok "Comprobantes emitidos en DB: $COMP_COUNT"

  if [ "$COMP_COUNT" -gt 0 ]; then
    LAST_COMP=$(sudo -u postgres psql -d clientum -t \
      -c "SELECT TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') FROM afip_comprobantes ORDER BY created_at DESC LIMIT 1;" \
      2>/dev/null | tr -d ' ' || echo "?")
    ok "Último comprobante: $LAST_COMP"
  fi

  # ── MCP_API_KEY (para servidor MCP) ─────────────────────────────────────
  MCP_KEY=$(_env "MCP_API_KEY")
  if [ -z "$MCP_KEY" ]; then
    warn "MCP_API_KEY no configurada (server MCP usa solo sesión de cookie)"
    fix "echo \"MCP_API_KEY=\$(openssl rand -hex 32)\" >> $ENV_FILE"
  else
    ok "MCP_API_KEY configurada (${#MCP_KEY} chars)"
  fi

  # ── node-forge disponible (requerido para firma PKCS#7) ──────────────────
  FORGE_PATH="$CLIENTUM/node_modules/node-forge"
  if [ -d "$FORGE_PATH" ]; then
    ok "node-forge instalado (PKCS#7 / firma WSAA)"
  else
    fail "node-forge no encontrado — firma WSAA fallará"
    fix "cd $CLIENTUM && pnpm add node-forge"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# 7. TUNNEL / DOMINIO
# ─────────────────────────────────────────────────────────────────────────────
check_tunel() {
  sec "Tunnel / Dominio público"

  DOMINIO=""
  TIPO_TUNEL=""

  # Detectar Cloudflare Tunnel
  if systemctl is-active --quiet cloudflared 2>/dev/null; then
    TIPO_TUNEL="Cloudflare"
    ok "cloudflared → activo"
    if [ -f "$HOME/.cloudflared/config.yml" ]; then
      DOMINIO=$(grep -E '^\s+hostname:' "$HOME/.cloudflared/config.yml" 2>/dev/null | head -1 | awk '{print $2}')
    fi
  fi

  # Detectar Nginx
  if systemctl is-active --quiet nginx 2>/dev/null; then
    TIPO_TUNEL="Nginx"
    ok "nginx → activo"
    if [ -z "$DOMINIO" ]; then
      DOMINIO=$(grep -r 'server_name' /etc/nginx/sites-enabled/ 2>/dev/null | \
        grep -v 'localhost\|_' | head -1 | awk '{print $2}' | tr -d ';')
    fi
  fi

  if [ -z "$TIPO_TUNEL" ]; then
    warn "Sin tunnel ni Nginx configurado — solo accesible en localhost"
    fix "# Opción A (Cloudflare): bash $CLIENTUM/scripts/setup/setup-tunnel.sh tudominio.com.ar"
    fix "# Opción B (Nginx+SSL):  bash $CLIENTUM/scripts/setup/setup-nginx.sh  tudominio.com.ar"
    return
  fi

  ok "Tipo: $TIPO_TUNEL"

  if [ -z "$DOMINIO" ]; then
    warn "Dominio no detectado en config de $TIPO_TUNEL"
    fix "# Revisar configuración de $TIPO_TUNEL"
    return
  fi
  ok "Dominio: $DOMINIO"

  # Verificar conectividad pública
  PUB_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 \
    "https://$DOMINIO/api/health" 2>/dev/null || echo "000")
  if [ "$PUB_CODE" = "200" ]; then
    ok "https://$DOMINIO/api/health → responde (HTTP 200)"
  elif [[ "$PUB_CODE" =~ ^(301|302|401)$ ]]; then
    ok "https://$DOMINIO → responde (HTTP $PUB_CODE)"
  elif [ "$PUB_CODE" = "000" ]; then
    fail "https://$DOMINIO → sin respuesta (¿DNS propagado? ¿SSL listo?)"
    fix "# Verificar DNS: dig $DOMINIO"
    fix "# Ver logs del tunnel: bash $CLIENTUM/scripts/monitoreo/logs.sh tunnel"
  else
    warn "https://$DOMINIO → HTTP $PUB_CODE (puede ser normal)"
  fi

  # REPLIT_DEV_DOMAIN en .env debe coincidir con el dominio
  DEV_DOMAIN=$(_env "REPLIT_DEV_DOMAIN")
  if [ -z "$DEV_DOMAIN" ]; then
    warn "REPLIT_DEV_DOMAIN no configurada en .env (usada para callbacks de auth)"
    fix "echo 'REPLIT_DEV_DOMAIN=$DOMINIO' >> $ENV_FILE"
  elif [ "$DEV_DOMAIN" != "$DOMINIO" ]; then
    warn "REPLIT_DEV_DOMAIN=$DEV_DOMAIN pero tunnel usa $DOMINIO"
    fix "# Actualizar en $ENV_FILE: REPLIT_DEV_DOMAIN=$DOMINIO"
  else
    ok "REPLIT_DEV_DOMAIN=$DEV_DOMAIN ✓"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# DISPATCH
# ─────────────────────────────────────────────────────────────────────────────
case "$FILTER" in
  --env)            check_env       ;;
  --db)             check_db        ;;
  --build)          check_build     ;;
  --evolution)      check_evolution ;;
  --chatbot)        check_chatbot   ;;
  --afip)           check_afip      ;;
  --tunel|--tunnel) check_tunel     ;;
  all|*)
    check_env
    check_db
    check_build
    check_evolution
    check_chatbot
    check_afip
    check_tunel
    ;;
esac

# ─────────────────────────────────────────────────────────────────────────────
# RESUMEN
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

TOTAL_FAIL=${#FAILURES[@]}
TOTAL_WARN=${#WARNINGS[@]}

if [ $TOTAL_FAIL -eq 0 ] && [ $TOTAL_WARN -eq 0 ]; then
  echo -e "${GREEN}  ✅  Todo OK — sistema completamente configurado${NC}"
elif [ $TOTAL_FAIL -eq 0 ]; then
  echo -e "${YELLOW}  ⚠️   $TOTAL_WARN advertencia(s) — revisar los ítems marcados arriba${NC}"
else
  echo -e "${RED}  ❌  $TOTAL_FAIL error(s) críticos, $TOTAL_WARN advertencia(s)${NC}"
fi

if [ ${#FIXES[@]} -gt 0 ]; then
  echo ""
  echo -e "${CYAN}  Comandos sugeridos para resolver los problemas:${NC}"
  i=1
  for F in "${FIXES[@]}"; do
    printf "  ${DIM}%2d.${NC}  %s\n" "$i" "$F"
    i=$(( i + 1 ))
  done
fi

echo ""
echo -e "  ${DIM}health-check completo: bash scripts/monitoreo/health-check.sh${NC}"
echo -e "  ${DIM}estado de servicios:   bash scripts/monitoreo/status.sh${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
