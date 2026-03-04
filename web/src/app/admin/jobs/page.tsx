'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import type { JobOrder } from '@/types';

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  PENDING: { label: 'รอดำเนินการ', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-400' },
  IN_PROGRESS: { label: 'กำลังดำเนินการ', color: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
  DONE: { label: 'เสร็จสิ้น', color: 'bg-green-100 text-green-800', dot: 'bg-green-400' },
  CANCELLED: { label: 'ยกเลิก', color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-300' },
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobOrder[]>([]);
  const [filter, setFilter] = useState('PENDING,IN_PROGRESS');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<JobOrder | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<JobOrder[]>(
        `/api/v1/job-orders?status=${filter}&limit=50`,
      );
      setJobs(res.data);
    } catch {/* ignore */} finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    await apiClient.patch(`/api/v1/job-orders/${id}`, { status });
    setSelected(null);
    load();
  };

  const cols = ['PENDING', 'IN_PROGRESS', 'DONE'];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Job Board</h1>
        <div className="flex gap-2">
          {[
            { value: 'PENDING,IN_PROGRESS', label: 'งานวันนี้' },
            { value: 'DONE', label: 'เสร็จแล้ว' },
            { value: 'CANCELLED', label: 'ยกเลิก' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>
      ) : filter === 'PENDING,IN_PROGRESS' ? (
        /* Kanban view */
        <div className="grid grid-cols-3 gap-4">
          {cols.map((status) => {
            const statusJobs = jobs.filter((j) => j.status === status);
            const cfg = STATUS_CONFIG[status];
            return (
              <div key={status} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                  <span className="font-semibold text-gray-700">{cfg.label}</span>
                  <span className="ml-auto text-xs text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">
                    {statusJobs.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {statusJobs.map((job) => (
                    <JobCard key={job.id} job={job} onClick={() => setSelected(job)} />
                  ))}
                  {statusJobs.length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-sm">ไม่มีงาน</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">สัตว์เลี้ยง</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">เจ้าของ</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">ช่างแต่งขน</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">สถานะ</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">เวลา</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job) => {
                const cfg = STATUS_CONFIG[job.status];
                return (
                  <tr key={job.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(job)}>
                    <td className="px-4 py-3 font-medium">{job.pet?.name}</td>
                    <td className="px-4 py-3 text-gray-600">{job.customer?.name}</td>
                    <td className="px-4 py-3 text-gray-600">{job.groomer?.name ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {job.doneAt ? new Date(job.doneAt).toLocaleString('th-TH') : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Job detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">รายละเอียดงาน</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400">✕</button>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500 w-28 inline-block">สัตว์เลี้ยง:</span> <span className="font-medium">{selected.pet?.name}</span></p>
              <p><span className="text-gray-500 w-28 inline-block">เจ้าของ:</span> {selected.customer?.name}</p>
              <p><span className="text-gray-500 w-28 inline-block">ช่างแต่งขน:</span> {selected.groomer?.name ?? '-'}</p>
              {selected.note && <p><span className="text-gray-500 w-28 inline-block">หมายเหตุ:</span> {selected.note}</p>}
            </div>
            {selected.status !== 'DONE' && selected.status !== 'CANCELLED' && (
              <div className="flex gap-2 mt-5">
                {selected.status === 'PENDING' && (
                  <button onClick={() => updateStatus(selected.id, 'IN_PROGRESS')} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                    เริ่มงาน
                  </button>
                )}
                {selected.status === 'IN_PROGRESS' && (
                  <button onClick={() => updateStatus(selected.id, 'DONE')} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                    เสร็จสิ้น
                  </button>
                )}
                <button onClick={() => updateStatus(selected.id, 'CANCELLED')} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                  ยกเลิก
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function JobCard({ job, onClick }: { job: JobOrder; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow"
    >
      <p className="font-semibold text-gray-900">{job.pet?.name}</p>
      <p className="text-xs text-gray-500 mt-0.5">{job.customer?.name}</p>
      {job.groomer && (
        <p className="text-xs text-indigo-600 mt-1">👤 {job.groomer.name}</p>
      )}
      {job.services && job.services.length > 0 && (
        <p className="text-xs text-gray-400 mt-1 truncate">
          {job.services.map((s) => s.service?.name ?? '').join(', ')}
        </p>
      )}
    </button>
  );
}
