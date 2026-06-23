#!/bin/bash
set -euo pipefail

# ─── Configuración ────────────────────────────────────────────────────────────
DB_NAME="${DB_NAME:-clientum}"
DB_USER="${DB_USER:-postgres}"          # usar postgres para evitar problemas de autenticación
BACKUP_DIR="${BACKUP_DIR:-/var/backups/clientum}"
KEEP_DAYS="${KEEP_DAYS:-7}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/clientum_${TIMESTAMP}.sql.gz"

# ─── Crear directorio si no existe ────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

# ─── Backup ───────────────────────────────────────────────────────────────────
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando backup de $DB_NAME..."

# Usar sudo -u postgres para garantizar autenticación peer sin .pgpass
sudo -u postgres pg_dump "$DB_NAME" | gzip > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completado: $BACKUP_FILE ($SIZE)"

# ─── Rotación: eliminar backups más viejos que KEEP_DAYS días ─────────────────
DELETED=$(find "$BACKUP_DIR" -name "clientum_*.sql.gz" -mtime +"${KEEP_DAYS}" -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Eliminados $DELETED backup(s) con más de $KEEP_DAYS días"
fi

# ─── Listar backups actuales ──────────────────────────────────────────────────
echo ""
echo "Backups disponibles en $BACKUP_DIR:"
ls -lh "$BACKUP_DIR"/clientum_*.sql.gz 2>/dev/null || echo "  (ninguno)"
