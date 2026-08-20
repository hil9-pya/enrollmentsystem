import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, FileCheck, RotateCcw, Send, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmationContext';
import Modal from '../../components/Modal';
import PortalPageHeader from '../../components/PortalPageHeader';
import PortalRefreshButton from '../../components/PortalRefreshButton';
import SearchInput from '../../components/SearchInput';

const statusStyles = {
  submitted: 'border-blue-200 bg-blue-50 text-blue-700',
  returned: 'border-amber-200 bg-amber-50 text-amber-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const statusLabels = {
  submitted: 'For review',
  returned: 'Returned to instructor',
  approved: 'Ready to publish',
};

function formatTerm(term) {
  if (!term) return 'Term not set';
  if (term.schoolYear && !term.name?.includes(term.schoolYear)) return `${term.name} ${term.schoolYear}`;
  return term.name || 'Term not set';
}

export default function GradeReviewQueue() {
  const { token } = useAuth();
  const { confirm } = useConfirm();
  const [grades, setGrades] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState('');
  const [returnTarget, setReturnTarget] = useState(null);
  const [returnNotes, setReturnNotes] = useState('');

  const loadGrades = useCallback(async () => {
    setError('');
    const response = await fetch('/api/academic/grades', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to load submitted grades.');
    setGrades(payload.data || []);
  }, [token]);

  useEffect(() => {
    loadGrades()
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsLoading(false));
  }, [loadGrades]);

  const filteredGrades = useMemo(() => {
    const query = search.trim().toLowerCase();
    return grades.filter((membership) => {
      if (statusFilter !== 'all' && membership.gradeStatus !== statusFilter) return false;
      if (!query) return true;
      const student = membership.student || {};
      const offering = membership.offering || {};
      return [
        student.studentId,
        student.firstName,
        student.lastName,
        offering.subjectCode,
        offering.subjectName,
        offering.sectionCode,
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [grades, search, statusFilter]);

  const counts = useMemo(() => ({
    submitted: grades.filter((item) => item.gradeStatus === 'submitted').length,
    returned: grades.filter((item) => item.gradeStatus === 'returned').length,
    approved: grades.filter((item) => item.gradeStatus === 'approved').length,
  }), [grades]);

  const reviewGrade = async (membership, action, notes = '') => {
    setProcessingId(membership._id);
    try {
      const response = await fetch(`/api/academic/memberships/${membership._id}/grade/review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, notes }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to review grade.');
      setGrades((current) => current.map((item) => (
        item._id === membership._id
          ? { ...item, ...payload.data, student: item.student, offering: item.offering }
          : item
      )));
      toast.success(action === 'approve' ? 'Grade approved.' : 'Grade returned to instructor.');
      setReturnTarget(null);
      setReturnNotes('');
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setProcessingId('');
    }
  };

  const approveGrade = async (membership) => {
    const student = membership.student || {};
    const accepted = await confirm({
      title: 'Approve final grade',
      message: `Approve grade ${Number(membership.finalGrade).toFixed(2)} for ${student.firstName || ''} ${student.lastName || ''}? It will then be ready for publication.`,
      confirmText: 'Approve grade',
      type: 'warning',
    });
    if (accepted) reviewGrade(membership, 'approve');
  };

  const publishGrade = async (membership) => {
    const student = membership.student || {};
    const accepted = await confirm({
      title: 'Publish final grade',
      message: `Publish grade ${Number(membership.finalGrade).toFixed(2)} for ${student.firstName || ''} ${student.lastName || ''}? This writes it to the student's official academic record.`,
      confirmText: 'Publish grade',
      type: 'warning',
    });
    if (!accepted) return;

    setProcessingId(membership._id);
    try {
      const response = await fetch(`/api/academic/memberships/${membership._id}/grade/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to publish grade.');
      setGrades((current) => current.filter((item) => item._id !== membership._id));
      toast.success('Grade published to official academic record.');
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setProcessingId('');
    }
  };

  const submitReturn = () => {
    const notes = returnNotes.trim();
    if (!notes) {
      toast.error('Return notes are required.');
      return;
    }
    reviewGrade(returnTarget, 'return', notes);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PortalPageHeader
          title="Grade review"
          description="Review instructor submissions before grades enter official student academic records."
          actions={<PortalRefreshButton onRefresh={loadGrades} />}
        />

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                ['all', 'All', grades.length],
                ['submitted', 'For review', counts.submitted],
                ['returned', 'Returned', counts.returned],
                ['approved', 'Ready to publish', counts.approved],
              ].map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
                    statusFilter === value
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
            <div className="w-full lg:w-80">
              <SearchInput value={search} onChange={setSearch} placeholder="Search student, subject, or section" />
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-sm text-slate-500">Loading grade submissions...</div>
          ) : error ? (
            <div className="m-5 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>
          ) : filteredGrades.length === 0 ? (
            <div className="p-12 text-center">
              <FileCheck className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">No grades in this queue</p>
              <p className="mt-1 text-xs text-slate-500">Instructor submissions appear here for Registrar review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1040px] w-full text-left">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Instructor</th>
                    <th className="px-4 py-3 text-center">Grade</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGrades.map((membership) => {
                    const student = membership.student || {};
                    const offering = membership.offering || {};
                    const instructor = offering.instructor;
                    const instructorName = instructor
                      ? `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim()
                      : offering.instructorName || 'Unassigned';
                    return (
                      <tr key={membership._id} className="align-top text-sm text-slate-700">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">{student.lastName}, {student.firstName}</p>
                          <p className="mt-0.5 font-mono text-xs text-slate-500">{student.studentId || 'No student ID'}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">{offering.subjectCode} · {offering.sectionCode}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{offering.subjectName} · {formatTerm(offering.term)}</p>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-600">{instructorName}</td>
                        <td className="px-4 py-4 text-center font-mono text-base font-semibold text-slate-900">
                          {Number(membership.finalGrade).toFixed(2)}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${statusStyles[membership.gradeStatus] || statusStyles.submitted}`}>
                            {statusLabels[membership.gradeStatus] || membership.gradeStatus}
                          </span>
                          {membership.gradeReviewNotes && (
                            <p className="mt-1.5 max-w-xs text-xs text-amber-700">{membership.gradeReviewNotes}</p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {membership.gradeStatus === 'submitted' ? (
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setReturnTarget(membership);
                                  setReturnNotes('');
                                }}
                                disabled={processingId === membership._id}
                                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                              >
                                <RotateCcw className="h-3.5 w-3.5" /> Return
                              </button>
                              <button
                                type="button"
                                onClick={() => approveGrade(membership)}
                                disabled={processingId === membership._id}
                                className="inline-flex items-center gap-1.5 rounded-md bg-univ-blue px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                              >
                                <Check className="h-3.5 w-3.5" /> Approve
                              </button>
                            </div>
                          ) : membership.gradeStatus === 'approved' ? (
                            <button
                              type="button"
                              onClick={() => publishGrade(membership)}
                              disabled={processingId === membership._id}
                              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              <Send className="h-3.5 w-3.5" /> Publish
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500">Waiting for resubmission</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="flex items-start gap-2 text-xs leading-5 text-slate-500">
          <Users className="mt-0.5 h-4 w-4 shrink-0" />
          Published grades become read-only, complete class membership, and appear in the student's official academic record.
        </div>
      </div>

      <Modal
        isOpen={Boolean(returnTarget)}
        onClose={() => {
          if (!processingId) setReturnTarget(null);
        }}
        title="Return grade to instructor"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 p-6">
          <p className="text-sm leading-6 text-slate-600">
            Explain what instructor must correct before resubmitting this grade.
          </p>
          <div>
            <label htmlFor="grade-return-notes" className="mb-1.5 block text-sm font-medium text-slate-700">Review notes</label>
            <textarea
              id="grade-return-notes"
              rows="4"
              value={returnNotes}
              onChange={(event) => setReturnNotes(event.target.value)}
              placeholder="Example: Verify the encoded final grade against the class record."
              className="w-full resize-none rounded-md border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setReturnTarget(null)}
              disabled={Boolean(processingId)}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitReturn}
              disabled={Boolean(processingId)}
              className="rounded-md bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {processingId ? 'Returning...' : 'Return grade'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
