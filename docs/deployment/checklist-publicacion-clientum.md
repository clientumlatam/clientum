# ✅ Checklist de publicación — clientum.com.ar

> Última revisión: junio 2026

---

## 1. Pre-publicación

- [ ] Dominio `clientum.com.ar` apunta a Cloudflare (nameservers cambiados en NIC Argentina)
- [ ] Google OAuth configurado con callback URLs correctos:
  - [ ] `https://clientum.com.ar/api/auth/google/callback`
  - [ ] `https://www.clientum.com.ar/api/auth/google/callback`
- [ ] `.env` completado con `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`
- [ ] `SESSION_SECRET` generado con `openssl rand -hex 32`
- [ ] `DATABASE_URL` apunta al PostgreSQL local
- [ ] `REPL_ID=local-dev` en `.env` (deshabilita Replit OIDC)
- [ ] `MP_WEBHOOK_SECRET` seteado — obligatorio en `NODE_ENV=production`
- [ ] `OPENROUTER_API_KEY` seteado para que el chatbot funcione
- [ ] `NODE_ENV=production` en `.env`

---

## 2. Setup verificado

- [ ] Schema de DB aplicado: `pnpm --filter @workspace/db run push`
- [ ] Admin seed ejecutado: `pnpm --filter @workspace/scripts run seed:admin`
- [ ] Los 3 servicios en status `active`:
  - [ ] `clientum-api` (puerto 8080)
  - [ ] `clientum-vite` (puerto 21496)
  - [ ] `clientum-proxy` (puerto 5000)
- [ ] `cloudflared` en status `active`
- [ ] Evolution API instalada y conectada (si hay número de WhatsApp disponible)

```bash
# Verificar estado de todos los servicios
bash scripts/monitoreo/status.sh
```

---

## 3. Verificación funcional

- [ ] Landing page carga en `https://clientum.com.ar`
- [ ] Login con Google funciona en `https://clientum.com.ar`
- [ ] Dashboard accesible en `https://clientum.com.ar/dashboard`
- [ ] Widget del chatbot visible y funcional en la landing
- [ ] Webhook del chatbot accesible: `https://clientum.com.ar/api/chatbot/webhook`

```bash
curl https://clientum.com.ar/api/auth/user
curl https://clientum.com.ar/api/healthz
```

---

## 4. Post-publicación

- [ ] Monitoreo automático configurado (chequeo cada 5 min):
  ```bash
  bash scripts/monitoreo/monitoreo.sh --setup-cron
  ```
- [ ] Reporte diario configurado (envío a las 8:00 AM por WhatsApp):
  ```bash
  bash scripts/monitoreo/reporte-diario.sh --setup-cron
  ```
- [ ] Backup automático verificado:
  ```bash
  crontab -l | grep backup
  ```
- [ ] Alerta de prueba enviada por WhatsApp:
  ```bash
  bash scripts/monitoreo/monitoreo.sh --test-alerta
  ```

---

## Variables de entorno requeridas — referencia rápida

| Variable | Requerida | Cómo obtenerla |
|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://clientum:PASSWORD@localhost:5432/clientum` |
| `SESSION_SECRET` | ✅ | `openssl rand -hex 32` |
| `REPL_ID` | ✅ | poner `local-dev` |
| `NODE_ENV` | ✅ | `production` |
| `PORT` | ✅ | `8080` |
| `MP_WEBHOOK_SECRET` | ✅ en prod | `openssl rand -hex 32` |
| `OPENROUTER_API_KEY` | — | https://openrouter.ai |
| `GOOGLE_CLIENT_ID` | — | console.cloud.google.com |
| `GOOGLE_CLIENT_SECRET` | — | console.cloud.google.com |
| `MP_ACCESS_TOKEN` | — | https://mercadopago.com.ar/developers |
| `RESEND_API_KEY` | — | https://resend.com (3000 emails/mes gratis) |
| `GROQ_API_KEY` | — | https://console.groq.com (transcripción de audios WA) |
| `MONITOR_WA_NUMBER` | — | Número que recibe alertas y reportes |
| `MONITOR_WA_INSTANCE` | — | Nombre de la instancia Evolution |

---

## Troubleshooting rápido

| Síntoma | Solución |
|---|---|
| No sé por dónde empezar | `bash scripts/monitoreo/diagnostico.sh` |
| API no responde | `bash scripts/monitoreo/logs.sh api` |
| Bot no responde | `bash scripts/monitoreo/diagnostico.sh --chatbot` |
| WhatsApp desconectado | `bash scripts/whatsapp/conectar-whatsapp.sh` |
| Dominio no abre | `bash scripts/monitoreo/logs.sh tunnel` |
| 502 Bad Gateway | `sudo systemctl restart clientum-proxy` |
| DB inaccesible | `sudo systemctl restart postgresql` |
| Servidor falla al arrancar | Verificar `NODE_ENV=production` + `MP_WEBHOOK_SECRET` en `.env` |
| Login falla en prod | Verificar redirect URI Google OAuth |
| Cloudflare no rutea | Proxy status debe ser ☁️ naranja (Proxied), no gris |
| No llegan alertas WA | `bash scripts/monitoreo/monitoreo.sh --test-alerta` |
| Detener todo | `bash scripts/ops/stop.sh --all` |

---

*Ver también:*
- `docs/deployment/checklist-publicar-cloudflare.md` — guía paso a paso de Cloudflare Tunnel
- `docs/deployment/comandos-rapidos.md` — cheat sheet de todos los comandos
- `deployment/systemd/` — unit files de systemd
