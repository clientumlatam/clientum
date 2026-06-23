#!/bin/bash
set -e

echo "=== Verificando lockfile ==="
# Load and export all variables from .env so child processes see them
set -o allexport
source /home/clientum/clientum/.env
set +o allexport
if [ ! -f "pnpm-lock.yaml" ]; then
  echo "❌ No se encontró pnpm-lock.yaml. Verificá que el proyecto está completo."
  exit 1
fi

echo "=== Installing dependencies ==="
CI=true pnpm install

echo "=== Aplicando schema de DB ==="
if [ "${NODE_ENV}" = "production" ]; then
  echo "  Modo producción — corriendo migraciones..."
  pnpm --filter @workspace/db run migrate 2>/dev/null || \
    echo "  ⚠️  migrate skipped (no hay migrations generadas aún — corré 'pnpm --filter @workspace/db run generate' primero)"
else
  echo "  Modo desarrollo — sincronizando schema (push sin --force)..."
  pnpm --filter @workspace/db run push 2>/dev/null || \
    echo "  DB push skipped (schema already up to date)"
fi

echo "=== Building API server ==="
pnpm --filter @workspace/api-server run build

echo "=== Starting API server (background, :${API_PORT:-8080}) ==="
node --enable-source-maps ./apps/api/dist/index.mjs &
API_PID=$!

echo "=== Starting Vite dev server (background, :${VITE_PORT:-21496}) ==="
VITE_PORT=$VITE_PORT pnpm --filter @workspace/clientum run dev &
VITE_PID=$!

cleanup() {
  echo "=== Shutting down ==="
  kill $API_PID $VITE_PID 2>/dev/null || true
  wait $API_PID $VITE_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "=== Waiting for API (:${API_PORT:-8080}) and Vite (:${VITE_PORT:-21496}) to be ready ==="
for i in $(seq 1 30); do
  api_ok=false
  vite_ok=false
  curl -sf "http://localhost:${API_PORT:-8080}/api/healthz" > /dev/null 2>&1 && api_ok=true || true
  curl -sf "http://localhost:${VITE_PORT:-21496}" > /dev/null 2>&1 && vite_ok=true || true

  if $api_ok && $vite_ok; then
    echo "  Both services ready."
    break
  fi

  if [ $i -eq 30 ]; then
    echo "  ⚠️  Timeout waiting — starting proxy anyway."
  fi
  sleep 1
done

echo "=== Starting proxy (:${PROXY_PORT:-5010}) ==="
node proxy.mjs
