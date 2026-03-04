'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import type { QueueTicket } from '@/types';

const STATUS_LABEL: Record<string, string> = {
  WAITING: 'รอคิว',
  CALLED: 'เรียกแล้ว',
  IN_SERVICE: 'กำลังให้บริการ',
  DONE: 'เสร็จแล้ว',
  SKIPPED: 'ข้ามคิว',
};

const STATUS_COLOR: Record<string, string> = {
  WAITING: 'bg-yellow-100 text-yellow-800',
  CALLED: 'bg-blue-100 text-blue-800',
  IN_SERVICE: 'bg-indigo-100 text-indigo-800',
  DONE: 'bg-green-100 text-green-800',
  SKIPPED: 'bg-gray-100 text-gray-500',
};

export default function QueuePage() {
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get<QueueTicket[]>('/api/v1/queue?status=WAITING,CALLED,IN_SERVICE');
      setTickets(res.data);
    } catch {
      setError('โหลดข้อมูลคิวไม่ได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiClient.patch(`/api/v1/queue/${id}/status`, { status });
      await load();
    } catch {
      alert('เปลี่ยนสถานะไม่สำเร็จ');
    }
  };

  const createWalkIn = async () => {
    const customerName = prompt('ชื่อลูกค้า (walk-in):');
    if (!customerName) return;
    try {
      await apiClient.post('/api/v1/queue/walk-in', { customerName });
      await load();
    } catch {
      alert('เพิ่มคิวไม่สำเร็จ');
    }
  };

  const waiting = tickets.filter((t) => t.status === 'WAITING');
  const active = tickets.filter((t) => ['CALLED', 'IN_SERVICE'].includes(t.status));

  if (loading) return <div className="p-8 text-gray-500">กำลังโหลด...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">คิว Walk-in</h1>
          <p className="text-sm text-gray-500 mt-1">
            รอคิวทั้งหมด {waiting.length} คน · กำลังให้บริการ {active.length} คน
          </p>
        </div>
        <button
          onClick={createWalkIn}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          + เพิ่มคิว Walk-in
        </button>
      </div>

      {/* Active */}
      {active.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            กำลังให้บริการ
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((t) => (
              <TicketCard key={t.id} ticket={t} onUpdate={updateStatus} />
            ))}
          </div>
        </section>
      )}

      {/* Waiting */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          รอคิว ({waiting.length})
        </h2>
        {waiting.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl">
            ไม่มีคิวในขณะนี้
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {waiting.map((t) => (
              <TicketCard key={t.id} ticket={t} onUpdate={updateStatus} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TicketCard({
  ticket,
  onUpdate,
}: {
  ticket: QueueTicket;
  onUpdate: (id: string, status: string) => void;
}) {
  const nextStatus: Record<string, string> = {
    WAITING: 'CALLED',
    CALLED: 'IN_SERVICE',
    IN_SERVICE: 'DONE',
  };

  const nextLabel: Record<string, string> = {
    WAITING: 'เรียกคิว',
    CALLED: 'เริ่มบริการ',
    IN_SERVICE: 'เสร็จแล้ว',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-2xl font-bold text-indigo-600">
            #{ticket.ticketNumber}
          </span>
          <span
            className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[ticket.status]}`}
          >
            {STATUS_LABEL[ticket.status]}
          </span>
        </div>
      </div>
      <p className="font-medium text-gray-900">
        {ticket.customer?.name ?? 'ลูกค้า Walk-in'}
      </p>
      <p className="text-sm text-gray-500">
        {ticket.pet?.name} ({ticket.pet?.breed ?? ticket.pet?.species})
      </p>
      {ticket.estimatedWait && (
        <p className="text-xs text-gray-400 mt-1">
          รอประมาณ {ticket.estimatedWait} นาที
        </p>
      )}
      {nextStatus[ticket.status] && (
        <button
          onClick={() => onUpdate(ticket.id, nextStatus[ticket.status])}
          className="mt-3 w-full py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium"
        >
          {nextLabel[ticket.status]}
        </button>
      )}
      {ticket.status === 'WAITING' && (
        <button
          onClick={() => onUpdate(ticket.id, 'SKIPPED')}
          className="mt-1 w-full py-1 text-xs text-gray-400 hover:text-red-500"
        >
          ข้ามคิว
        </button>
      )}
    </div>
  );
}
