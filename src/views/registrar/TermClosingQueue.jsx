import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, RotateCcw, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmationContext';
import PortalPageHeader from '../../components/PortalPageHeader';
import PortalRefreshButton from '../../components/PortalRefreshButton';
import SearchInput from '../../components/SearchInput';

function displayProgram(programId) {
  return programId ? String(programId).toUpperCase() : 'Not set';
}

export default function TermClosingQueue({ onNavigate }) {
  const { token } = useAuth();
  const { confirm } = useConfirm();
  const [summary, setSummary] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [batchResult, setBatchResult] = useState(null);

  const loadQueue = useCallback(async () => {
    setError('');
    const response = await fetch('/api/academic/term-closing', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.message || payload.error || 'Unable to load term-closing queue.');
    }
    setSummary(payload.data);
    setSelectedIds((current) => {
      const eligibleIds = new Set(payload.data.rollover.students.filter((student) => student.eligible).map((student) => student.id));
      return new Set([...current].filter((id) => eligibleIds.has(id)));
    });
  }, [token]);

  useEffect(() => {
    loadQueue()
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [loadQueue]);

  const visibleStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (summary?.rollover.students || []).filter((student) => {
      if (filter === 'eligible' && !student.eligible) return false;
      if (filter === 'blocked' && student.eligible) return false;
      if (!query) return true;
      return [
        student.studentId,
        student.firstName,
        student.lastName,
        student.programId,
        student.previousTerm,
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [filter, search, summary]);

  const visibleEligibleIds = visibleStudents.filter((student) => student.eligible).map((student) => student.id);
  const allVisibleEligibleSelected = visibleEligibleIds.length > 0
    && visibleEligibleIds.every((id) => selectedIds.has(id));

  const toggleSelected = (studentId) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleVisibleEligible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleEligibleSelected) visibleEligibleIds.forEach((id) => next.delete(id));
      else visibleEligibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const runBatchRollover = async () => {
    const studentIds = [...selectedIds];
    if (studentIds.length === 0) {
      toast.error('Select at least one eligible student.');
      return;
    }
    const accepted = await confirm({
      title: 'Initialize continuing enrollment?',
      message: `Move ${studentIds.length} selected student${studentIds.length === 1 ? '' : 's'} into ${summary.activeTerm}? Previous subjects, payment state, and generated enrollment documents will be reset.`,
      confirmText: 'Initialize Students',
      cancelText: 'Cancel',
      type: 'warning',
    });
    if (!accepted) return;

    setProcessing(true);
    setBatchResult(null);
    try {
      const response = await fetch('/api/admin/students/batch-rollover', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentIds,
          expectedActiveTerm: summary.activeTerm,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Batch rollover failed.');
      setBatchResult(payload);
      setSelectedIds(new Set());
      toast.success(`${payload.successful.length} student${payload.successful.length === 1 ? '' : 's'} initialized.`);
      await loadQueue();
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-500">Loading term-closing queue...</div>;
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <PortalPageHeader
          title="Term closing and rollover"
          description="Finish current-term academic records, then initialize eligible continuing students."
          actions={<PortalRefreshButton onRefresh={loadQueue} />}
        />

        {error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>
        ) : summary && (
          <>
            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-univ-navy">Close {summary.activeTerm}</h2>
                  <p className="mt-1 text-xs text-slate-500">All active memberships must be completed, dropped, or withdrawn before Admin can activate {summary.nextTerm}.</p>
                </div>
                <span className={`text-xs font-semibold ${summary.closing.canClose ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {summary.closing.canClose ? 'Ready for term activation' : `${summary.closing.activeClasses} active classes remain`}
                </span>
              </div>
              <dl className="grid gap-px bg-slate-200 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  ['Not submitted', summary.closing.unsubmittedGrades],
                  ['For review', summary.closing.submittedGrades],
                  ['Returned', summary.closing.returnedGrades],
                  ['Ready to publish', summary.closing.approvedGrades],
                  ['Active classes', summary.closing.activeClasses],
                  ['Completed', summary.closing.completedClasses],
                ].map(([label, value]) => (
                  <div key={label} className="bg-white px-4 py-3">
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className="mt-1 text-lg font-semibold text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
              {!summary.closing.canClose && (
                <div className="flex items-center justify-between gap-4 border-t border-slate-200 px-5 py-4">
                  <p className="text-xs text-slate-600">Review submitted grades and coordinate missing submissions with instructors.</p>
                  <button
                    type="button"
                    onClick={() => onNavigate('grades')}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Open grade review
                  </button>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-univ-navy">Continuing-student rollover</h2>
                    <p className="mt-1 text-xs text-slate-500">Target term: {summary.activeTerm}. Only students from previous terms appear here.</p>
                  </div>
                  <button
                    type="button"
                    onClick={runBatchRollover}
                    disabled={processing || selectedIds.size === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-univ-blue px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processing ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                    Initialize selected ({selectedIds.size})
                  </button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <SearchInput value={search} onChange={setSearch} placeholder="Search student, program, or previous term" />
                  <div className="flex gap-2">
                    {[
                      ['all', 'All', summary.rollover.total],
                      ['eligible', 'Eligible', summary.rollover.eligible],
                      ['blocked', 'Blocked', summary.rollover.blocked],
                    ].map(([value, label, count]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilter(value)}
                        className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                          filter === value
                            ? 'border-univ-blue bg-univ-blue/10 text-univ-blue'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {label} ({count})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {batchResult && (
                <div className={`mx-5 mt-4 flex items-start gap-3 rounded-md border p-3 ${batchResult.failed.length ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                  {batchResult.failed.length ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                  <div className="text-xs">
                    <p className="font-semibold">{batchResult.successful.length} completed; {batchResult.failed.length} failed.</p>
                    {batchResult.failed.length > 0 && (
                      <ul className="mt-1 space-y-1">
                        {batchResult.failed.map((failure) => <li key={failure.id}>{failure.id}: {failure.reason}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {visibleStudents.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">No students in this queue</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Students appear after Admin activates a newer academic term.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                      <tr>
                        <th className="w-12 px-5 py-3">
                          <input
                            type="checkbox"
                            checked={allVisibleEligibleSelected}
                            onChange={toggleVisibleEligible}
                            disabled={visibleEligibleIds.length === 0}
                            aria-label="Select all visible eligible students"
                            className="h-4 w-4 rounded border-slate-300 text-univ-blue"
                          />
                        </th>
                        <th className="px-3 py-3">Student</th>
                        <th className="px-3 py-3">Program</th>
                        <th className="px-3 py-3">Previous term</th>
                        <th className="px-3 py-3">Year level</th>
                        <th className="px-3 py-3">Clearance</th>
                        <th className="px-5 py-3">Rollover status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleStudents.map((student) => (
                        <tr key={student.id} className="text-sm text-slate-700">
                          <td className="px-5 py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(student.id)}
                              onChange={() => toggleSelected(student.id)}
                              disabled={!student.eligible}
                              aria-label={`Select ${student.firstName} ${student.lastName}`}
                              className="h-4 w-4 rounded border-slate-300 text-univ-blue disabled:opacity-40"
                            />
                          </td>
                          <td className="px-3 py-4">
                            <p className="font-semibold text-slate-900">{student.lastName}, {student.firstName}</p>
                            <p className="mt-0.5 font-mono text-xs text-slate-500">{student.studentId}</p>
                          </td>
                          <td className="px-3 py-4 text-xs font-semibold">{displayProgram(student.programId)}</td>
                          <td className="px-3 py-4 text-xs">{student.previousTerm}</td>
                          <td className="px-3 py-4 text-xs">Year {student.yearLevel} to {student.targetYearLevel}</td>
                          <td className="px-3 py-4 text-xs">{student.activeHolds ? `${student.activeHolds} active hold${student.activeHolds === 1 ? '' : 's'}` : 'No active holds'}</td>
                          <td className="px-5 py-4">
                            <span className={`text-xs font-semibold ${student.eligible ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {student.eligible ? 'Eligible' : student.reason}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
