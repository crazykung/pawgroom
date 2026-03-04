'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import type { ReportTemplate } from '@/types';

const DATASET_LABEL: Record<string, string> = {
  DAILY_SUMMARY: 'สรุปประจำวัน',
  MONTHLY_REVENUE: 'รายได้รายเดือน',
  CUSTOMER_ANALYSIS: 'วิเคราะห์ลูกค้า',
  GROOMER_PERFORMANCE: 'ผลงานช่างแต่งขน',
  SERVICE_POPULARITY: 'ความนิยมบริการ',
  INVENTORY: 'สต็อกสินค้า',
};

export default function ReportsPage() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<ReportTemplate[]>('/api/v1/reports/templates')
      .then((r) => setTemplates(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const generate = async (templateId: string, format: 'pdf' | 'csv') => {
    setGenerating(templateId);
    try {
      const res = await apiClient.get(
        `/api/v1/reports/generate/${templateId}?format=${format}`,
        { responseType: 'blob' },
      );
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${templateId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('สร้างรายงานไม่สำเร็จ');
    } finally {
      setGenerating(null);
    }
  };

  const quickStats = [
    { label: 'รายได้วันนี้', icon: '💰', endpoint: '/api/v1/reports/stats/today-revenue' },
    { label: 'งานวันนี้', icon: '✂️', endpoint: '/api/v1/reports/stats/today-jobs' },
    { label: 'ลูกค้าเดือนนี้', icon: '👤', endpoint: '/api/v1/reports/stats/month-customers' },
    { label: 'รายได้เดือนนี้', icon: '📊', endpoint: '/api/v1/reports/stats/month-revenue' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">รายงาน</h1>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          + สร้าง Template ใหม่
        </button>
      </div>

      {/* Quick stats placeholder */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickStats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">—</p>
          </div>
        ))}
      </div>

      {/* Report templates */}
      <h2 className="text-base font-semibold text-gray-700 mb-3">เทมเพลตรายงาน</h2>
      {loading ? (
        <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-400">
          ยังไม่มีเทมเพลตรายงาน
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <div key={tpl.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{tpl.name}</p>
                  {tpl.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{tpl.description}</p>
                  )}
                </div>
                {tpl.isPublic && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">สาธารณะ</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mb-4">
                {DATASET_LABEL[tpl.datasetType] ?? tpl.datasetType}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => generate(tpl.id, 'pdf')}
                  disabled={generating === tpl.id}
                  className="flex-1 py-1.5 text-xs bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium disabled:opacity-50"
                >
                  {generating === tpl.id ? 'กำลังสร้าง...' : '📄 PDF'}
                </button>
                <button
                  onClick={() => generate(tpl.id, 'csv')}
                  disabled={generating === tpl.id}
                  className="flex-1 py-1.5 text-xs bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 font-medium disabled:opacity-50"
                >
                  📊 CSV
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
