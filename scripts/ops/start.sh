#!/bin/bash
set -e

echo "=== Verificando lockfile ==="
if [ ! -f "pnpm-lock.yaml" ]; then
  echo "❌ No se encontró pnpm-lock.yaml. Verificá que el proyecto está completo."
  exit 1
fi

echo "=== Installing dependencies ==="
CI=true pnpm install

echo "=== Pushing database schema ==="
pnpm --filter @workspace/db run push --force 2>/dev/null || \
  echo "DB push skipped (schema already up to date)"

echo "=== Building API server ==="
pnpm --filter @workspace/api-server run build

echo "=== Starting proxy ==="
# Los workflows individuales manejan API (:8080) y Vite (:21496).
# Este workflow solo corre el proxy que los une en el puerto :5000.
node proxy.mjs
