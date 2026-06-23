#!/bin/bash
set -euo pipefail

# ─── Configuración ────────────────────────────────────────────────────────────
DB_NAME="${DB_NAME:-clientum}"
DB_USER="${DB_USER:-clientum}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/clientum}"

# ─── Listar backups disponibles ───────────────────────────────────────────────
echo ""
echo "Backups disponibles en $BACKUP_DIR:"
echo ""

mapfile -t BACKUPS < <(ls -t "$BACKUP_DIR"/clientum_*.sql.gz 2>/dev/null)

if [ ${#BACKUPS[@]} -eq 0 ]; then
  echo "  No hay backups disponibles en $BACKUP_DIR"
  echo "  Ejecutá scripts/db/backup-db.sh primero."
  exit 1
fi

for i in "${!BACKUPS[@]}"; do
  SIZE=$(du -sh "${BACKUPS[$i]}" | cut -f1)
  DATE=$(stat -c '%y' "${BACKUPS[$i]}" | cut -d'.' -f1)
  printf "  [%2d] %-50s %s  (%s)\n" "$((i+1))" "$(basename "${BACKUPS[$i]}")" "$DATE" "$SIZE"
done

echo ""

# ─── Selección interactiva ────────────────────────────────────────────────────
if [ $# -ge 1 ] && [[ "$1" =~ ^[0-9]+$ ]]; then
  SELECTION="$1"
else
  read -rp "Ingresá el número del backup a restaurar (o Enter para el más reciente): " SELECTION
  SELECTION="${SELECTION:-1}"
fi

if ! [[ "$SELECTION" =~ ^[0-9]+$ ]] || [ "$SELECTION" -lt 1 ] || [ "$SELECTION" -gt "${#BACKUPS[@]}" ]; then
  echo "ERROR: Selección inválida: $SELECTION"
  exit 1
fi

BACKUP_FILE="${BACKUPS[$((SELECTION-1))]}"

echo ""
echo "Backup seleccionado: $(basename "$BACKUP_FILE")"
echo ""

# ─── Confirmación ─────────────────────────────────────────────────────────────
read -rp "¿Confirmar restauración de la base de datos '$DB_NAME'? Esto REEMPLAZA los datos actuales. [s/N]: " CONFIRM
if [[ ! "$CONFIRM" =~ ^[sS]$ ]]; then
  echo "Cancelado."
  exit 0
fi

# ─── Restaurar ────────────────────────────────────────────────────────────────
echo ""
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restaurando $DB_NAME desde $(basename "$BACKUP_FILE")..."

# Detener la API para liberar conexiones
sudo systemctl stop clientum-api 2>/dev/null || true

# Esperar a que las conexiones se cierren
sleep 2

# Terminar conexiones activas que queden
sudo -u postgres psql -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
  2>/dev/null || true

sleep 1

# ─── Restaurar en DB temporal y hacer swap atómico ───────────────────────────
TMP_DB="${DB_NAME}_restore_tmp"
OLD_DB="${DB_NAME}_old_$(date +%Y%m%d%H%M%S)"

# Limpiar temp anterior si existe
sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${TMP_DB};" 2>/dev/null || true

# Crear DB temporal y restaurar ahí
sudo -u postgres psql -c "CREATE DATABASE ${TMP_DB} OWNER ${DB_USER};"
gunzip -c "$BACKUP_FILE" | sudo -u postgres psql "${TMP_DB}" > /dev/null

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Datos cargados en DB temporal. Haciendo swap..."

# Verificar que la DB temporal tiene datos antes de hacer el swap
TABLE_COUNT=$(sudo -u postgres psql -d "${TMP_DB}" -t -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$TABLE_COUNT" -eq 0 ]; then
  echo "ERROR: La DB temporal quedó vacía. Abortando para no perder datos."
  sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${TMP_DB};" 2>/dev/null || true
  sudo systemctl start clientum-api 2>/dev/null || true
  exit 1
fi

# Swap: renombrar actual → old, temporal → actual
sudo -u postgres psql -c "ALTER DATABASE ${DB_NAME} RENAME TO ${OLD_DB};"
sudo -u postgres psql -c "ALTER DATABASE ${TMP_DB} RENAME TO ${DB_NAME};"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restauración completada exitosamente."
echo "  DB anterior preservada como: ${OLD_DB}"
echo "  (podés eliminarla con: sudo -u postgres psql -c 'DROP DATABASE ${OLD_DB};')"
echo ""

# ─── Reiniciar API ────────────────────────────────────────────────────────────
sudo systemctl start clientum-api 2>/dev/null || true
echo "[$(date '+%Y-%m-%d %H:%M:%S')] API reiniciada."
echo ""
echo "Listo. Base de datos '$DB_NAME' restaurada desde $(basename "$BACKUP_FILE")"
