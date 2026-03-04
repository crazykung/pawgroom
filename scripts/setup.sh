#!/usr/bin/env bash
# =============================================================================
# PawGroom — Ubuntu Server Setup Script
# Ubuntu 22.04 LTS / 24.04 LTS
# ใช้งาน: sudo bash setup.sh
# =============================================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log()     { echo -e "${GREEN}[✔]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }
section() { echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${BLUE}  $1${NC}"; echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"; }

# ── Root check ────────────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && error "กรุณารันด้วย sudo: sudo bash $0"

# ── OS check ─────────────────────────────────────────────────────────────────
OS=$(lsb_release -si 2>/dev/null || echo "Unknown")
VER=$(lsb_release -sr 2>/dev/null || echo "0")
[[ "$OS" != "Ubuntu" ]] && error "Script นี้รองรับเฉพาะ Ubuntu เท่านั้น (ตรวจพบ: $OS)"
log "Ubuntu $VER ตรวจสอบผ่าน"

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     PawGroom — Server Setup Script         ║${NC}"
echo -e "${CYAN}║     Ubuntu $VER                              ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
echo ""

# ═════════════════════════════════════════════════════════════════════════════
section "1/8 — System Update"
# ═════════════════════════════════════════════════════════════════════════════
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    curl wget git vim htop iotop \
    ca-certificates gnupg lsb-release \
    ufw fail2ban unzip \
    software-properties-common apt-transport-https \
    net-tools dnsutils jq \
    build-essential
log "System packages ติดตั้งแล้ว"

# ═════════════════════════════════════════════════════════════════════════════
section "2/8 — Docker Engine"
# ═════════════════════════════════════════════════════════════════════════════
if command -v docker &>/dev/null; then
    log "Docker มีอยู่แล้ว: $(docker --version)"
else
    # ติดตั้ง Docker Engine อย่างเป็นทางการ
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
        gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    systemctl enable --now docker
    log "Docker Engine ติดตั้งแล้ว: $(docker --version)"
fi

# Docker Compose v2
if ! docker compose version &>/dev/null; then
    apt-get install -y -qq docker-compose-plugin
fi
log "Docker Compose: $(docker compose version)"

# ═════════════════════════════════════════════════════════════════════════════
section "3/8 — Node.js 20 LTS (สำหรับ build tools)"
# ═════════════════════════════════════════════════════════════════════════════
if command -v node &>/dev/null; then
    log "Node.js มีอยู่แล้ว: $(node --version)"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
    log "Node.js: $(node --version) | npm: $(npm --version)"
fi

# ═════════════════════════════════════════════════════════════════════════════
section "4/8 — Firewall (UFW)"
# ═════════════════════════════════════════════════════════════════════════════
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
# !! ไม่เปิด port อื่นโดยตรง (5432, 6379, 9000 ผ่าน Docker internal network เท่านั้น)
ufw --force enable
log "UFW Firewall เปิดใช้งาน: SSH, HTTP, HTTPS เท่านั้น"
ufw status

# ═════════════════════════════════════════════════════════════════════════════
section "5/8 — Fail2ban (brute-force protection)"
# ═════════════════════════════════════════════════════════════════════════════
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5
backend  = systemd

[sshd]
enabled = true
port    = ssh
filter  = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime  = 86400

[nginx-http-auth]
enabled = true
filter  = nginx-http-auth
port    = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter  = nginx-limit-req
port    = http,https
logpath = /var/log/nginx/error.log
findtime = 600
bantime  = 7200
maxretry = 10
EOF

systemctl enable --now fail2ban
log "Fail2ban เปิดใช้งาน"

# ═════════════════════════════════════════════════════════════════════════════
section "6/8 — System Tuning"
# ═════════════════════════════════════════════════════════════════════════════
# สร้าง /etc/sysctl.d/99-pawgroom.conf
cat > /etc/sysctl.d/99-pawgroom.conf << 'EOF'
# Network performance
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 300
net.ipv4.ip_local_port_range = 1024 65535

# File system
fs.file-max = 1000000
vm.swappiness = 10

# Redis requirement
vm.overcommit_memory = 1
EOF
sysctl -p /etc/sysctl.d/99-pawgroom.conf --quiet

# Increase file descriptors
cat > /etc/security/limits.d/99-pawgroom.conf << 'EOF'
* soft nofile 65535
* hard nofile 65535
root soft nofile 65535
root hard nofile 65535
EOF

log "System tuning เสร็จสิ้น"

# ═════════════════════════════════════════════════════════════════════════════
section "7/8 — Project Directory Setup"
# ═════════════════════════════════════════════════════════════════════════════
DEPLOY_DIR=/opt/pawgroom
mkdir -p $DEPLOY_DIR/{api,web,nginx/conf.d,scripts,backups,logs}
mkdir -p /var/lib/pawgroom/uploads  # สำหรับ local storage
mkdir -p /var/www/certbot

# Deploy user
if ! id pawgroom &>/dev/null; then
    useradd -r -s /bin/bash -d $DEPLOY_DIR pawgroom
    usermod -aG docker pawgroom
    log "สร้าง user pawgroom แล้ว"
fi

chown -R pawgroom:pawgroom $DEPLOY_DIR
chown -R pawgroom:pawgroom /var/lib/pawgroom
log "Directory $DEPLOY_DIR พร้อมแล้ว"

# ═════════════════════════════════════════════════════════════════════════════
section "8/8 — Swap File (แนะนำ 2GB สำหรับ RAM < 4GB)"
# ═════════════════════════════════════════════════════════════════════════════
RAM_GB=$(awk '/MemTotal/ {printf "%.0f", $2/1024/1024}' /proc/meminfo)
if [[ $RAM_GB -lt 8 ]] && [[ ! -f /swapfile ]]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    log "Swap 2GB เปิดใช้งาน (RAM: ${RAM_GB}GB)"
else
    log "Swap ข้ามขั้นตอนนี้ (RAM: ${RAM_GB}GB หรือมี Swap แล้ว)"
fi

# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Setup เสร็จสมบูรณ์! ✅                  ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════╝${NC}"
echo ""
echo -e " ขั้นตอนต่อไป:"
echo -e " ${YELLOW}1.${NC} cd /opt/pawgroom"
echo -e " ${YELLOW}2.${NC} git clone <your-repo> . (หรือ copy ไฟล์มา)"
echo -e " ${YELLOW}3.${NC} cp .env.example .env && nano .env  ${YELLOW}# ตั้งค่า passwords!${NC}"
echo -e " ${YELLOW}4.${NC} bash scripts/ssl.sh               ${YELLOW}# ขอ SSL certificate${NC}"
echo -e " ${YELLOW}5.${NC} bash scripts/deploy.sh            ${YELLOW}# Deploy ระบบ${NC}"
echo ""
echo -e " Server IP: $(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
echo ""
