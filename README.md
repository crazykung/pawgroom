# 🐾 PawGroom — Production Deployment Guide

> ระบบบริหารจัดการร้านอาบน้ำตัดขนสัตว์เลี้ยง  
> Stack: **NestJS · Prisma · PostgreSQL · Redis · MinIO · Next.js · Nginx · Docker**

---

## 📋 สิ่งที่ต้องมีก่อน Deploy

### Server Requirements (แนะนำ)

| ขนาดร้าน | CPU | RAM | Disk | Instance AWS/GCP |
|---|---|---|---|---|
| เล็ก (< 50 คิว/วัน) | 2 vCPU | 4 GB | 40 GB SSD | t3.medium / e2-medium |
| กลาง (50-200 คิว/วัน) | 4 vCPU | 8 GB | 80 GB SSD | t3.large / e2-standard-2 |
| ใหญ่ (> 200 คิว/วัน) | 8 vCPU | 16 GB | 160 GB SSD | t3.xlarge / e2-standard-4 |

**OS:** Ubuntu 22.04 LTS หรือ 24.04 LTS  
**Domain:** ต้องมี domain ชี้มาที่ server ก่อน deploy

---

## 🚀 ขั้นตอน Deploy ทั้งหมด

### Step 1 — เตรียม Server

```bash
# SSH เข้า server
ssh ubuntu@YOUR_SERVER_IP

# Download setup script
curl -fsSL https://raw.githubusercontent.com/your-repo/pawgroom/main/scripts/setup.sh -o setup.sh

# รัน setup (ติดตั้ง Docker, UFW, Fail2ban, system tuning)
sudo bash setup.sh
```

**setup.sh จะทำ:**
- ✅ Update Ubuntu packages
- ✅ ติดตั้ง Docker Engine + Docker Compose v2
- ✅ ติดตั้ง Node.js 20 LTS
- ✅ ตั้งค่า UFW Firewall (เปิดเฉพาะ 22/80/443)
- ✅ ตั้งค่า Fail2ban (กัน brute force)
- ✅ System tuning (network/file limits)
- ✅ สร้าง user `pawgroom` + directory `/opt/pawgroom`
- ✅ Swap file 2GB (ถ้า RAM < 8GB)

---

### Step 2 — Clone Project

```bash
cd /opt/pawgroom

# Clone หรือ copy ไฟล์มา
git clone https://github.com/your-org/pawgroom.git .
# หรือ
scp -r ./pawgroom-deploy/* ubuntu@YOUR_SERVER_IP:/opt/pawgroom/
```

---

### Step 3 — ตั้งค่า Environment Variables

```bash
cd /opt/pawgroom
cp .env.example .env
nano .env
```

**ต้องแก้ทุกค่าที่มีคำว่า `CHANGE_ME`:**

```env
DOMAIN=grooming.yourdomain.com        # ← เปลี่ยน
SSL_EMAIL=admin@yourdomain.com        # ← เปลี่ยน

POSTGRES_PASSWORD=SuperSecure123!     # ← เปลี่ยน (อย่างน้อย 16 ตัวอักษร)
REDIS_PASSWORD=RedisPass456!          # ← เปลี่ยน
MINIO_ROOT_PASSWORD=MinioPass789!     # ← เปลี่ยน

# สร้าง JWT secret ด้วย command นี้:
# openssl rand -hex 64
JWT_ACCESS_SECRET=<output-จาก-openssl>
JWT_REFRESH_SECRET=<output-จาก-openssl-อีกครั้ง>
```

---

### Step 4 — ขอ SSL Certificate

> ⚠️ ต้อง DNS ชี้มาที่ server ก่อน (A record: domain → server IP)

```bash
bash scripts/ssl.sh
```

**ตรวจสอบ DNS ก่อน:**
```bash
dig +short yourdomain.com
# ต้องได้ IP ของ server
```

---

### Step 5 — Build & Deploy

```bash
bash scripts/deploy.sh --build
```

**รอประมาณ 5-15 นาที** (build Docker images ครั้งแรก)

---

### Step 6 — ตรวจสอบระบบ

```bash
# ดู status ทุก service
bash scripts/monitor.sh

# ดู logs
docker compose logs -f api
docker compose logs -f web

# ตรวจสอบ
curl https://yourdomain.com/health
```

---

## 📁 โครงสร้างไฟล์บน Server

```
/opt/pawgroom/
├── docker-compose.yml          # Main compose file
├── .env                        # !! ไม่ commit ลง git !!
├── .env.example
├── api/
│   ├── Dockerfile
│   ├── package.json
│   └── src/                    # NestJS source code
├── web/
│   ├── Dockerfile
│   ├── next.config.js
│   ├── package.json
│   └── app/                    # Next.js source code
├── nginx/
│   ├── nginx.conf
│   └── conf.d/
│       └── pawgroom.conf
├── scripts/
│   ├── setup.sh                # Ubuntu setup
│   ├── ssl.sh                  # Let's Encrypt
│   ├── deploy.sh               # Deploy/update
│   ├── backup.sh               # Backup DB + files
│   ├── monitor.sh              # Health check
│   └── init.sql                # DB init
├── backups/                    # Auto-generated backups
└── logs/                       # Application logs
```

---

## 🔧 Commands ที่ใช้บ่อย

```bash
# ── Service Management ──────────────────────────────────
docker compose ps                    # ดู status
docker compose up -d                 # Start all
docker compose stop                  # Stop all
docker compose restart api           # Restart service เดียว

# ── Logs ────────────────────────────────────────────────
docker compose logs -f api           # API logs (realtime)
docker compose logs -f web           # Web logs
docker compose logs -f nginx         # Nginx logs
docker compose logs --tail=100 api   # 100 บรรทัดล่าสุด

# ── Database ─────────────────────────────────────────────
docker compose exec postgres psql -U pawgroom pawgroom  # เข้า psql
docker compose exec api npx prisma studio               # Prisma Studio
docker compose exec api npx prisma migrate status       # ดู migration

# ── Update App (ไม่ build ใหม่) ──────────────────────────
git pull origin main
bash scripts/deploy.sh --update

# ── Backup ──────────────────────────────────────────────
bash scripts/backup.sh --full        # Backup ทั้งหมด
bash scripts/backup.sh --db-only     # เฉพาะ DB

# ── Monitor ─────────────────────────────────────────────
bash scripts/monitor.sh              # Status ทุก service
docker stats                         # Resource usage realtime
```

---

## 📅 Cron Jobs (แนะนำ)

เพิ่มใน `crontab -e`:

```cron
# Backup ทุกวัน 02:00
0 2 * * * cd /opt/pawgroom && bash scripts/backup.sh --full >> logs/backup.log 2>&1

# Renew SSL ทุกวัน 03:00 (setup.sh ตั้งให้แล้ว)
0 3 * * * cd /opt/pawgroom && docker compose run --rm certbot renew --quiet >> logs/certbot.log 2>&1

# Monitor check ทุก 5 นาที (แจ้งเตือนถ้า down)
*/5 * * * * curl -sf https://yourdomain.com/health || echo "PawGroom DOWN!" | mail -s "ALERT" admin@yourdomain.com
```

---

## 🔐 Security Checklist

- [ ] เปลี่ยน **passwords ทุกตัว** ใน `.env`
- [ ] `.env` ไม่อยู่ใน git repository
- [ ] MinIO console เข้าถึงได้เฉพาะ IP ที่กำหนด (แก้ใน nginx.conf)
- [ ] PostgreSQL port 5432 **ไม่เปิด** ออก internet (ผ่าน Docker internal เท่านั้น)
- [ ] Redis port 6379 **ไม่เปิด** ออก internet
- [ ] ตั้ง SSH key-based auth ปิด password login
- [ ] Enable UFW (setup.sh ทำให้แล้ว)
- [ ] Fail2ban active (setup.sh ทำให้แล้ว)
- [ ] ตั้ง Backup cron + ทดสอบ restore

---

## 🌍 Ports & Services

| Service | Internal Port | เข้าถึงจาก |
|---|---|---|
| Nginx (HTTP) | 80 | Internet |
| Nginx (HTTPS) | 443 | Internet |
| Next.js | 3000 | Nginx only |
| NestJS API | 3001 | Nginx only |
| PostgreSQL | 5432 | Docker internal |
| Redis | 6379 | Docker internal |
| MinIO S3 | 9000 | Docker internal + Nginx proxy |
| MinIO Console | 9001 | Nginx proxy (จำกัด IP) |

---

## ⚡ Performance Tuning (Production)

### PostgreSQL (เพิ่มใน docker-compose)
```yaml
postgres:
  command: >
    postgres
    -c shared_buffers=256MB
    -c effective_cache_size=768MB
    -c maintenance_work_mem=64MB
    -c checkpoint_completion_target=0.9
    -c wal_buffers=16MB
    -c max_connections=200
    -c work_mem=4MB
```

### Redis (เพิ่มใน command)
```
--maxmemory 1gb
--maxmemory-policy allkeys-lru
```

---

## 🆘 Troubleshooting

```bash
# API ไม่ start
docker compose logs api | tail -50
docker compose exec api node -e "require('./dist/main')"

# Database connection error
docker compose exec postgres psql -U pawgroom -c "SELECT 1"

# Permission denied
chown -R pawgroom:pawgroom /opt/pawgroom
chmod 600 .env

# Port already in use
ss -tlnp | grep ':80\|:443'
sudo systemctl stop apache2 nginx  # ถ้ามี service อื่น

# SSL ปัญหา
docker compose logs nginx | grep error
certbot certificates
```

---

## 📞 Specifications Summary

| Component | Version | Purpose |
|---|---|---|
| Ubuntu | 22.04/24.04 LTS | OS |
| Docker | Latest | Container runtime |
| Docker Compose | v2 | Orchestration |
| PostgreSQL | 16 | Primary database |
| Redis | 7 | Cache + Queue |
| MinIO | Latest | Object storage |
| Node.js | 20 LTS | Runtime |
| NestJS | 10 | API Framework |
| Prisma | 5 | ORM |
| Next.js | 14 | Frontend Framework |
| Nginx | 1.25 | Reverse proxy + SSL |
| Certbot | Latest | SSL certificates |
| BullMQ | 5 | Job queue |
| Playwright | 1.42 | PDF rendering |
