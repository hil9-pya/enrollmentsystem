import React, { useMemo } from 'react';
import { CheckCircle, Clock, FileText } from 'lucide-react';
import { PROGRAMS } from '../../data/mockData';
import StatusBadge from '../../components/StatusBadge';
import MiniStat from '../../components/MiniStat';
import PortalRefreshButton from '../../components/PortalRefreshButton';
import PortalPageHeader from '../../components/PortalPageHeader';

export default function DashboardOverview({ students, onNavigate }) {
  const metrics = useMemo(() => {
    const pendingReview = students.filter((student) => student.status === 'documents_submitted');
    const approved = students.filter((student) => [
      'documents_approved', 'advising_pending', 'advising_approved',
      'payment_pending', 'validation_pending', 'enrolled',
    ].includes(student.status));
    const recentSubmissions = [...students].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 8);
    return { pendingReview, approved, recentSubmissions };
  }, [students]);

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <PortalPageHeader
          title="Admission overview"
          description="Review applicant workload, decisions, and recent submissions."
          actions={<PortalRefreshButton />}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <MiniStat title="All applicants" value={students.length} icon={<FileText className="h-4 w-4" />} />
          <MiniStat title="Awaiting review" value={metrics.pendingReview.length} icon={<Clock className="h-4 w-4" />} colorClass="text-amber-600" onClick={() => onNavigate('verification')} />
          <MiniStat title="Approved" value={metrics.approved.length} icon={<CheckCircle className="h-4 w-4" />} colorClass="text-emerald-600" onClick={() => onNavigate('approved')} />
        </div>

        <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="review-queue-title">
          <div>
            <h2 id="review-queue-title" className="text-sm font-semibold text-slate-900">Application review queue</h2>
            <p className="mt-1 text-sm text-slate-600">
              {metrics.pendingReview.length === 0
                ? 'No applications are waiting for document review.'
                : `${metrics.pendingReview.length} ${metrics.pendingReview.length === 1 ? 'application is' : 'applications are'} ready for review.`}
            </p>
          </div>
          <button type="button" onClick={() => onNavigate('verification')} className="shrink-0 rounded-lg bg-univ-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
            Open review queue
          </button>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white" aria-labelledby="recent-applications-title">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 id="recent-applications-title" className="text-sm font-semibold text-slate-900">Recent applications</h2>
              <p className="mt-0.5 text-xs text-slate-500">Latest applicant records across all statuses.</p>
            </div>
            <button type="button" onClick={() => onNavigate('management')} className="text-sm font-semibold text-univ-blue hover:underline">View all</button>
          </div>
          {metrics.recentSubmissions.length ? (
            <div className="divide-y divide-slate-100">
              {metrics.recentSubmissions.map((student) => (
                <button key={student.id} type="button" onClick={() => onNavigate('management')} className="grid w-full gap-2 px-5 py-3 text-left transition-colors hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.7fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{student.firstName || 'Anonymous'} {student.lastName || 'Applicant'}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-slate-500">{student.studentId || student.id}</p>
                  </div>
                  <p className="truncate text-xs text-slate-600">{PROGRAMS.find((program) => program.id === student.programId)?.name || 'Program not selected'}</p>
                  <StatusBadge status={student.status} />
                </button>
              ))}
            </div>
          ) : <p className="px-5 py-10 text-center text-sm text-slate-500">No applications found.</p>}
        </section>
      </div>
    </div>
  );
}
