// src/components/AdminApp.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Wrapper สำหรับ pet-grooming-system.jsx
//
// วิธี setup:
// 1. copy เนื้อหาจาก pet-grooming-system.jsx มาไว้ที่นี่
// 2. เปลี่ยน: export default function App() → export default function AdminApp()
// 3. เพิ่ม 'use client' ที่บรรทัดแรก
// 4. ติดตั้ง dependencies:
//    npm install lucide-react recharts
//
// หรือ import โดยตรง:
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import { useState } from 'react';

// TODO: แทนที่ด้วย import จาก pet-grooming-system.jsx

export default function AdminApp() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'sans-serif',
      flexDirection: 'column',
      gap: 16,
      background: '#F1F5F9',
    }}>
      <div style={{ fontSize: 48 }}>🐾</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0 }}>PawGroom</h1>
      <p style={{ color: '#64748B', margin: 0 }}>
        กรุณา copy เนื้อหาจาก <code>pet-grooming-system.jsx</code> มาไว้ที่ไฟล์นี้
      </p>
      <p style={{ color: '#94A3B8', fontSize: 13, margin: 0 }}>
        ดูคำแนะนำในไฟล์ <code>src/components/AdminApp.tsx</code>
      </p>
    </div>
  );
}
