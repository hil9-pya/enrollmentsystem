import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import MiniStat from '../../components/MiniStat';
import PortalRefreshButton from '../../components/PortalRefreshButton';
import PortalPageHeader from '../../components/PortalPageHeader';

export default function AdviserDashboard({ students, onNavigate }) {
  const metrics = useMemo(() => {
    const relevant = students.filter((student) =>
      (student.enrollmentType !== 'new' || !!student.subjectChangeRequest) &&
      ['advising_pending', 'advising_approved', 'advising_rejected', 'payment_pending', 'enrolled'].includes(student.status)
    );
    const pendingRecords = relevant.filter((student) => student.status === 'advising_pending');
    const approved = relevant.filter((student) => ['advising_approved', 'payment_pending', 'enrolled'].includes(student.status)).length;
    const returned = relevant.filter((student) => student.status === 'advising_rejected').length;
    const recent = relevant.filter((student) => student.status !== 'advising_pending').sort((a, b) => b.id.localeCompare(a.id)).slice(0, 8);
    return { pendingRecords, approved, returned, recent };
  }, [students]);

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <PortalPageHeader
          title="Advising overview"
          description="Review subject evaluations, pending decisions, and returned study plans."
          actions={<PortalRefreshButton />}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <MiniStat title="Pending evaluation" value={metrics.pendingRecords.length} icon={<Clock className="h-4 w-4" />} colorClass="text-amber-600" onClick={() => onNavigate('pending')} />
          <MiniStat title="Approved study plans" value={metrics.approved} icon={<CheckCircle className="h-4 w-4" />} colorClass="text-emerald-600" onClick={() => onNavigate('approved')} />
          <MiniStat title="Returned for revision" value={metrics.returned} icon={<AlertTriangle className="h-4 w-4" />} colorClass="text-rose-600" onClick={() => onNavigate('rejected')} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,0.8fr)]">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white" aria-labelledby="priority-queue-title">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 id="priority-queue-title" className="text-sm font-semibold text-slate-900">Priority queue</h2>
                <p className="mt-0.5 text-xs text-slate-500">Study plans waiting for an adviser decision.</p>
              </div>
              <button type="button" onClick={() => onNavigate('pending')} className="text-sm font-semibold text-univ-blue hover:underline">Open queue</button>
            </div>
            {metrics.pendingRecords.length ? (
              <div className="divide-y divide-slate-100">
                {metrics.pendingRecords.slice(0, 6).map((student) => (
                  <button key={student.id} type="button" onClick={() => onNavigate('pending')} className="grid w-full gap-2 px-5 py-3 text-left transition-colors hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{student.firstName} {student.lastName}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-500">{student.studentId || student.id}</p>
                    </div>
                    <span className="text-xs font-semibold text-univ-blue">Evaluate</span>
                  </button>
                ))}
              </div>
            ) : <p className="px-5 py-10 text-center text-sm text-slate-500">No pending evaluations.</p>}
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white" aria-labelledby="recent-evaluations-title">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 id="recent-evaluations-title" className="text-sm font-semibold text-slate-900">Recent evaluations</h2>
            </div>
            {metrics.recent.length ? (
              <div className="divide-y divide-slate-100">
                {metrics.recent.map((student) => (
                  <div key={student.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{student.firstName || 'Anonymous'} {student.lastName || 'Applicant'}</p>
                      <p className="mt-0.5 truncate font-mono text-xs text-slate-500">{student.studentId || student.id}</p>
                    </div>
                    <StatusBadge status={student.status} />
                  </div>
                ))}
              </div>
            ) : <p className="px-5 py-10 text-center text-sm text-slate-500">No recent evaluations.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
