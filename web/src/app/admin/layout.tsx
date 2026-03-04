// app/admin/layout.tsx
// ใช้ pet-grooming-system.jsx (React component) เป็น main UI
// ในการ deploy จริง ให้แยก component ออกเป็นหน้าๆ

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      {children}
    </div>
  )
}
