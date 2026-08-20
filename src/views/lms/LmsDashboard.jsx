import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, FileText, RefreshCw } from 'lucide-react';

function formatDate(value) {
  if (!value) return 'No date';
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value));
}

function classLabel(record) {
  const offering = record?.offering || record;
  return [offering?.subjectCode, offering?.sectionCode].filter(Boolean).join(' · ') || 'LMS class';
}

function EmptyRow({ children }) {
  return <div className="px-5 py-8 text-center text-sm text-slate-500">{children}</div>;
}

function Section({ title, description, children, accent = false }) {
  return (
    <section className={`overflow-hidden rounded-lg border bg-white shadow-sm ${accent ? 'border-amber-200' : 'border-slate-200'}`}>
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function AssignmentRows({ rows, onOpenClass, emptyText, tone = 'default' }) {
  if (!rows.length) return <EmptyRow>{emptyText}</EmptyRow>;
  return (
    <div className="divide-y divide-slate-100">
      {rows.map((assignment) => (
        <div key={assignment._id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{assignment.title}</p>
            <p className="mt-1 text-xs text-slate-500">{classLabel(assignment)} · {assignment.points} points</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className={`text-xs font-medium ${tone === 'danger' ? 'text-rose-700' : 'text-slate-600'}`}>
              {tone === 'danger' ? 'Due ' : 'Due '}{formatDate(assignment.dueAt)}
            </span>
            <button type="button" onClick={() => onOpenClass(assignment.offering)} className="inline-flex items-center gap-1 text-xs font-semibold text-univ-blue hover:text-blue-700">
              Open <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SubmissionRows({ rows, onOpenClass, emptyText, studentView = false }) {
  if (!rows.length) return <EmptyRow>{emptyText}</EmptyRow>;
  return (
    <div className="divide-y divide-slate-100">
      {rows.map((submission) => (
        <div key={submission._id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{submission.assignment?.title || 'Assignment'}</p>
            <p className="mt-1 text-xs text-slate-500">
              {classLabel(submission)}
              {!studentView && submission.student ? ` · ${submission.student.firstName} ${submission.student.lastName}` : ''}
            </p>
            {submission.feedback && <p className="mt-1.5 text-xs text-slate-600">Feedback: {submission.feedback}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs font-medium text-slate-600">
              {studentView && submission.status === 'graded'
                ? `${submission.score}/${submission.assignment?.points}`
                : formatDate(submission.submittedAt)}
            </span>
            <button type="button" onClick={() => onOpenClass(submission.offering)} className="inline-flex items-center gap-1 text-xs font-semibold text-univ-blue hover:text-blue-700">
              Open <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function StudentDashboard({ data, onOpenClass }) {
  const attentionCount = data.counts.overdue + data.counts.returned;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
      <div className="space-y-5">
        <Section title="Needs attention" description={`${attentionCount} item${attentionCount === 1 ? '' : 's'} require action`} accent={attentionCount > 0}>
          {data.returnedSubmissions.length > 0 && (
            <SubmissionRows rows={data.returnedSubmissions} onOpenClass={onOpenClass} emptyText="" studentView />
          )}
          {data.overdueAssignments.length > 0 && <AssignmentRows rows={data.overdueAssignments} onOpenClass={onOpenClass} emptyText="" tone="danger" />}
          {attentionCount === 0 && <EmptyRow>Nothing needs your attention.</EmptyRow>}
        </Section>
        <Section title="Upcoming deadlines" description="Published work you have not submitted">
          <AssignmentRows rows={data.upcomingAssignments} onOpenClass={onOpenClass} emptyText="No upcoming unsubmitted assignments." />
        </Section>
      </div>
      <div className="space-y-5">
        <Section title="Recently graded">
          <SubmissionRows rows={data.recentGrades} onOpenClass={onOpenClass} emptyText="No graded submissions yet." studentView />
        </Section>
        <Section title="Latest class updates">
          {data.latestAnnouncements.length === 0 && data.recentMaterials.length === 0 ? (
            <EmptyRow>No announcements or materials yet.</EmptyRow>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.latestAnnouncements.slice(0, 4).map((item) => (
                <button key={`announcement-${item._id}`} type="button" onClick={() => onOpenClass(item.offering)} className="flex w-full gap-3 px-5 py-3 text-left hover:bg-slate-50">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                  <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-800">{item.title}</span><span className="mt-0.5 block text-xs text-slate-500">{classLabel(item)}</span></span>
                </button>
              ))}
              {data.recentMaterials.slice(0, 4).map((item) => (
                <button key={`material-${item._id}`} type="button" onClick={() => onOpenClass(item.offering)} className="flex w-full gap-3 px-5 py-3 text-left hover:bg-slate-50">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-800">{item.title}</span><span className="mt-0.5 block text-xs text-slate-500">{classLabel(item)}</span></span>
                </button>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function StaffDashboard({ data, role, onOpenClass }) {
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div><dt className="text-xs font-medium text-slate-500">Active LMS classes</dt><dd className="mt-1 text-xl font-semibold text-slate-900">{data.counts.classes}</dd></div>
          <div><dt className="text-xs font-medium text-slate-500">Waiting for grading</dt><dd className="mt-1 text-xl font-semibold text-slate-900">{data.counts.pendingGrading}</dd></div>
          <div><dt className="text-xs font-medium text-slate-500">Enrolled students</dt><dd className="mt-1 text-xl font-semibold text-slate-900">{data.counts.students}</dd></div>
        </dl>
      </section>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <Section title="Submissions waiting for grading" description={role === 'admin' ? 'Across all active LMS classes' : 'Oldest submissions appear first'} accent={data.pendingSubmissions.length > 0}>
          <SubmissionRows rows={data.pendingSubmissions} onOpenClass={onOpenClass} emptyText="No submissions are waiting for grading." />
        </Section>
        <Section title="Upcoming deadlines">
          <AssignmentRows rows={data.upcomingAssignments} onOpenClass={onOpenClass} emptyText="No upcoming assignment deadlines." />
        </Section>
      </div>
      <Section title={role === 'admin' ? 'Enabled LMS classes' : 'My active classes'}>
        {data.classes.length === 0 ? <EmptyRow>No active LMS classes.</EmptyRow> : (
          <div className="divide-y divide-slate-100">
            {data.classes.map((offering) => (
              <button key={offering._id} type="button" onClick={() => onOpenClass(offering)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50">
                <span><span className="block text-sm font-semibold text-slate-900">{offering.subjectCode} · {offering.subjectName}</span><span className="mt-1 block text-xs text-slate-500">{offering.sectionCode} · {offering.instructorName || 'Instructor not assigned'}</span></span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

export default function LmsDashboard({ role, token, onOpenClass }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/lms/dashboard', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to load LMS dashboard.');
      setData(payload.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">{role === 'student' ? 'Deadlines, revisions, grades, and updates across your classes.' : 'Current teaching work and LMS activity across active classes.'}</p>
        </div>
        <button type="button" onClick={loadDashboard} className="inline-flex shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>
      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm"><Clock3 className="mx-auto mb-3 h-6 w-6 animate-spin text-slate-400" />Loading dashboard...</div>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>
      ) : data ? (
        role === 'student' ? <StudentDashboard data={data} onOpenClass={onOpenClass} /> : <StaffDashboard data={data} role={role} onOpenClass={onOpenClass} />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500"><CheckCircle2 className="mx-auto mb-3 h-6 w-6 text-emerald-500" />No dashboard data.</div>
      )}
    </div>
  );
}
