import React, { useMemo, useState } from 'react';
import { ListOrdered, PhoneCall } from 'lucide-react';
import { useEnrollment } from '../../context/EnrollmentContext';
import PortalPageHeader from '../../components/PortalPageHeader';
import PortalRefreshButton from '../../components/PortalRefreshButton';

const ACTIVE_STATUSES = ['waiting', 'called', 'serving', 'skipped'];

function manilaDateKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

const statusStyles = {
  waiting: 'bg-amber-50 text-amber-700 border-amber-200',
  called: 'bg-blue-50 text-blue-700 border-blue-200',
  serving: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  skipped: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function WalkInPaymentQueue({ students, onViewDetails }) {
  const { dispatch } = useEnrollment();
  const [busyId, setBusyId] = useState(null);
  const today = manilaDateKey();

  const tickets = useMemo(() => students
    .filter((student) => (
      student.paymentMethod === 'cash'
      && student.walkInQueue?.queueDate === today
      && ACTIVE_STATUSES.includes(student.walkInQueue.status)
    ))
    .sort((a, b) => a.walkInQueue.sequence - b.walkInQueue.sequence), [students, today]);

  const waitingCount = tickets.filter((student) => student.walkInQueue.status === 'waiting').length;

  async function runAction(studentId, action) {
    setBusyId(studentId);
    try {
      await dispatch({
        type: 'UPDATE_WALK_IN_QUEUE',
        payload: { studentId, action },
      });
    } finally {
      setBusyId(null);
    }
  }

  async function callNext() {
    setBusyId('next');
    try {
      await dispatch({ type: 'CALL_NEXT_WALK_IN', payload: {} });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50 p-4 sm:p-5 lg:p-6">
      <PortalPageHeader
        title="Walk-in payment queue"
        description={`${waitingCount} waiting today. Tickets follow first-in, first-out order.`}
        actions={(
          <div className="flex items-center gap-2">
            <PortalRefreshButton />
            <button
              type="button"
              onClick={callNext}
              disabled={waitingCount === 0 || busyId !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-univ-blue px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PhoneCall className="h-4 w-4" />
              Call next
            </button>
          </div>
        )}
      />

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <ListOrdered className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Today’s tickets</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Queue number</th>
                <th className="px-5 py-3 font-semibold">Student</th>
                <th className="px-5 py-3 font-semibold">Joined</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                    No active walk-in payment tickets today.
                  </td>
                </tr>
              ) : tickets.map((student) => {
                const queue = student.walkInQueue;
                const disabled = busyId !== null;
                return (
                  <tr key={student.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-mono text-base font-bold text-univ-navy">{queue.ticketNumber}</td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-900">{student.firstName} {student.lastName}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">{student.studentId || student.id}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{formatTime(queue.joinedAt)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold capitalize ${statusStyles[queue.status]}`}>
                        {queue.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        {queue.status === 'waiting' && (
                          <button type="button" disabled={disabled} onClick={() => runAction(student.id, 'call')} className="rounded-md border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Call</button>
                        )}
                        {queue.status === 'called' && (
                          <>
                            <button type="button" disabled={disabled} onClick={() => runAction(student.id, 'repeat-call')} className="rounded-md border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Repeat call</button>
                            <button type="button" disabled={disabled} onClick={() => runAction(student.id, 'serve')} className="rounded-md bg-univ-blue px-3 py-1.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Serve</button>
                          </>
                        )}
                        {['waiting', 'called'].includes(queue.status) && (
                          <button type="button" disabled={disabled} onClick={() => runAction(student.id, 'skip')} className="rounded-md border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Skip</button>
                        )}
                        {queue.status === 'skipped' && (
                          <button type="button" disabled={disabled} onClick={() => runAction(student.id, 'recall')} className="rounded-md border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Recall</button>
                        )}
                        {queue.status === 'serving' && (
                          <button type="button" disabled={disabled} onClick={() => onViewDetails(student.id)} className="rounded-md bg-univ-blue px-3 py-1.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Accept payment</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
