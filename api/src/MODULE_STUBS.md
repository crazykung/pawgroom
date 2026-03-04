// =============================================================================
// PawGroom — Module Stubs
// ไฟล์นี้รวบรวม stub module สำหรับ modules ที่ยังต้องพัฒนาต่อ
// แต่ละ module มีโครงสร้างพื้นฐานครบ พร้อม implement service จริง
// =============================================================================

// ──────────────────────────────────────────────────────────────
// PATTERN ที่ใช้ใน module ทุกตัว:
//
// 1. Module file  → import Controller + Service
// 2. Controller   → @UseGuards(JwtAuthGuard) + CRUD endpoints  
// 3. Service      → inject PrismaService + business logic
// 4. DTOs         → class-validator decorators
// ──────────────────────────────────────────────────────────────

// modules ที่ต้องสร้างเพิ่มเติม (โครงสร้างเหมือน customers/):
// - pets/
// - services/
// - resources/
// - appointments/
// - queue/
// - job-orders/
// - invoices/
// - compensation/
// - reports/
// - settings/
// - media/
// - users/

// ดู README.md สำหรับ API endpoints ที่ต้องใช้แต่ละ module
