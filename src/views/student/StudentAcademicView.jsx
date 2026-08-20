import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, Clock, FileText, MapPin } from 'lucide-react';
import { SUBJECTS } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import PortalPageHeader from '../../components/PortalPageHeader';
import PortalRefreshButton from '../../components/PortalRefreshButton';

function formatTerm(term) {
  if (!term) return 'Term not set';
  if (typeof term === 'string') return term;
  if (term.schoolYear && !term.name?.includes(term.schoolYear)) return `${term.name} ${term.schoolYear}`;
  return term.name || 'Term not set';
}

function gradeRemark(grade) {
  const value = Number(grade);
  if (!Number.isFinite(value)) return 'Not available';
  return value <= 3 ? 'Passed' : value === 5 ? 'Failed' : 'Conditional';
}

export default function StudentAcademicView({ view, student }) {
  const { token } = useAuth();
  const [memberships, setMemberships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMemberships = useCallback(async () => {
    setError('');
    const response = await fetch('/api/academic/my-classes', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to load academic records.');
    setMemberships(payload.data || []);
  }, [token]);

  useEffect(() => {
    setIsLoading(true);
    loadMemberships()
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsLoading(false));
  }, [loadMemberships]);

  const activeClasses = useMemo(
    () => memberships.filter((membership) => membership.status === 'enrolled'),
    [memberships]
  );

  const academicRows = useMemo(() => {
    const publishedMemberships = memberships
      .filter((membership) => membership.gradeStatus === 'published' && membership.finalGrade != null)
      .map((membership) => ({
        key: membership._id,
        subjectId: membership.offering?.subjectId,
        subjectCode: membership.offering?.subjectCode,
        subjectName: membership.offering?.subjectName,
        units: membership.offering?.units,
        term: formatTerm(membership.offering?.term),
        grade: membership.finalGrade,
      }));

    const membershipKeys = new Set(
      publishedMemberships.map((row) => `${row.subjectId}|${row.term}`)
    );
    const legacyRows = (student?.academicRecord || [])
      .filter((record) => !membershipKeys.has(`${record.subjectId}|${record.term}`))
      .map((record, index) => {
        const subject = SUBJECTS.find((item) => item.id === record.subjectId);
        return {
          key: `legacy-${record.subjectId}-${record.term}-${index}`,
          subjectId: record.subjectId,
          subjectCode: subject?.code || String(record.subjectId || '—').toUpperCase(),
          subjectName: subject?.name || 'Subject record',
          units: subject?.units || '—',
          term: record.term || 'Term not set',
          grade: record.grade,
        };
      });

    return [...publishedMemberships, ...legacyRows].sort((a, b) => String(b.term).localeCompare(String(a.term)));
  }, [memberships, student?.academicRecord]);

  if (isLoading) {
    return <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Loading academic information...</div>;
  }

  if (error) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>;
  }

  if (view === 'classes') {
    return (
      <div className="space-y-6">
        <PortalPageHeader
          title="My classes"
          description="Official classes created from your Registrar-approved enrollment."
          actions={<PortalRefreshButton onRefresh={loadMemberships} />}
        />
        {activeClasses.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
            <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">No active class memberships</p>
            <p className="mt-1 text-xs text-slate-500">Classes appear after Registrar finalizes enrollment.</p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Current enrolled classes</h2>
              <p className="mt-0.5 text-xs text-slate-500">{activeClasses.length} {activeClasses.length === 1 ? 'class' : 'classes'}</p>
            </div>
            <div className="divide-y divide-slate-100">
              {activeClasses.map((membership) => {
                const offering = membership.offering || {};
                const instructor = offering.instructor;
                const instructorName = instructor
                  ? `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim()
                  : offering.instructorName || 'TBA';
                return (
                  <article key={membership._id} className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-700">{offering.subjectCode}</span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">{offering.sectionCode}</span>
                      </div>
                      <h3 className="mt-1.5 text-sm font-semibold text-slate-900">{offering.subjectName}</h3>
                      <p className="mt-1 text-xs text-slate-500">{offering.units || 0} units · {instructorName}</p>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <p className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-slate-400" />{formatTerm(offering.term)}</p>
                      <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-slate-400" />{offering.schedule?.day || 'TBA'} · {offering.schedule?.time || 'TBA'}</p>
                      <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400" />{offering.schedule?.room || 'TBA'}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title="Academic record"
        description="Registrar-published final grades. Pending instructor submissions remain private."
        actions={<PortalRefreshButton onRefresh={loadMemberships} />}
      />
      {academicRows.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
          <FileText className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-700">No published grades</p>
          <p className="mt-1 text-xs text-slate-500">Final grades appear after Registrar approval and publication.</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-left">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-4 py-3">Term</th>
                  <th className="px-4 py-3 text-center">Units</th>
                  <th className="px-4 py-3 text-center">Final grade</th>
                  <th className="px-5 py-3">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {academicRows.map((row) => {
                  const remark = gradeRemark(row.grade);
                  return (
                    <tr key={row.key} className="text-sm text-slate-700">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{row.subjectCode}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{row.subjectName}</p>
                      </td>
                      <td className="px-4 py-4 text-xs">{row.term}</td>
                      <td className="px-4 py-4 text-center tabular-nums">{row.units}</td>
                      <td className="px-4 py-4 text-center font-mono font-semibold text-slate-900">{Number(row.grade).toFixed(2)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${
                          remark === 'Passed'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : remark === 'Failed'
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : 'border-amber-200 bg-amber-50 text-amber-700'
                        }`}>
                          {remark}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
