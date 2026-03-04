#!/usr/bin/env bash
# =============================================================================
# PawGroom — Deploy Script
# ใช้งาน: bash scripts/deploy.sh [--build | --update | --rollback]
# =============================================================================

set -euo pipefail
cd "$(dirname "$0")/.."

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()     { echo -e "${GREEN}[✔]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info()    { echo -e "${BLUE}[→]${NC} $1"; }

MODE=${1:-"--build"}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     PawGroom Deploy — $TIMESTAMP     ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo ""

# โหลด .env
[[ -f .env ]] || error "ไม่พบ .env กรุณา cp .env.example .env"
set -o allexport; source .env; set +o allexport

validate_env() {
    local required_vars=("DOMAIN" "POSTGRES_PASSWORD" "REDIS_PASSWORD" "JWT_ACCESS_SECRET" "JWT_REFRESH_SECRET" "MINIO_ROOT_PASSWORD")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "ตัวแปร $var ยังไม่ได้ตั้งค่าใน .env"
        fi
        if [[ "${!var}" == *"CHANGE_ME"* ]]; then
            error "กรุณาเปลี่ยน $var จากค่า default ใน .env ก่อน deploy!"
        fi
    done
    log "Environment variables ตรวจสอบผ่าน ✓"
}

# ─────────────────────────────────────────────────────────────────────────────
if [[ "$MODE" == "--build" ]] || [[ "$MODE" == "--update" ]]; then

    validate_env

    # ── Build images ──────────────────────────────────────────────────────────
    if [[ "$MODE" == "--build" ]]; then
        info "กำลัง build Docker images..."
        docker compose build --no-cache --parallel
        log "Build เสร็จสิ้น"
    fi

    # ── Pull latest images (for services without build) ──────────────────────
    info "Pull images ล่าสุด..."
    docker compose pull postgres redis nginx minio 2>/dev/null || true

    # ── Backup DB ก่อน update ────────────────────────────────────────────────
    if docker compose ps postgres --quiet 2>/dev/null | grep -q .; then
        info "Backup database ก่อน update..."
        bash scripts/backup.sh --db-only 2>/dev/null || warn "Backup ล้มเหลว (ข้ามไป)"
    fi

    # ── Start/Restart services ─────────────────────────────────────────────
    info "เริ่มต้น services..."
    docker compose up -d --remove-orphans

    # ── Wait for services ─────────────────────────────────────────────────────
    info "รอ services พร้อม..."
    sleep 10

    # ── Health checks ─────────────────────────────────────────────────────────
    MAX_WAIT=120
    WAITED=0
    while [[ $WAITED -lt $MAX_WAIT ]]; do
        if curl -sf http://localhost/health > /dev/null 2>&1; then
            log "API health check ผ่าน ✓"
            break
        fi
        sleep 5
        WAITED=$((WAITED + 5))
        echo -n "."
    done
    echo ""

    if [[ $WAITED -ge $MAX_WAIT ]]; then
        warn "Health check timeout — ตรวจสอบ logs:"
        docker compose logs --tail=30 api
        error "Deploy ล้มเหลว"
    fi

    # ── Prisma migrations ─────────────────────────────────────────────────────
    info "รัน database migrations..."
    docker compose exec api npx prisma migrate deploy
    log "Migrations เสร็จสิ้น"

    # ── Prisma seed (only on first deploy) ───────────────────────────────────
    if [[ "$MODE" == "--build" ]]; then
        info "Seed ข้อมูลเริ่มต้น..."
        docker compose exec api npx prisma db seed 2>/dev/null || warn "Seed ข้ามไป (อาจมีข้อมูลอยู่แล้ว)"
    fi

    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║       Deploy สำเร็จ! ✅                     ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo -e " 🌐  https://${DOMAIN}"
    echo -e " 📦  MinIO Console: https://${DOMAIN}/minio-console"
    echo ""

# ─────────────────────────────────────────────────────────────────────────────
elif [[ "$MODE" == "--rollback" ]]; then

    warn "⚠️  กำลัง Rollback..."
    LAST_BACKUP=$(ls -t backups/db_*.sql.gz 2>/dev/null | head -1)
    if [[ -z "$LAST_BACKUP" ]]; then
        error "ไม่พบ backup file ใน backups/"
    fi
    log "ใช้ backup: $LAST_BACKUP"

    docker compose stop api web
    docker compose exec postgres psql -U ${POSTGRES_USER:-pawgroom} -c "DROP DATABASE IF EXISTS ${POSTGRES_DB:-pawgroom};"
    docker compose exec postgres psql -U ${POSTGRES_USER:-pawgroom} -c "CREATE DATABASE ${POSTGRES_DB:-pawgroom};"
    gunzip -c "$LAST_BACKUP" | docker compose exec -T postgres psql -U ${POSTGRES_USER:-pawgroom} ${POSTGRES_DB:-pawgroom}
    docker compose start api web
    log "Rollback เสร็จสิ้น"

else
    error "Usage: $0 [--build | --update | --rollback]"
fi
