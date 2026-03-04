'use client';

// Dashboard page
// ใช้ React component จาก pet-grooming-system.jsx เป็น main UI
// ในการ deploy จริงให้ import component ที่แยกไฟล์แล้ว

// วิธีใช้:
// 1. copy pet-grooming-system.jsx ไปที่ src/components/AdminApp.tsx
// 2. แก้ไข import ให้เหมาะสม
// 3. เชื่อมต่อ API จริงแทน mock data

import dynamic from 'next/dynamic';

// Dynamic import เพื่อ disable SSR (เนื่องจากใช้ browser APIs)
const AdminApp = dynamic(
  () => import('../../../components/AdminApp'),
  { ssr: false, loading: () => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#64748B' }}>กำลังโหลด...</div> }
);

export default function DashboardPage() {
  return <AdminApp />;
}
