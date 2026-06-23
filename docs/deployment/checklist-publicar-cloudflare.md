# 🌐 Publicar Clientum en clientum.com.ar — Todo Gratis

> Guía completa para publicar con dominio propio usando Cloudflare Tunnel, Google OAuth y Ubuntu.

---

## Herramientas requeridas (todas gratuitas)

| Herramienta | Para qué | Gratis |
|---|---|---|
| **Cloudflare** | DNS + Tunnel (exponer servidor al mundo) | ✅ siempre gratis |
| **Google Cloud** | OAuth para login de usuarios | ✅ sin costo para uso normal |
| **Ubuntu 22.04** | Servidor donde corre la app | ✅ PC propia, Oracle Cloud, etc. |
| **PostgreSQL** | Base de datos | ✅ auto-instalado |
| **Node.js 20** | Runtime | ✅ auto-instalado |

> **Servidor gratuito recomendado:** Oracle Cloud Free Tier — 2 VMs AMD siempre gratis (1 OCPU, 1 GB RAM), Ubuntu 22.04, sin tarjeta de crédito.

---

## Paso 1 — Configurar Google OAuth (15 min)

- [ ] Ir a [console.cloud.google.com](https://console.cloud.google.com) → Crear proyecto → `clientum-produccion`
- [ ] APIs y servicios → Pantalla de consentimiento OAuth → Externo → Crear
  - Nombre: `Clientum` · Email de soporte: tu email
- [ ] APIs y servicios → Credenciales → Crear credenciales → OAuth 2.0
  - Tipo: **Aplicación web**
  - URIs de redireccionamiento autorizados:
    ```
    https://clientum.com.ar/api/auth/google/callback
    https://www.clientum.com.ar/api/auth/google/callback
    ```
- [ ] Copiar **Client ID** y **Client Secret** → guardar para el `.env`

---

## Paso 2 — Preparar el servidor Ubuntu

```bash
# Si es servidor nuevo / Oracle Cloud
git clone https://github.com/TU_USUARIO/clientum.git ~/clientum
cd ~/clientum
bash scripts/setup/setup-completo.sh

# Si ya tenés el repo clonado
cd ~/clientum && git pull && pnpm install
```

---

## Paso 3 — Variables de entorno de producción

```bash
cp ubuntu-local.env.example .env
nano .env
```

```env
NODE_ENV=production
PORT=8080
API_PORT=8080
VITE_PORT=21496
PROXY_PORT=5000
BASE_PATH=/

REPL_ID=local-dev                          # deshabilita Replit OIDC
GOOGLE_CLIENT_ID=123456-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxx

DATABASE_URL=postgresql://clientum:TU_PASSWORD@localhost:5432/clientum
SESSION_SECRET=                            # openssl rand -hex 32

OPENROUTER_API_KEY=sk-or-v1-...           # requerido para chatbot
# GROQ_API_KEY=gsk_...                    # opcional: transcripción de audios WA
# MP_ACCESS_TOKEN=APP_USR-...             # opcional: pagos MercadoPago
# MP_WEBHOOK_SECRET=                      # openssl rand -hex 32 (requerido en prod)
```

---

## Paso 4 — Base de datos y arranque

```bash
# Crear DB (si no existe)
sudo -u postgres psql -c "CREATE USER clientum WITH PASSWORD 'TU_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE clientum OWNER clientum;"

# Aplicar schema
pnpm --filter @workspace/db run push

# Crear usuario admin
pnpm --filter @workspace/scripts run seed:admin

# Compilar API
pnpm --filter @workspace/api-server run build

# Instalar servicios systemd
bash scripts/setup/instalar-servicios.sh

# Verificar
sudo systemctl status clientum-api clientum-vite clientum-proxy
```

---

## Paso 5 — Cloudflare Tunnel

### 5a. Agregar dominio a Cloudflare
- [ ] [dash.cloudflare.com](https://dash.cloudflare.com) → Add site → `clientum.com.ar` → Plan Free
- [ ] En NIC Argentina: cambiar nameservers a los que da Cloudflare
- [ ] Esperar propagación (generalmente < 1 hora)

### 5b. Ejecutar script de tunnel
```bash
bash scripts/setup/setup-tunnel.sh clientum.com.ar
```
El script instala `cloudflared`, autentica con Cloudflare, crea el tunnel, configura DNS CNAME e instala el servicio systemd.

### 5c. Verificar
```bash
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -f
```

---

## Paso 6 — Verificación final

```bash
# Local
curl http://localhost:5000/api/auth/user

# Desde internet
curl https://clientum.com.ar/api/auth/user
curl https://clientum.com.ar/api/healthz
```

Abrir en el browser: `https://clientum.com.ar`

---

## Arquitectura de tráfico

```
Usuario (internet)
        │
        ▼
Cloudflare Edge (CDN + HTTPS gratis)
        │ Cloudflare Tunnel
        ▼
Servidor Ubuntu (cualquier IP)
        │
        ▼
proxy.mjs :5000
   ├─ /api/*  ──►  API Express :8080
   ├─ /mcp/*  ──►  MCP Server
   └─ resto   ──►  Vite frontend :21496
```

---

## ✅ Checklist final antes de publicar

- [ ] Dominio `clientum.com.ar` apunta a Cloudflare (nameservers cambiados en NIC Argentina)
- [ ] Google OAuth configurado con los callback URLs correctos
- [ ] `.env` completado con `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `DATABASE_URL`
- [ ] `REPL_ID=local-dev` en `.env`
- [ ] Schema de DB aplicado: `pnpm --filter @workspace/db run push`
- [ ] Admin seed ejecutado: `pnpm --filter @workspace/scripts run seed:admin`
- [ ] Los 3 servicios en status `active`: `clientum-api`, `clientum-vite`, `clientum-proxy`
- [ ] `cloudflared` en status `active`
- [ ] Login con Google funciona en `https://clientum.com.ar`
- [ ] Dashboard accesible en `https://clientum.com.ar/dashboard`

---

## Troubleshooting frecuente

| Síntoma | Solución |
|---|---|
| 502 Bad Gateway | `sudo systemctl restart clientum-proxy` |
| Login no funciona / `google_not_configured` | Verificar `REPL_ID=local-dev` + `GOOGLE_CLIENT_ID/SECRET` en `.env` → restart API |
| Tunnel no conecta | `sudo journalctl -u cloudflared -n 50` → re-autenticar con `cloudflared tunnel login` |
| Puerto 8080 en uso | `sudo ss -tlnp \| grep 8080` → restart `clientum-api` |
| Chatbot no responde | Agregar `OPENROUTER_API_KEY` en `.env` → restart API |
| Cloudflare no rutea | Proxy status debe ser ☁️ naranja (Proxied), no gris (DNS only) |

---

## Mantenimiento operativo

```bash
# Actualizar código
cd ~/clientum && git pull
bash scripts/ops/rebuild.sh   # install + build + restart

# Reiniciar servicios individualmente
sudo systemctl restart clientum-api      # tras cambios en backend
sudo systemctl restart clientum-vite     # tras cambios en frontend
sudo systemctl restart cloudflared       # si el tunnel falla

# Logs en tiempo real
journalctl -f -u clientum-api -u clientum-vite -u clientum-proxy -u cloudflared

# Solo errores (últimas 24 hs)
journalctl -u clientum-api -p err --since "24 hours ago"

# Backup manual
bash scripts/db/backup-db.sh

# Restaurar backup (interactivo)
bash scripts/db/restore-db.sh

# Uso de disco
df -h / && du -sh /var/backups/clientum/
```

---

*Ver también:*
- `docs/deployment/checklist-publicacion-clientum.md` — checklist de publicación
- `docs/deployment/comandos-rapidos.md` — cheat sheet de todos los comandos
- `deployment/systemd/` — unit files de systemd
- `scripts/setup/setup-tunnel.sh` — script de Cloudflare Tunnel
- `scripts/ops/rebuild.sh` — actualización de código en producción
