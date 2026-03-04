'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ tenantSlug: 'pawgroom', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const res: any = await api.login(form);
      login(res.user, res.accessToken, res.refreshToken);
      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const T = {
    accent: '#6366F1',
    border: '#E2E8F0',
    bg: '#F1F5F9',
    card: '#FFFFFF',
    text: '#0F172A',
    muted: '#64748B',
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: T.card, borderRadius: 16, padding: 40, width: 400, boxShadow: '0 4px 24px #0001', border: `1px solid ${T.border}` }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${T.accent}, #8B5CF6)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px' }}>🐾</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: '0 0 4px' }}>PawGroom</h1>
          <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>ระบบบริหารร้านอาบน้ำตัดขน</p>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Tenant', key: 'tenantSlug', type: 'text', placeholder: 'pawgroom' },
            { label: 'อีเมล', key: 'email', type: 'email', placeholder: 'admin@pawgroom.com' },
            { label: 'รหัสผ่าน', key: 'password', type: 'password', placeholder: '••••••••' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label style={{ fontSize: 13, fontWeight: 600, color: T.text, display: 'block', marginBottom: 6 }}>{label}</label>
              <input
                type={type}
                placeholder={placeholder}
                value={form[key as keyof typeof form]}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{ width: '100%', padding: '10px 14px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
          ))}

          {error && (
            <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, border: '1px solid #FECACA' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ padding: '12px', borderRadius: 8, background: loading ? T.border : T.accent, color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 4 }}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: T.muted, marginTop: 20 }}>
          Demo: admin@pawgroom.com / Admin@1234
        </p>
      </div>
    </div>
  );
}
