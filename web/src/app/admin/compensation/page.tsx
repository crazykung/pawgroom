'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import type { CompTransaction, PaginatedResponse } from '@/types';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'รอตรวจสอบ', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'อนุมัติแล้ว', color: 'bg-blue-100 text-blue-800' },
  PAID: { label: 'จ่ายแล้ว', color: 'bg-green-100 text-green-800' },
};

export default function CompensationPage() {
  const [transactions, setTransactions] = useState<CompTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{ totalAmount: number; count: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, sumRes] = await Promise.all([
        apiClient.get<PaginatedResponse<CompTransaction>>(
          `/api/v1/compensation/transactions?page=${page}&limit=20&period=${period}`,
        ),
        apiClient.get<{ totalAmount: number; count: number }>(
          `/api/v1/compensation/summary?period=${period}`,
        ),
      ]);
      setTransactions(txRes.data.data);
      setTotal(txRes.data.total);
      setSummary(sumRes.data);
    } catch {/* ignore */} finally {
      setLoading(false);
    }
  }, [page, period]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    await apiClient.patch(`/api/v1/compensation/transactions/${id}/approve`);
    load();
  };

  const markPaid = async (id: string) => {
    await apiClient.patch(`/api/v1/compensation/transactions/${id}/pay`);
    load();
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ค่าตอบแทน</h1>
        <input
          type="month"
          value={period}
          onChange={(e) => { setPeriod(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">ยอดรวมเดือนนี้</p>
            <p className="text-3xl font-bold text-indigo-600 mt-1">
              ฿{summary.totalAmount.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">จำนวนรายการ</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{summary.count} รายการ</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">พนักงาน</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">ใบแจ้งหนี้</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">งวด</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">จำนวนเงิน</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">สถานะ</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">กำลังโหลด...</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">ไม่มีรายการในงวดนี้</td></tr>
            ) : (
              transactions.map((tx) => {
                const cfg = STATUS_CONFIG[tx.status];
                return (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{tx.user?.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      {tx.invoice?.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{tx.period}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      ฿{tx.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {tx.status === 'PENDING' && (
                        <button onClick={() => approve(tx.id)} className="text-xs text-blue-600 hover:underline mr-2">อนุมัติ</button>
                      )}
                      {tx.status === 'APPROVED' && (
                        <button onClick={() => markPaid(tx.id)} className="text-xs text-green-600 hover:underline">จ่ายแล้ว</button>
                      )}
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
    </div>
  );
}
