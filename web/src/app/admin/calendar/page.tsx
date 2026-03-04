'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import type { Appointment } from '@/types';

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-400',
  CONFIRMED: 'bg-blue-400',
  IN_PROGRESS: 'bg-indigo-500',
  DONE: 'bg-green-400',
  CANCELLED: 'bg-gray-300',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'รอยืนยัน',
  CONFIRMED: 'ยืนยันแล้ว',
  IN_PROGRESS: 'กำลังดำเนินการ',
  DONE: 'เสร็จสิ้น',
  CANCELLED: 'ยกเลิก',
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    setLoading(true);
    apiClient
      .get<Appointment[]>(`/api/v1/appointments?from=${from}&to=${to}`)
      .then((r) => setAppointments(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year, month]);

  const byDay: Record<number, Appointment[]> = {};
  appointments.forEach((a) => {
    const d = new Date(a.scheduledAt).getDate();
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(a);
  });

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const monthName = new Date(year, month).toLocaleString('th-TH', {
    month: 'long',
    year: 'numeric',
  });

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => {
    const day = i < firstDay ? null : i - firstDay + 1;
    return day;
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ปฏิทินนัดหมาย</h1>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">‹</button>
          <span className="font-semibold text-gray-700 w-44 text-center">{monthName}</span>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">›</button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            const isToday =
              day === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear();
            const dayAppts = day ? byDay[day] ?? [] : [];

            return (
              <div
                key={idx}
                className={`min-h-[80px] border-b border-r border-gray-100 p-1.5 ${
                  !day ? 'bg-gray-50' : 'hover:bg-indigo-50 cursor-pointer'
                }`}
              >
                {day && (
                  <>
                    <span
                      className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-700'
                      }`}
                    >
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayAppts.slice(0, 3).map((a) => (
                        <button
                          key={a.id}
                          onClick={() => setSelected(a)}
                          className={`w-full text-left text-xs px-1 py-0.5 rounded truncate text-white ${STATUS_COLOR[a.status]}`}
                        >
                          {new Date(a.scheduledAt).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          {a.pet?.name}
                        </button>
                      ))}
                      {dayAppts.length > 3 && (
                        <span className="text-xs text-gray-400">
                          +{dayAppts.length - 3} รายการ
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold text-gray-900">รายละเอียดนัดหมาย</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">ลูกค้า:</span> <span className="font-medium">{selected.customer?.name}</span></p>
              <p><span className="text-gray-500">สัตว์เลี้ยง:</span> <span className="font-medium">{selected.pet?.name} ({selected.pet?.breed})</span></p>
              <p><span className="text-gray-500">วันเวลา:</span> <span className="font-medium">{new Date(selected.scheduledAt).toLocaleString('th-TH')}</span></p>
              <p>
                <span className="text-gray-500">สถานะ:</span>{' '}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${STATUS_COLOR[selected.status]}`}>
                  {STATUS_LABEL[selected.status]}
                </span>
              </p>
              {selected.note && <p><span className="text-gray-500">หมายเหตุ:</span> {selected.note}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
