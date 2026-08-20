import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, RefreshCw, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function studentName(student) {
  return [student?.lastName, student?.firstName].filter(Boolean).join(', ') || 'Unknown student';
}

export default function LmsGradebookTab({ offeringId, token, canEdit }) {
  const [data, setData] = useState({ assignments: [], memberships: [], submissions: [], totalPoints: 0 });
  const [drafts, setDrafts] = useState({});
  const [dirty, setDirty] = useState({});
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');

  const loadGradebook = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/lms/offerings/${offeringId}/gradebook`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to load gradebook.');
      const nextData = payload.data || { assignments: [], memberships: [], submissions: [], totalPoints: 0 };
      setData(nextData);
      setDrafts(Object.fromEntries((nextData.submissions || []).map((submission) => [submission._id, submission.score ?? ''])));
      setDirty({});
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [offeringId, token]);

  useEffect(() => { loadGradebook(); }, [loadGradebook]);

  const submissionMap = useMemo(() => new Map(data.submissions.map((submission) => (
    [`${submission.assignment}:${submission.student}`, submission]
  ))), [data.submissions]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...data.memberships]
      .sort((left, right) => studentName(left.student).localeCompare(studentName(right.student)))
      .filter((membership) => {
        if (!query) return true;
        const student = membership.student || {};
        return [student.studentId, student.firstName, student.lastName, student.programId]
          .some((value) => String(value || '').toLowerCase().includes(query));
      });
  }, [data.memberships, search]);

  const scoreSummary = (membership) => {
    let earned = 0;
    let gradedPoints = 0;
    for (const assignment of data.assignments) {
      const submission = submissionMap.get(`${assignment._id}:${membership.student?._id}`);
      if (submission?.status === 'graded' && Number.isFinite(Number(submission.score))) {
        earned += Number(submission.score);
        gradedPoints += assignment.points;
      }
    }
    return {
      earned,
      gradedPoints,
      percentage: data.totalPoints > 0 ? (earned / data.totalPoints) * 100 : 0,
    };
  };

  const saveScore = async (submission, assignment) => {
    const key = `${assignment._id}:${submission.student}`;
    setSavingKey(key);
    try {
      const response = await fetch(`/api/lms/submissions/${submission._id}/grade`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: Number(drafts[submission._id]), feedback: submission.feedback || '' }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to save score.');
      setData((current) => ({
        ...current,
        submissions: current.submissions.map((item) => item._id === submission._id ? {
          ...item,
          ...payload.data,
          assignment: item.assignment,
          student: item.student,
        } : item),
      }));
      setDirty((current) => ({ ...current, [submission._id]: false }));
      toast.success('LMS score saved.');
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setSavingKey('');
    }
  };

  const exportCsv = () => {
    const headers = ['Student ID', 'Student', 'Program', ...data.assignments.map((assignment) => `${assignment.title} / ${assignment.points}`), 'Earned', 'Course points', 'Percentage'];
    const csvRows = [headers.map(csvCell).join(',')];
    for (const membership of data.memberships) {
      const student = membership.student || {};
      const summary = scoreSummary(membership);
      const scores = data.assignments.map((assignment) => {
        const submission = submissionMap.get(`${assignment._id}:${student._id}`);
        if (!submission) return 'Missing';
        if (submission.status !== 'graded') return submission.status;
        return submission.score;
      });
      csvRows.push([
        student.studentId,
        studentName(student),
        student.programId,
        ...scores,
        summary.earned.toFixed(2),
        data.totalPoints,
        summary.percentage.toFixed(2),
      ].map(csvCell).join(','));
    }
    const blob = new Blob([`\uFEFF${csvRows.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `lms-gradebook-${offeringId}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (isLoading) return <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading gradebook...</div>;
  if (error) return <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">LMS gradebook</h2>
          <p className="mt-0.5 text-xs text-slate-500">{data.memberships.length} students · {data.assignments.length} assignments · {data.totalPoints} course points</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative block sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-univ-blue focus:ring-2 focus:ring-blue-500/20" />
          </label>
          <button type="button" onClick={loadGradebook} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
          <button type="button" onClick={exportCsv} disabled={data.memberships.length === 0} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Download className="h-3.5 w-3.5" /> Export CSV</button>
        </div>
      </div>

      {!canEdit && <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-800">Closed-term gradebook. Scores are read-only.</div>}

      {data.assignments.length === 0 ? (
        <div className="p-10 text-center text-sm text-slate-500">Create an assignment before using gradebook.</div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center text-sm text-slate-500">No students match search.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-max w-full border-collapse text-left">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="sticky left-0 z-10 min-w-56 border-r border-slate-200 bg-slate-50 px-5 py-3">Student</th>
                {data.assignments.map((assignment) => <th key={assignment._id} className="min-w-40 border-r border-slate-200 px-4 py-3"><span className="block max-w-40 truncate text-slate-800" title={assignment.title}>{assignment.title}</span><span className="mt-0.5 block font-normal text-slate-500">{assignment.points} points</span></th>)}
                <th className="min-w-36 px-5 py-3">Course total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((membership) => {
                const student = membership.student || {};
                const summary = scoreSummary(membership);
                return (
                  <tr key={membership._id} className="align-top text-sm text-slate-700">
                    <td className="sticky left-0 z-[5] border-r border-slate-200 bg-white px-5 py-4"><p className="font-semibold text-slate-900">{studentName(student)}</p><p className="mt-1 font-mono text-xs text-slate-500">{student.studentId}</p><p className="mt-1 text-xs text-slate-500">{String(student.programId || '—').toUpperCase()}</p></td>
                    {data.assignments.map((assignment) => {
                      const submission = submissionMap.get(`${assignment._id}:${student._id}`);
                      if (!submission) return <td key={assignment._id} className="border-r border-slate-100 px-4 py-4"><span className="text-xs font-medium text-rose-600">Missing</span></td>;
                      const key = `${assignment._id}:${submission.student}`;
                      return (
                        <td key={assignment._id} className="border-r border-slate-100 px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <input type="number" min="0" max={assignment.points} step="0.01" value={drafts[submission._id] ?? ''} disabled={!canEdit} onChange={(event) => { setDrafts((current) => ({ ...current, [submission._id]: event.target.value })); setDirty((current) => ({ ...current, [submission._id]: true })); }} aria-label={`${assignment.title} score for ${studentName(student)}`} className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm tabular-nums outline-none focus:border-univ-blue focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100" />
                            <span className="text-xs text-slate-400">/ {assignment.points}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2"><span className={`text-xs font-medium ${submission.status === 'late' ? 'text-amber-700' : submission.status === 'graded' ? 'text-emerald-700' : 'text-slate-500'}`}>{submission.status === 'late' ? 'Late' : submission.status === 'graded' ? 'Graded' : 'Ungraded'}</span>{canEdit && dirty[submission._id] && <button type="button" onClick={() => saveScore(submission, assignment)} disabled={savingKey === key || drafts[submission._id] === ''} className="rounded-md bg-univ-blue px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{savingKey === key ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}</button>}</div>
                        </td>
                      );
                    })}
                    <td className="px-5 py-4"><p className="font-semibold tabular-nums text-slate-900">{summary.earned.toFixed(2)} / {data.totalPoints}</p><p className="mt-1 text-xs font-medium text-slate-500">{summary.percentage.toFixed(1)}%</p><p className="mt-1 text-[11px] text-slate-400">{summary.gradedPoints} points graded</p></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-600">LMS coursework totals only. Registrar approval and publication remain required for official final grades.</div>
    </section>
  );
}
