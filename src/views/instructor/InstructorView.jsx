import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock,
  MapPin,
  Users,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmationContext';
import PortalPageHeader from '../../components/PortalPageHeader';
import PortalRefreshButton from '../../components/PortalRefreshButton';
import PortalShell from '../../components/PortalShell';
import SearchInput from '../../components/SearchInput';
import InstructorSidebar from './InstructorSidebar';

const gradeStatusStyles = {
  not_submitted: 'border-slate-200 bg-slate-50 text-slate-600',
  submitted: 'border-blue-200 bg-blue-50 text-blue-700',
  returned: 'border-amber-200 bg-amber-50 text-amber-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  published: 'border-indigo-200 bg-indigo-50 text-indigo-700',
};

const gradeStatusLabels = {
  not_submitted: 'Not submitted',
  submitted: 'For review',
  returned: 'Returned',
  approved: 'Approved',
  published: 'Published',
};

function formatTerm(term) {
  if (!term) return 'Term not set';
  if (term.schoolYear && !term.name?.includes(term.schoolYear)) return `${term.name} ${term.schoolYear}`;
  return term.name || 'Term not set';
}

function ClassList({ classes, onOpen }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="assigned-classes-title">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h2 id="assigned-classes-title" className="text-sm font-semibold text-slate-900">Active teaching assignments</h2>
          <p className="mt-0.5 text-xs text-slate-500">{classes.length} {classes.length === 1 ? 'section' : 'sections'} assigned</p>
        </div>
        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Current term</span>
      </div>
      <div className="divide-y divide-slate-100">
        {classes.map((course) => (
          <article key={course._id} className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-indigo-700">{course.subjectCode}</span>
                <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">{course.sectionCode}</span>
              </div>
              <h3 className="mt-1.5 truncate text-sm font-semibold text-slate-900">{course.subjectName}</h3>
            </div>
            <div className="space-y-1.5 text-xs text-slate-600">
              <p className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-slate-400" />{formatTerm(course.term)}</p>
              <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-slate-400" />{course.schedule?.day || 'TBA'} · {course.schedule?.time || 'TBA'}</p>
              <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400" />{course.schedule?.room || 'TBA'}</p>
            </div>
            <button
              type="button"
              onClick={() => onOpen(course)}
              className="inline-flex w-fit items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              View roster <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function InstructorView() {
  const { token } = useAuth();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState('classes');
  const [classes, setClasses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [roster, setRoster] = useState([]);
  const [gradeDrafts, setGradeDrafts] = useState({});
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState('');
  const [error, setError] = useState('');
  const [rosterError, setRosterError] = useState('');

  const loadClasses = useCallback(async () => {
    setError('');
    const response = await fetch('/api/academic/my-classes', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to load assigned classes.');
    setClasses(payload.data || []);
  }, [token]);

  const loadRoster = useCallback(async (course) => {
    if (!course?._id) return;
    setIsRosterLoading(true);
    setRosterError('');
    try {
      const response = await fetch(`/api/academic/offerings/${course._id}/roster`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to load class roster.');
      const rows = payload.data || [];
      setRoster(rows);
      setGradeDrafts(Object.fromEntries(rows.map((row) => [row._id, row.finalGrade ?? ''])));
    } catch (requestError) {
      setRosterError(requestError.message);
    } finally {
      setIsRosterLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadClasses()
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsLoading(false));
  }, [loadClasses]);

  const openRoster = (course) => {
    setSelectedCourse(course);
    setActiveTab('gradebook');
    setSearch('');
    loadRoster(course);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearch('');
  };

  const filteredRoster = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return roster;
    return roster.filter((membership) => {
      const student = membership.student || {};
      return [student.studentId, student.firstName, student.lastName, student.programId]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [roster, search]);

  const submitGrade = async (membership) => {
    const grade = Number(gradeDrafts[membership._id]);
    if (!Number.isFinite(grade) || grade < 1 || grade > 5) {
      toast.error('Enter a final grade from 1.00 to 5.00.');
      return;
    }

    const student = membership.student || {};
    const accepted = await confirm({
      title: membership.gradeStatus === 'returned' ? 'Resubmit final grade' : 'Submit final grade',
      message: `Submit ${grade.toFixed(2)} for ${student.firstName || ''} ${student.lastName || ''}? Registrar review is required before publication.`,
      confirmText: membership.gradeStatus === 'returned' ? 'Resubmit grade' : 'Submit grade',
      type: 'warning',
    });
    if (!accepted) return;

    setSubmittingId(membership._id);
    try {
      const response = await fetch(`/api/academic/memberships/${membership._id}/grade/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ grade }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to submit final grade.');
      setRoster((current) => current.map((row) => (
        row._id === membership._id ? { ...row, ...payload.data, student: row.student } : row
      )));
      toast.success('Final grade submitted for Registrar review.');
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setSubmittingId('');
    }
  };

  const renderGradebook = () => {
    if (!selectedCourse) {
      return (
        <>
          <PortalPageHeader
            title="Class rosters & grades"
            description="Choose an assigned section to view its official roster and submit final grades."
            actions={<PortalRefreshButton onRefresh={loadClasses} />}
          />
          <ClassList classes={classes} onOpen={openRoster} />
        </>
      );
    }

    return (
      <>
        <PortalPageHeader
          title={`${selectedCourse.subjectCode} · ${selectedCourse.sectionCode}`}
          description={`${selectedCourse.subjectName} · ${formatTerm(selectedCourse.term)}`}
          actions={(
            <>
              <button
                type="button"
                onClick={() => setSelectedCourse(null)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> All classes
              </button>
              <PortalRefreshButton onRefresh={() => loadRoster(selectedCourse)} />
            </>
          )}
        />

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Official class roster</h2>
              <p className="mt-0.5 text-xs text-slate-500">{roster.length} enrolled or completed {roster.length === 1 ? 'student' : 'students'}</p>
            </div>
            <div className="w-full sm:w-72">
              <SearchInput value={search} onChange={setSearch} placeholder="Search student ID or name" />
            </div>
          </div>

          {isRosterLoading ? (
            <div className="p-10 text-center text-sm text-slate-500">Loading class roster...</div>
          ) : rosterError ? (
            <div className="m-5 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{rosterError}</div>
          ) : roster.length === 0 ? (
            <div className="p-10 text-center">
              <Users className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">No students in this section</p>
              <p className="mt-1 text-xs text-slate-500">Roster updates after Registrar finalizes enrollment.</p>
            </div>
          ) : filteredRoster.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">No students match your search.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[880px] w-full text-left">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-4 py-3">Program</th>
                    <th className="px-4 py-3">Final grade</th>
                    <th className="px-4 py-3">Review status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRoster.map((membership) => {
                    const student = membership.student || {};
                    const gradeStatus = membership.gradeStatus || 'not_submitted';
                    const canSubmit = membership.status === 'enrolled'
                      && ['not_submitted', 'returned'].includes(gradeStatus);
                    return (
                      <tr key={membership._id} className="text-sm text-slate-700">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-slate-900">{student.lastName}, {student.firstName}</p>
                          <p className="mt-0.5 font-mono text-xs text-slate-500">{student.studentId || 'No student ID'}</p>
                        </td>
                        <td className="px-4 py-3.5 text-xs">
                          <p className="font-medium text-slate-700">{String(student.programId || '—').toUpperCase()}</p>
                          <p className="mt-0.5 text-slate-500">Year {student.yearLevel || '—'}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <input
                            type="number"
                            min="1"
                            max="5"
                            step="0.25"
                            value={gradeDrafts[membership._id] ?? ''}
                            onChange={(event) => setGradeDrafts((current) => ({
                              ...current,
                              [membership._id]: event.target.value,
                            }))}
                            disabled={!canSubmit}
                            aria-label={`Final grade for ${student.firstName || ''} ${student.lastName || ''}`}
                            className="w-24 rounded-md border border-slate-200 px-2.5 py-2 text-sm tabular-nums text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-500"
                            placeholder="1.00"
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${gradeStatusStyles[gradeStatus] || gradeStatusStyles.not_submitted}`}>
                            {gradeStatusLabels[gradeStatus] || gradeStatus}
                          </span>
                          {gradeStatus === 'returned' && membership.gradeReviewNotes && (
                            <p className="mt-1.5 max-w-xs text-xs text-amber-700">{membership.gradeReviewNotes}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {canSubmit ? (
                            <button
                              type="button"
                              onClick={() => submitGrade(membership)}
                              disabled={submittingId === membership._id}
                              className="rounded-md bg-univ-blue px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {submittingId === membership._id
                                ? 'Submitting...'
                                : gradeStatus === 'returned' ? 'Resubmit' : 'Submit grade'}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500">Registrar controlled</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs leading-5 text-slate-500">
          Grade scale: 1.00 highest, 3.00 passing, 5.00 failed. Submitted grades become read-only until Registrar approves or returns them.
        </p>
      </>
    );
  };

  return (
    <PortalShell
      sidebar={<InstructorSidebar activeTab={activeTab} onTabChange={handleTabChange} />}
      portalTitle="Instructor Portal"
      mobileSubtitle="Faculty Access"
    >
      <div className="h-full overflow-y-auto bg-slate-50 p-4 sm:p-5 lg:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {isLoading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
              Loading assigned classes...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>
          ) : classes.length === 0 ? (
            <>
              <PortalPageHeader
                title={activeTab === 'classes' ? 'My classes' : 'Class rosters & grades'}
                description="Official teaching assignments for active academic terms."
                actions={<PortalRefreshButton onRefresh={loadClasses} />}
              />
              <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
                <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">No assigned classes</p>
                <p className="mt-1 text-xs text-slate-500">Registrar or Admin must assign this instructor account to a course offering.</p>
              </div>
            </>
          ) : activeTab === 'classes' ? (
            <>
              <PortalPageHeader
                title="My classes"
                description="Official teaching assignments for active academic terms. Open a section to view its roster."
                actions={<PortalRefreshButton onRefresh={loadClasses} />}
              />
              <ClassList classes={classes} onOpen={openRoster} />
            </>
          ) : renderGradebook()}
        </div>
      </div>
    </PortalShell>
  );
}
