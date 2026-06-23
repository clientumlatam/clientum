# ⚡ Clientum — Comandos Rápidos

> Cheat sheet de todos los scripts y comandos de operación diaria.

---

## 🚀 Setup inicial (desde cero)

```bash
# Opción A — Setup completo (Node + DB + Clientum + Evolution Lite + Tunnel)
bash scripts/setup/setup-completo.sh

# Opción B — Solo instalar Evolution Lite (si Clientum ya corre)
bash scripts/whatsapp/instalar-evolution-lite.sh

# Opción C — Nginx + HTTPS con Let's Encrypt (alternativa a Cloudflare)
bash scripts/setup/setup-nginx.sh clientum.com.ar

# Opción D — Cloudflare Tunnel (dominio propio gratis)
bash scripts/setup/setup-tunnel.sh clientum.com.ar
```

---

## 🔍 Diagnóstico de configuración

```bash
# Diagnóstico completo: env, DB, build, Evolution, chatbot, AFIP, tunnel
bash scripts/monitoreo/diagnostico.sh

# Por módulo
bash scripts/monitoreo/diagnostico.sh --env        # variables de entorno
bash scripts/monitoreo/diagnostico.sh --db         # base de datos
bash scripts/monitoreo/diagnostico.sh --build      # build/binarios
bash scripts/monitoreo/diagnostico.sh --evolution  # Evolution API / WhatsApp
bash scripts/monitoreo/diagnostico.sh --chatbot    # chatbot / IA
bash scripts/monitoreo/diagnostico.sh --afip       # cert, tokens WSAA, conectividad AFIP
bash scripts/monitoreo/diagnostico.sh --tunel      # tunnel / dominio público
```

**`--afip` verifica:** tablas `afip_configs`/`afip_comprobantes`, CUIT + certificado por usuario, token WSAA (vencimiento), certificado X.509 (alerta <90 días, crítico <30), conectividad WSAA+WSFE, `MCP_API_KEY` y `node-forge`.

---

## 📊 Estado del sistema

```bash
# Vista rápida de todos los servicios + HTTP + DB + disco
bash scripts/monitoreo/status.sh

# Health check completo (más detallado, con alertas)
bash scripts/monitoreo/health-check.sh
```

---

## ⏹️ Detener servicios

```bash
bash scripts/ops/stop.sh              # Clientum (proxy + API + Vite)
bash scripts/ops/stop.sh --api        # solo API
bash scripts/ops/stop.sh --evolution  # solo Evolution API
bash scripts/ops/stop.sh --all        # todo (Clientum + Evolution + Cloudflare)

# Volver a arrancar
sudo systemctl start clientum-api clientum-vite clientum-proxy
```

---

## 🔔 Monitoreo automático (alertas por WhatsApp)

```bash
bash scripts/monitoreo/monitoreo.sh --status          # ver estado del monitor
bash scripts/monitoreo/monitoreo.sh --setup-cron      # instalar cron (cada 5 min)
bash scripts/monitoreo/monitoreo.sh --setup-cron 10   # cron personalizado (10 min)
bash scripts/monitoreo/monitoreo.sh --remove-cron     # desinstalar cron
bash scripts/monitoreo/monitoreo.sh --test-alerta     # alerta de prueba
bash scripts/monitoreo/monitoreo.sh                   # chequeo manual
tail -f /var/log/clientum-monitor.log                 # ver log
```

Variables requeridas en `.env`:
```env
MONITOR_WA_NUMBER=5492984510883   # número sin +
MONITOR_WA_INSTANCE=clientum
MONITOR_INTERVALO=5               # minutos entre chequeos
MONITOR_DISCO_MAX=85              # % disco para alertar
MONITOR_RAM_MAX=90                # % RAM para alertar
```

---

## 📋 Reporte diario por WhatsApp

```bash
bash scripts/monitoreo/reporte-diario.sh --status         # ver estado
bash scripts/monitoreo/reporte-diario.sh --setup-cron     # cron 8:00 AM
bash scripts/monitoreo/reporte-diario.sh --setup-cron "30 7"  # cron 7:30 AM
bash scripts/monitoreo/reporte-diario.sh --remove-cron    # desinstalar
bash scripts/monitoreo/reporte-diario.sh --preview        # ver en terminal
bash scripts/monitoreo/reporte-diario.sh                  # enviar ahora
tail -f /var/log/clientum-reporte.log
```

---

## 📋 Logs

```bash
bash scripts/monitoreo/logs.sh            # todos los servicios (follow)
bash scripts/monitoreo/logs.sh api        # API Express
bash scripts/monitoreo/logs.sh evo        # Evolution API / WhatsApp
bash scripts/monitoreo/logs.sh vite       # frontend Vite
bash scripts/monitoreo/logs.sh proxy      # proxy
bash scripts/monitoreo/logs.sh tunnel     # Cloudflare Tunnel
bash scripts/monitoreo/logs.sh --errors   # solo errores (última hora)

# Directo con journalctl
sudo journalctl -f -u clientum-api -u clientum-vite -u clientum-proxy -u evolution-api-lite
journalctl -u clientum-api -p err --since "24 hours ago"
```

---

## 🔄 Actualizar código

```bash
bash scripts/ops/update.sh             # pull + install + build + restart
bash scripts/ops/update.sh --no-pull   # solo rebuild (sin git pull)
bash scripts/ops/update.sh --api-only  # solo reiniciar API
```

---

## 📱 WhatsApp / Evolution API

```bash
# Instalar
bash scripts/whatsapp/instalar-evolution-lite.sh      # Lite (recomendado)
bash scripts/whatsapp/instalar-evolution.sh           # completo

# Actualizar Lite
bash scripts/whatsapp/actualizar-evolution-lite.sh
bash scripts/whatsapp/actualizar-evolution-lite.sh --check   # ver si hay updates
bash scripts/whatsapp/actualizar-evolution-lite.sh --force   # forzar rebuild

# Conectar número de WhatsApp (muestra QR en terminal)
bash scripts/whatsapp/conectar-whatsapp.sh
bash scripts/whatsapp/conectar-whatsapp.sh mi-negocio

# Estado y control
sudo systemctl status evolution-api-lite
sudo systemctl restart evolution-api-lite
bash scripts/monitoreo/logs.sh evo
```

---

## 🗄️ Base de datos

```bash
bash scripts/db/backup-db.sh         # backup manual → /var/backups/clientum/
bash scripts/db/restore-db.sh        # restaurar (interactivo)
bash scripts/db/restore-db.sh 1      # restaurar el más reciente

pnpm --filter @workspace/db run push            # sync schema (solo dev)
pnpm --filter @workspace/db run generate        # generar migración SQL
pnpm --filter @workspace/db run migrate         # aplicar migraciones (producción)

sudo -u postgres psql clientum                  # abrir psql
sudo -u postgres psql clientum -c "SELECT id, user_id, expires_at FROM sessions ORDER BY expires_at DESC LIMIT 10;"
sudo -u postgres psql clientum -c "DELETE FROM sessions WHERE expires_at < NOW();"

ls -lh /var/backups/clientum/                   # ver backups disponibles
```

---

## ⚙️ Servicios systemd

```bash
sudo systemctl status clientum-api clientum-vite clientum-proxy evolution-api-lite cloudflared
sudo systemctl restart clientum-api clientum-vite clientum-proxy
sudo systemctl enable clientum-api clientum-vite clientum-proxy evolution-api-lite
bash scripts/setup/instalar-servicios.sh   # reinstalar unit files
sudo journalctl -u clientum-api --since today | grep -c "Started"   # contar reinicios
```

Unit files disponibles en `deployment/systemd/`:
- `clientum-api.service`
- `clientum-vite.service`
- `clientum-proxy.service`
- `evolution-api.service`
- `evolution-api-lite.service`

---

## 🏗️ Make — todos los comandos

```bash
make help             # ver todos los comandos disponibles

# Desarrollo
make dev              # arrancar todo en modo desarrollo (proxy + API + Vite)
make build            # compilar API + typecheck
make typecheck        # typecheck TypeScript
make seed             # crear usuario admin (info@clientum.com.ar)
make push             # sync schema DB (dev)
make migrate          # generar + aplicar migraciones (producción)
make codegen          # regenerar hooks/schemas desde OpenAPI spec

# Operaciones Ubuntu (systemd)
make stop             # detener servicios
make status           # ver estado de todos los servicios
make logs             # ver logs de todos los servicios
make backup           # backup manual de la base de datos
make update           # git pull + rebuild + restart
```

---

## 🔐 Credenciales guardadas

```bash
cat ~/.clientum-db-credentials    # credenciales de DB
cat ~/.evolution-lite-api-key     # API key Evolution Lite
cat ~/.evolution-api-key          # API key Evolution completo
cat ~/clientum/.env               # variables de entorno
nano ~/clientum/.env              # editar .env
```

---

## 🧹 Mantenimiento

```bash
sudo journalctl --vacuum-time=30d          # limpiar logs systemd >30 días
pnpm store prune                           # limpiar cache node_modules
df -h /                                    # espacio en disco
du -sh ~/evolution-lite ~/evolution ~/clientum/node_modules /var/backups/clientum
```

---

## 🆘 Troubleshooting rápido

| Problema | Solución |
|---|---|
| No sé por dónde empezar | `bash scripts/monitoreo/diagnostico.sh` |
| API no responde | `bash scripts/monitoreo/logs.sh api` |
| Bot no responde | `bash scripts/monitoreo/diagnostico.sh --chatbot` |
| AFIP no factura / token vencido | `bash scripts/monitoreo/diagnostico.sh --afip` |
| WhatsApp desconectado | `bash scripts/whatsapp/conectar-whatsapp.sh` |
| QR expirado | Dashboard → Conectar WhatsApp → nuevo QR |
| Evolution no arranca | `bash scripts/monitoreo/diagnostico.sh --evolution` |
| Dominio no abre | `bash scripts/monitoreo/logs.sh tunnel` |
| DB inaccesible | `sudo systemctl restart postgresql` |
| Disco lleno | `sudo journalctl --vacuum-time=30d && pnpm store prune` |
| Deploy roto | `bash scripts/ops/update.sh --no-pull` |
| Sesiones vencidas | `sudo -u postgres psql clientum -c "DELETE FROM sessions WHERE expires_at < NOW();"` |
| No llegan alertas WA | `bash scripts/monitoreo/monitoreo.sh --test-alerta` |
| Detener todo | `bash scripts/ops/stop.sh --all` |
| Env mal configurado | `bash scripts/monitoreo/diagnostico.sh --env` |
