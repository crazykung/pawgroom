'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import type { Customer, PaginatedResponse } from '@/types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Customer | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<PaginatedResponse<Customer>>(
        `/api/v1/customers?page=${page}&limit=20&search=${encodeURIComponent(search)}`,
      );
      setCustomers(res.data.data);
      setTotal(res.data.total);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ลูกค้า</h1>
          <p className="text-sm text-gray-500 mt-1">ทั้งหมด {total} ราย</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          + เพิ่มลูกค้า
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="ค้นหาชื่อ, เบอร์โทร, LINE ID..."
          className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">รหัส</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">ชื่อ-นามสกุล</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">เบอร์โทร</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">สัตว์เลี้ยง</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">เยี่ยมชม</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">ยอดรวม</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  กำลังโหลด...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  ไม่พบข้อมูลลูกค้า
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 font-mono">{c.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.pets?.length ?? 0} ตัว
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{c.totalVisits}</td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium">
                    ฿{(c.totalSpent ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelected(c)}
                      className="text-indigo-600 hover:underline text-xs"
                    >
                      ดูรายละเอียด
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>หน้า {page} / {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              ‹ ก่อนหน้า
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              ถัดไป ›
            </button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{selected.name}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400">✕</button>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500 w-28 inline-block">รหัสลูกค้า:</span> {selected.code}</p>
              <p><span className="text-gray-500 w-28 inline-block">เบอร์โทร:</span> {selected.phone}</p>
              {selected.email && <p><span className="text-gray-500 w-28 inline-block">อีเมล:</span> {selected.email}</p>}
              {selected.lineId && <p><span className="text-gray-500 w-28 inline-block">LINE:</span> {selected.lineId}</p>}
              {selected.address && <p><span className="text-gray-500 w-28 inline-block">ที่อยู่:</span> {selected.address}</p>}
              {selected.note && <p><span className="text-gray-500 w-28 inline-block">หมายเหตุ:</span> {selected.note}</p>}
              <hr className="my-3" />
              <p><span className="text-gray-500 w-28 inline-block">จำนวนครั้งที่มา:</span> {selected.totalVisits} ครั้ง</p>
              <p><span className="text-gray-500 w-28 inline-block">ยอดรวมทั้งหมด:</span> ฿{(selected.totalSpent ?? 0).toLocaleString()}</p>
              {selected.pets && selected.pets.length > 0 && (
                <>
                  <hr className="my-3" />
                  <p className="font-semibold text-gray-700">สัตว์เลี้ยง</p>
                  {selected.pets.map((p) => (
                    <div key={p.id} className="flex gap-3 bg-gray-50 rounded-lg p-2">
                      <span className="text-lg">{p.species === 'CAT' ? '🐱' : '🐶'}</span>
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-gray-500 text-xs">{p.breed} · {p.weight ? `${p.weight} kg` : ''}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
