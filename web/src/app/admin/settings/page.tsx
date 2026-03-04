'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

interface SettingGroup {
  label: string;
  icon: string;
  keys: { key: string; label: string; type: 'text' | 'number' | 'boolean' | 'textarea' }[];
}

const SETTING_GROUPS: SettingGroup[] = [
  {
    label: 'ข้อมูลร้าน',
    icon: '🏪',
    keys: [
      { key: 'company.name', label: 'ชื่อร้าน', type: 'text' },
      { key: 'company.phone', label: 'เบอร์โทรร้าน', type: 'text' },
      { key: 'company.address', label: 'ที่อยู่', type: 'textarea' },
      { key: 'company.taxId', label: 'เลขที่ผู้เสียภาษี', type: 'text' },
      { key: 'company.website', label: 'เว็บไซต์', type: 'text' },
    ],
  },
  {
    label: 'การนัดหมาย',
    icon: '📅',
    keys: [
      { key: 'booking.openTime', label: 'เวลาเปิด (HH:MM)', type: 'text' },
      { key: 'booking.closeTime', label: 'เวลาปิด (HH:MM)', type: 'text' },
      { key: 'booking.slotMinutes', label: 'ช่วงเวลาต่อ slot (นาที)', type: 'number' },
      { key: 'booking.maxAdvanceDays', label: 'จองล่วงหน้าได้สูงสุด (วัน)', type: 'number' },
      { key: 'booking.enableOnline', label: 'เปิดรับจองออนไลน์', type: 'boolean' },
    ],
  },
  {
    label: 'การแจ้งเตือน',
    icon: '🔔',
    keys: [
      { key: 'notify.reminderHours', label: 'แจ้งเตือนก่อนนัด (ชั่วโมง)', type: 'number' },
      { key: 'notify.enableLine', label: 'แจ้งเตือนผ่าน LINE', type: 'boolean' },
      { key: 'notify.enableSms', label: 'แจ้งเตือนผ่าน SMS', type: 'boolean' },
    ],
  },
  {
    label: 'การเงิน',
    icon: '💰',
    keys: [
      { key: 'finance.taxRate', label: 'อัตราภาษี (%)', type: 'number' },
      { key: 'finance.enableTax', label: 'คิดภาษีมูลค่าเพิ่ม', type: 'boolean' },
      { key: 'finance.invoicePrefix', label: 'prefix เลขใบแจ้งหนี้', type: 'text' },
      { key: 'finance.currency', label: 'สกุลเงิน', type: 'text' },
    ],
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [dirty, setDirty] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiClient.get<Record<string, any>>('/api/v1/settings')
      .then((r) => setSettings(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getValue = (key: string) => {
    if (key in dirty) return dirty[key];
    return settings[key] ?? '';
  };

  const setValue = (key: string, value: any) => {
    setDirty((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    if (Object.keys(dirty).length === 0) return;
    setSaving(true);
    try {
      await apiClient.put('/api/v1/settings', { settings: dirty });
      setSettings((prev) => ({ ...prev, ...dirty }));
      setDirty({});
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert('บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-400">กำลังโหลด...</div>;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ตั้งค่าระบบ</h1>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600">✓ บันทึกแล้ว</span>}
          {Object.keys(dirty).length > 0 && (
            <span className="text-sm text-amber-600">{Object.keys(dirty).length} รายการที่ยังไม่บันทึก</span>
          )}
          <button
            onClick={save}
            disabled={saving || Object.keys(dirty).length === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {SETTING_GROUPS.map((group) => (
          <div key={group.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">
              {group.icon} {group.label}
            </h2>
            <div className="space-y-4">
              {group.keys.map(({ key, label, type }) => {
                const val = getValue(key);
                const isDirty = key in dirty;
                return (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label}
                      {isDirty && <span className="ml-1 text-xs text-amber-500">●</span>}
                    </label>
                    {type === 'boolean' ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!val}
                          onChange={(e) => setValue(key, e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="text-sm text-gray-600">{val ? 'เปิด' : 'ปิด'}</span>
                      </label>
                    ) : type === 'textarea' ? (
                      <textarea
                        value={val}
                        onChange={(e) => setValue(key, e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    ) : (
                      <input
                        type={type}
                        value={val}
                        onChange={(e) => setValue(key, type === 'number' ? Number(e.target.value) : e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
