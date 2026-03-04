#!/usr/bin/env bash
# =============================================================================
# PawGroom — Monitor / Status Script
# ใช้งาน: bash scripts/monitor.sh
# =============================================================================

set -euo pipefail
cd "$(dirname "$0")/.."

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
BOLD='\033[1m'

source .env 2>/dev/null || true

echo -e "${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║          PawGroom — System Status Monitor            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Docker Services ───────────────────────────────────────────────────────────
echo -e "${BOLD}📦 Docker Services:${NC}"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null

echo ""

# ── Health Checks ─────────────────────────────────────────────────────────────
echo -e "${BOLD}🏥 Health Checks:${NC}"

check_service() {
    local name="$1"
    local cmd="$2"
    if eval "$cmd" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✔${NC} $name"
    else
        echo -e "  ${RED}✗${NC} $name — ${RED}DOWN${NC}"
    fi
}

check_service "PostgreSQL"  "docker compose exec -T postgres pg_isready -U ${POSTGRES_USER:-pawgroom} -q"
check_service "Redis"       "docker compose exec -T redis redis-cli -a '${REDIS_PASSWORD:-}' ping | grep -q PONG"
check_service "MinIO"       "curl -sf http://localhost:9000/minio/health/live"
check_service "API"         "curl -sf http://localhost/health"
check_service "Web"         "curl -sf http://localhost/ | grep -q html"
check_service "Nginx"       "docker compose exec -T nginx nginx -t -q"

echo ""

# ── Resource Usage ────────────────────────────────────────────────────────────
echo -e "${BOLD}📊 Resource Usage:${NC}"
docker stats --no-stream --format "  {{.Name}}: CPU={{.CPUPerc}} MEM={{.MemUsage}} NET={{.NetIO}}" \
    pawgroom_postgres pawgroom_redis pawgroom_api pawgroom_web 2>/dev/null || true

echo ""

# ── Disk Usage ────────────────────────────────────────────────────────────────
echo -e "${BOLD}💾 Disk Usage:${NC}"
df -h / | tail -1 | awk '{printf "  Root: %s used / %s total (%s)\n", $3, $2, $5}'
echo "  Backups: $(du -sh ./backups 2>/dev/null | cut -f1 || echo "0")"
echo "  Logs: $(du -sh ./logs 2>/dev/null | cut -f1 || echo "0")"

echo ""

# ── SSL Certificate ───────────────────────────────────────────────────────────
echo -e "${BOLD}🔐 SSL Certificate:${NC}"
if [[ -f "/etc/letsencrypt/live/${DOMAIN:-}/fullchain.pem" ]]; then
    EXPIRY=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" | cut -d= -f2)
    DAYS=$(( ( $(date -d "$EXPIRY" +%s) - $(date +%s) ) / 86400 ))
    if [[ $DAYS -gt 30 ]]; then
        echo -e "  ${GREEN}✔${NC} หมดอายุใน $DAYS วัน ($EXPIRY)"
    else
        echo -e "  ${YELLOW}!${NC} หมดอายุใน $DAYS วัน — ต้อง renew เร็วๆ นี้!"
    fi
else
    echo -e "  ${YELLOW}!${NC} ไม่พบ SSL certificate"
fi

echo ""

# ── Recent Errors ─────────────────────────────────────────────────────────────
echo -e "${BOLD}🚨 Errors ล่าสุด (5 บรรทัด):${NC}"
docker compose logs --tail=5 api 2>/dev/null | grep -i "error\|warn" | head -5 || echo "  ไม่มี error"

echo ""
echo -e "  อัพเดทเมื่อ: $(date '+%d/%m/%Y %H:%M:%S')"
echo ""
