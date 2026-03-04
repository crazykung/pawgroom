#!/usr/bin/env bash
# =============================================================================
# PawGroom — SSL Certificate Setup (Let's Encrypt)
# ใช้งาน: bash scripts/ssl.sh
# =============================================================================

set -euo pipefail
cd "$(dirname "$0")/.."

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()   { echo -e "${GREEN}[✔]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# โหลด .env
[[ -f .env ]] || error "ไม่พบ .env กรุณา cp .env.example .env แล้วแก้ไขก่อน"
set -o allexport; source .env; set +o allexport

[[ -z "${DOMAIN:-}" ]] && error "กรุณาตั้งค่า DOMAIN ใน .env"
[[ -z "${SSL_EMAIL:-}" ]] && error "กรุณาตั้งค่า SSL_EMAIL ใน .env"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e " ขอ SSL Certificate สำหรับ: ${DOMAIN}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# อัพเดท nginx config ให้ใช้ domain จริง (ตรวจว่ายังเป็น placeholder หรือเปล่า)
if grep -q "yourdomain.com" nginx/conf.d/pawgroom.conf; then
    sed -i "s/yourdomain.com/${DOMAIN}/g" nginx/conf.d/pawgroom.conf
    log "อัพเดท nginx config เป็น $DOMAIN"
fi

# เริ่ม Nginx แบบ HTTP เพื่อรับ ACME challenge
mkdir -p /var/www/certbot

# สร้าง self-signed cert ชั่วคราว (เพื่อให้ nginx start ได้)
if [[ ! -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ]]; then
    warn "ยังไม่มี SSL cert สร้าง self-signed ชั่วคราว..."
    mkdir -p /etc/letsencrypt/live/${DOMAIN}
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
        -keyout /etc/letsencrypt/live/${DOMAIN}/privkey.pem \
        -out /etc/letsencrypt/live/${DOMAIN}/fullchain.pem \
        -subj "/CN=localhost" 2>/dev/null
    # สร้าง DH params
    openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048 2>/dev/null
    log "Self-signed cert ชั่วคราว OK"
fi

# เริ่ม nginx container (เพื่อรับ HTTP challenge)
docker compose up -d nginx
sleep 5

# ขอ Let's Encrypt cert จริง
log "กำลังขอ Let's Encrypt certificate..."
docker run --rm \
    -v "/etc/letsencrypt:/etc/letsencrypt" \
    -v "/var/www/certbot:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot --webroot-path /var/www/certbot \
    --email ${SSL_EMAIL} \
    --agree-tos --no-eff-email \
    -d ${DOMAIN} -d www.${DOMAIN} \
    --force-renewal

log "✅ SSL Certificate ได้รับแล้ว!"

# Reload nginx ให้ใช้ cert จริง
docker compose exec nginx nginx -s reload
log "Nginx reload ด้วย cert ใหม่"

# ─────────────────────────────────────────────────────────────────────────────
# Setup cron สำหรับ auto-renew
CRON_JOB="0 3 * * * cd /opt/pawgroom && docker compose run --rm certbot renew --quiet && docker compose exec nginx nginx -s reload >> /opt/pawgroom/logs/certbot.log 2>&1"

(crontab -l 2>/dev/null | grep -v certbot; echo "$CRON_JOB") | crontab -
log "Cron auto-renew ตั้งค่าแล้ว (ทุกวัน 03:00)"

echo ""
echo -e "${GREEN}✅ SSL setup เสร็จสิ้น!${NC}"
echo -e "   https://${DOMAIN} พร้อมใช้งาน"
echo ""
