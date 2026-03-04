'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import type { Pet, PaginatedResponse } from '@/types';

const SPECIES_EMOJI: Record<string, string> = {
  DOG: '🐶',
  CAT: '🐱',
  OTHER: '🐾',
};

const SPECIES_LABEL: Record<string, string> = {
  DOG: 'สุนัข',
  CAT: 'แมว',
  OTHER: 'อื่นๆ',
};

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [species, setSpecies] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<PaginatedResponse<Pet>>(
        `/api/v1/pets?page=${page}&limit=20&search=${encodeURIComponent(search)}${species ? `&species=${species}` : ''}`,
      );
      setPets(res.data.data);
      setTotal(res.data.total);
    } catch {/* ignore */} finally {
      setLoading(false);
    }
  }, [page, search, species]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 20);

  const getAge = (birthDate?: string) => {
    if (!birthDate) return '-';
    const now = new Date();
    const birth = new Date(birthDate);
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (months < 12) return `${months} เดือน`;
    return `${Math.floor(months / 12)} ปี`;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">สัตว์เลี้ยง</h1>
          <p className="text-sm text-gray-500 mt-1">ทั้งหมด {total} ตัว</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          + เพิ่มสัตว์เลี้ยง
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="ค้นหาชื่อ, สายพันธุ์..."
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-64"
        />
        <select
          value={species}
          onChange={(e) => { setSpecies(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">ทุกประเภท</option>
          <option value="DOG">สุนัข</option>
          <option value="CAT">แมว</option>
          <option value="OTHER">อื่นๆ</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>
      ) : pets.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl">ไม่พบข้อมูล</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pets.map((pet) => (
            <div key={pet.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-2xl">
                  {pet.photoUrl ? (
                    <img src={pet.photoUrl} alt={pet.name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    SPECIES_EMOJI[pet.species]
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{pet.name}</p>
                  <p className="text-xs text-gray-500">{SPECIES_LABEL[pet.species]}</p>
                </div>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                {pet.breed && <p>พันธุ์: <span className="font-medium text-gray-800">{pet.breed}</span></p>}
                <p>อายุ: <span className="font-medium text-gray-800">{getAge(pet.birthDate)}</span></p>
                {pet.weight && <p>น้ำหนัก: <span className="font-medium text-gray-800">{pet.weight} กก.</span></p>}
                {pet.gender && <p>เพศ: <span className="font-medium text-gray-800">{pet.gender === 'MALE' ? '♂ ผู้' : '♀ เมีย'}</span></p>}
              </div>
              {pet.customer && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  เจ้าของ: <span className="font-medium text-gray-700">{pet.customer.name}</span>
                </div>
              )}
              {pet.allergies && (
                <div className="mt-2 px-2 py-1 bg-red-50 text-red-600 text-xs rounded-lg">
                  ⚠️ {pet.allergies}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 text-sm text-gray-600">
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
