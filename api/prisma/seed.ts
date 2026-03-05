import { PrismaClient, CustomerType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 เริ่ม seed ข้อมูลเริ่มต้น...');

  // ── Tenant ─────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'pawgroom' },
    update: {},
    create: {
      name: 'PawGroom',
      slug: 'pawgroom',
    },
  });
  console.log('✓ Tenant:', tenant.name);

  // ── Branch ─────────────────────────────────────────────────────────────────
  const branch = await prisma.branch.upsert({
    where: { id: 'branch-main' },
    update: {},
    create: {
      id: 'branch-main',
      tenantId: tenant.id,
      name: 'สาขาหลัก',
      phone: '02-xxx-xxxx',
      address: { line1: '999 ถนนพระราม 1', city: 'กรุงเทพฯ', postcode: '10330' },
    },
  });
  console.log('✓ Branch:', branch.name);

  // ── Company Profile ────────────────────────────────────────────────────────
  await prisma.companyProfile.upsert({
    where: { branchId: branch.id },
    update: {},
    create: {
      branchId: branch.id,
      displayName: 'PawGroom',
      legalName: 'บริษัท พอว์กรูม จำกัด',
      primaryColor: '#6366F1',
      phone: '02-xxx-xxxx',
      email: 'contact@pawgroom.com',
      vatRate: 7,
      pricesVatIncluded: false,
      paperSize: '80mm',
      currency: 'THB',
      timezone: 'Asia/Bangkok',
      receiptFooterText: 'ขอบคุณที่ใช้บริการ 🐾 PawGroom',
      invoiceFooterText: 'ภาษีมูลค่าเพิ่มรวมในราคาแล้ว',
    },
  });
  console.log('✓ Company Profile');

  // ── Default Settings ───────────────────────────────────────────────────────
  const defaultSettings = [
    { key: 'portal.enabled', value: true },
    { key: 'portal.allow_choose_groomer', value: false },
    { key: 'portal.show_price', value: true },
    { key: 'portal.auto_confirm', value: false },
    { key: 'booking.max_days_ahead', value: 30 },
    { key: 'policy.cancel_hours_before', value: 6 },
    { key: 'policy.deposit.enabled', value: false },
    { key: 'policy.deposit.amount', value: 0 },
    { key: 'ops.buffer_minutes', value: 10 },
    {
      key: 'ops.opening_hours', value: {
        "1": { start: "10:00", end: "19:00" },
        "2": { start: "10:00", end: "19:00" },
        "3": { start: "10:00", end: "19:00" },
        "4": { start: "10:00", end: "19:00" },
        "5": { start: "10:00", end: "19:00" },
        "6": { start: "09:00", end: "20:00" },
        "0": { start: "10:00", end: "18:00" },
      }
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.settingKv.upsert({
      where: { branchId_key: { branchId: branch.id, key: setting.key } },
      update: {},
      create: {
        branchId: branch.id,
        key: setting.key,
        value: setting.value as any,
      },
    });
  }
  console.log('✓ Settings');

  // ── Document Sequences ─────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const docTypes: any[] = [
    { docType: 'receipt', prefix: 'RC' },
    { docType: 'tax_invoice', prefix: 'TX' },
    { docType: 'credit_note', prefix: 'CN' },
  ];

  for (const seq of docTypes) {
    await prisma.documentSequence.upsert({
      where: { branchId_docType_year: { branchId: branch.id, docType: seq.docType, year: currentYear } },
      update: {},
      create: {
        branchId: branch.id,
        docType: seq.docType,
        prefix: seq.prefix,
        runningNo: 0,
        year: currentYear,
      },
    });
  }
  console.log('✓ Document Sequences');

  // ── Roles & Permissions ────────────────────────────────────────────────────
  const permissions = [
    { code: 'dashboard.view', module: 'Dashboard', label: 'ดู Dashboard' },
    { code: 'queue.write', module: 'Queue', label: 'จัดการคิว Walk-in' },
    { code: 'appointment.create', module: 'Appointment', label: 'สร้างนัดหมาย' },
    { code: 'appointment.cancel', module: 'Appointment', label: 'ยกเลิกนัดหมาย' },
    { code: 'customer.read', module: 'Customer', label: 'ดูข้อมูลลูกค้า' },
    { code: 'customer.write', module: 'Customer', label: 'แก้ไขลูกค้า' },
    { code: 'job.update_status', module: 'Job', label: 'อัพเดทสถานะงาน' },
    { code: 'invoice.issue', module: 'Invoice', label: 'ออกใบเสร็จ' },
    { code: 'invoice.void', module: 'Invoice', label: 'ยกเลิกใบเสร็จ' },
    { code: 'invoice.refund', module: 'Invoice', label: 'คืนเงิน' },
    { code: 'tax.report.read', module: 'Tax', label: 'ดูรายงานภาษี' },
    { code: 'comp.plan.manage', module: 'Compensation', label: 'จัดการแผนค่าตอบแทน' },
    { code: 'comp.period.close', module: 'Compensation', label: 'ปิดรอบค่าตอบแทน' },
    { code: 'report.template.edit', module: 'Report', label: 'ออกแบบรายงาน' },
    { code: 'settings.write', module: 'Settings', label: 'แก้ไขการตั้งค่า' },
    { code: 'users.manage', module: 'Users', label: 'จัดการผู้ใช้งาน' },
  ];

  const createdPerms: Record<string, string> = {};
  for (const perm of permissions) {
    const p = await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
    createdPerms[p.code] = p.id;
  }
  console.log('✓ Permissions');

  // สร้าง roles
  const roleDefinitions = [
    { name: 'Admin', isSystem: true, color: '#EF4444', perms: Object.keys(createdPerms) },
    { name: 'Manager', isSystem: false, color: '#F59E0B', perms: ['dashboard.view','queue.write','appointment.create','appointment.cancel','customer.read','customer.write','job.update_status','invoice.issue','invoice.void','tax.report.read','comp.period.close','report.template.edit'] },
    { name: 'Frontdesk', isSystem: false, color: '#6366F1', perms: ['dashboard.view','queue.write','appointment.create','customer.read','customer.write','job.update_status','invoice.issue'] },
    { name: 'Groomer', isSystem: false, color: '#10B981', perms: ['dashboard.view','job.update_status','customer.read'] },
    { name: 'Accountant', isSystem: false, color: '#3B82F6', perms: ['dashboard.view','tax.report.read','comp.plan.manage','comp.period.close','report.template.edit'] },
  ];

  for (const roleDef of roleDefinitions) {
    const { perms, ...roleData } = roleDef;
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: roleDef.name } },
      update: {},
      create: { ...roleData, tenantId: tenant.id },
    });

    // เพิ่ม permissions ให้ role
    for (const permCode of perms) {
      if (createdPerms[permCode]) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: createdPerms[permCode] } },
          update: {},
          create: { roleId: role.id, permissionId: createdPerms[permCode] },
        }).catch(() => {});
      }
    }
    console.log(`✓ Role: ${role.name}`);
  }

  // ── Admin User ─────────────────────────────────────────────────────────────
  const adminRole = await prisma.role.findFirst({ where: { tenantId: tenant.id, name: 'Admin' } });
  const passwordHash = await bcrypt.hash('Admin@1234', 12);

  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@pawgroom.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      email: 'admin@pawgroom.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'PawGroom',
    },
  });

  if (adminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId_branchId: { userId: adminUser.id, roleId: adminRole.id, branchId: branch.id } },
      update: {},
      create: { userId: adminUser.id, roleId: adminRole.id, branchId: branch.id, scope: 'all' },
    }).catch(() => {});
  }
  console.log('✓ Admin User: admin@pawgroom.com / Admin@1234');

  // ── Demo Services ──────────────────────────────────────────────────────────
  const services = [
    { name: 'อาบน้ำ + ไดร์', category: 'bath' as any, baseDurationMin: 75 },
    { name: 'อาบน้ำ + ตัดขน', category: 'groom' as any, baseDurationMin: 120 },
    { name: 'ตัดขนอย่างเดียว', category: 'groom' as any, baseDurationMin: 90 },
    { name: 'ตัดเล็บ', category: 'addon' as any, baseDurationMin: 15 },
    { name: 'เช็ดหู', category: 'addon' as any, baseDurationMin: 10 },
    { name: 'สปา/ทรีตเมนต์', category: 'addon' as any, baseDurationMin: 30 },
  ];

  for (const svc of services) {
    const service = await prisma.service.upsert({
      where: { id: `svc-${svc.name}` },
      update: {},
      create: {
        id: `svc-${svc.name}`,
        branchId: branch.id,
        ...svc,
      },
    }).catch(async () => {
      return await prisma.service.create({
        data: { branchId: branch.id, ...svc },
      });
    });

    // Price rules (S/M/L/XL)
    const prices = { bath: { S: 250, M: 320, L: 420, XL: 550 }, groom: { S: 380, M: 480, L: 620, XL: 800 }, addon: { S: 50, M: 60, L: 80, XL: 100 } };
    const svcPrices = prices[svc.category] || prices.addon;

    for (const [sizeTier, basePriceRaw] of Object.entries(svcPrices)) {
      const basePrice = Number(basePriceRaw);
      await prisma.priceRule.create({
        data: {
          serviceId: service.id,
          sizeTier: sizeTier as any,
          basePrice,
          priority: 1,
        },
      }).catch(() => {});
    }
  }
  console.log('✓ Services + Price Rules');

  console.log('');
  console.log('🎉 Seed เสร็จสิ้น!');
  console.log('   Login: admin@pawgroom.com');
  console.log('   Password: Admin@1234');
  console.log('   Tenant: pawgroom');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
