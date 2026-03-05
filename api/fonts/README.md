# Thai Fonts for PDF Rendering

โฟลเดอร์นี้ใช้เก็บ font ภาษาไทย สำหรับ Playwright PDF export

## วิธีติดตั้ง font (ทำบน server ก่อน deploy)

```bash
# ดาวน์โหลด Sarabun font (ฟรี, รองรับภาษาไทยครบ)
cd /opt/pawgroom/api/fonts

# วิธีที่ 1: ดาวน์โหลดจาก Google Fonts
wget -O Sarabun-Regular.ttf "https://fonts.gstatic.com/s/sarabun/v13/DtVmJx26TKEr37c9aBBx_Q.ttf"
wget -O Sarabun-Bold.ttf    "https://fonts.gstatic.com/s/sarabun/v13/DtVjJx26TKEr37c9YNpoulwm6gDXvwE.ttf"

# วิธีที่ 2: ใช้ font จากระบบ
cp /usr/share/fonts/truetype/thai-tlwg/TlwgMono.ttf ./
```

## Font ที่แนะนำ
- **Sarabun** — อ่านง่าย ใช้กับเอกสารทั่วไป
- **Noto Sans Thai** — รองรับ Unicode ครบ
- **TH Sarabun New** — มาตรฐานราชการไทย

## หากไม่ต้องการใช้ font ไทย
ลบบรรทัดนี้ออกจาก `Dockerfile`:
```dockerfile
COPY --chown=nestjs:nodejs fonts/ ./fonts/
```
