'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import type { Invoice, PaginatedResponse } from '@/types';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'ร่าง', color: 'bg-gray-100 text-gray-600' },
  ISSUED: { label: 'รอชำระ', color: 'bg-yellow-100 text-yellow-800' },
  PAID: { label: 'ชำระแล้ว', color: 'bg-green-100 text-green-800' },
  VOID: { label: 'ยกเลิก', color: 'bg-red-100 text-red-600' },
};

export default function POSPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ISSUED');
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<PaginatedResponse<Invoice>>(
        `/api/v1/invoices?page=${page}&limit=20&status=${statusFilter}`,
      );
      setInvoices(res.data.data);
      setTotal(res.data.total);
    } catch {/* ignore */} finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const markPaid = async (id: string, paymentMethod: string) => {
    await apiClient.patch(`/api/v1/invoices/${id}/pay`, { paymentMethod });
    setSelected(null);
    load();
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ใบแจ้งหนี้ / POS</h1>
          <p className="text-sm text-gray-500 mt-1">ทั้งหมด {total} รายการ</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-4">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
          <button
            key={status}
            onClick={() => { setStatusFilter(status); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">เลขที่</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">ลูกค้า</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">สถานะ</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">ยอดรวม</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">วันที่</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">กำลังโหลด...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">ไม่มีรายการ</td></tr>
            ) : (
              invoices.map((inv) => {
                const cfg = STATUS_CONFIG[inv.status];
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-600">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 font-medium">{inv.customer?.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      ฿{inv.total.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString('th-TH') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setSelected(inv)} className="text-indigo-600 hover:underline text-xs">
                        ดูรายละเอียด
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>หน้า {page} / {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">‹</button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">›</button>
          </div>
        </div>
      )}

      {/* Invoice detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-bold">{selected.invoiceNumber}</h2>
                <p className="text-sm text-gray-500">{selected.customer?.name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400">✕</button>
            </div>

            {/* Items */}
            {selected.items && selected.items.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-gray-600">รายการ</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600">จำนวน</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600">ราคา</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600">รวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selected.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2">{item.description}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">฿{item.unitPrice.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-medium">฿{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary */}
            <div className="space-y-1 text-sm text-right">
              <p className="text-gray-500">ยอดย่อย: ฿{selected.subtotal.toLocaleString()}</p>
              {selected.discount > 0 && <p className="text-green-600">ส่วนลด: -฿{selected.discount.toLocaleString()}</p>}
              {selected.tax > 0 && <p className="text-gray-500">ภาษี: ฿{selected.tax.toLocaleString()}</p>}
              <p className="text-lg font-bold text-gray-900 border-t pt-1">รวมทั้งหมด: ฿{selected.total.toLocaleString()}</p>
            </div>

            {/* Pay button */}
            {selected.status === 'ISSUED' && (
              <div className="mt-4 flex gap-2">
                {['CASH', 'TRANSFER', 'CARD'].map((method) => (
                  <button
                    key={method}
                    onClick={() => markPaid(selected.id, method)}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                  >
                    {method === 'CASH' ? '💵 เงินสด' : method === 'TRANSFER' ? '📱 โอน' : '💳 บัตร'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
