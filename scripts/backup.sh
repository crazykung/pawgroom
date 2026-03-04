#!/usr/bin/env bash
# =============================================================================
# PawGroom — Backup Script
# ใช้งาน: bash scripts/backup.sh [--db-only | --full]
# Cron แนะนำ: 0 2 * * * cd /opt/pawgroom && bash scripts/backup.sh --full
# =============================================================================

set -euo pipefail
cd "$(dirname "$0")/.."

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()   { echo -e "${GREEN}[✔]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

MODE=${1:-"--full"}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
RETAIN_DAYS=30  # เก็บ backup กี่วัน

mkdir -p "$BACKUP_DIR"

set -o allexport; source .env 2>/dev/null || true; set +o allexport

# ── Database Backup ────────────────────────────────────────────────────────────
backup_db() {
    local DB_FILE="${BACKUP_DIR}/db_${TIMESTAMP}.sql.gz"
    log "Backup PostgreSQL → $DB_FILE"

    docker compose exec -T postgres \
        pg_dump -U "${POSTGRES_USER:-pawgroom}" "${POSTGRES_DB:-pawgroom}" | \
        gzip -9 > "$DB_FILE"

    local SIZE=$(du -sh "$DB_FILE" | cut -f1)
    log "Database backup: $DB_FILE ($SIZE)"
}

# ── MinIO / Local Files Backup ─────────────────────────────────────────────────
backup_files() {
    local FILES_ARCHIVE="${BACKUP_DIR}/files_${TIMESTAMP}.tar.gz"
    log "Backup uploaded files → $FILES_ARCHIVE"

    if [[ "${STORAGE_DRIVER:-minio}" == "local" ]]; then
        tar -czf "$FILES_ARCHIVE" -C /var/lib/pawgroom uploads/ 2>/dev/null || warn "ไม่พบ upload files"
    else
        # Export MinIO bucket
        docker compose exec -T minio \
            mc mirror myminio/${MINIO_BUCKET:-pawgroom} /tmp/minio_backup/ 2>/dev/null || true
        tar -czf "$FILES_ARCHIVE" -C / tmp/minio_backup/ 2>/dev/null || warn "MinIO backup ล้มเหลว"
        docker compose exec minio rm -rf /tmp/minio_backup/ 2>/dev/null || true
    fi

    local SIZE=$(du -sh "$FILES_ARCHIVE" 2>/dev/null | cut -f1 || echo "0")
    log "Files backup: $FILES_ARCHIVE ($SIZE)"
}

# ── Cleanup old backups ────────────────────────────────────────────────────────
cleanup_old() {
    log "ลบ backup เก่ากว่า $RETAIN_DAYS วัน..."
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETAIN_DAYS -delete 2>/dev/null
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETAIN_DAYS -delete 2>/dev/null
    local COUNT=$(ls "$BACKUP_DIR"/*.gz 2>/dev/null | wc -l || echo "0")
    log "Backup files คงเหลือ: $COUNT ไฟล์"
}

# ── Main ───────────────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PawGroom Backup — $TIMESTAMP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

backup_db

if [[ "$MODE" == "--full" ]]; then
    backup_files
fi

cleanup_old

# ── Summary ───────────────────────────────────────────────────────────────────
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo ""
log "✅ Backup เสร็จสิ้น — Total: $TOTAL_SIZE"
echo ""

# ── Optional: Upload to S3-compatible remote backup ──────────────────────────
# (ถ้าต้องการ offsite backup เพิ่ม script ตรงนี้)
# aws s3 cp "$DB_FILE" "s3://your-backup-bucket/pawgroom/" --sse
