import { useCallback, useEffect, useState } from 'react';
import { BookOpen, CalendarDays, Clock, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PortalPageHeader from '../../components/PortalPageHeader';
import PortalRefreshButton from '../../components/PortalRefreshButton';
import PortalShell from '../../components/PortalShell';
import InstructorSidebar from './InstructorSidebar';

export default function InstructorView() {
  const { token } = useAuth();
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    loadClasses()
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsLoading(false));
  }, [loadClasses]);

  return (
    <PortalShell sidebar={<InstructorSidebar />} portalTitle="Instructor Portal" mobileSubtitle="Faculty Access">
      <div className="h-full overflow-y-auto bg-slate-50 p-4 sm:p-5 lg:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <PortalPageHeader
            title="My classes"
            description="Official teaching assignments for active academic terms. Only registrar-approved sections appear here."
            actions={<PortalRefreshButton onRefresh={loadClasses} />}
          />

          {isLoading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
              Loading assigned classes...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>
          ) : classes.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
              <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">No assigned classes</p>
              <p className="mt-1 text-xs text-slate-500">Registrar or Admin must assign this instructor account to a course offering.</p>
            </div>
          ) : (
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="assigned-classes-title">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 id="assigned-classes-title" className="text-sm font-semibold text-slate-900">Active teaching assignments</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{classes.length} {classes.length === 1 ? 'section' : 'sections'} assigned</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Current term</span>
              </div>
              <div className="divide-y divide-slate-100">
                {classes.map((course) => (
                  <article key={course._id} className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-700">{course.subjectCode}</span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">{course.sectionCode}</span>
                      </div>
                      <h3 className="mt-1.5 truncate text-sm font-semibold text-slate-900">{course.subjectName}</h3>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <p className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-slate-400" />{course.term?.name || 'Term not set'}</p>
                      <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-slate-400" />{course.schedule?.day || 'TBA'} · {course.schedule?.time || 'TBA'}</p>
                      <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400" />{course.schedule?.room || 'TBA'}</p>
                    </div>
                    <span className="w-fit rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600">Official assignment</span>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
