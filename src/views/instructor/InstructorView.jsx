import { useCallback, useEffect, useState } from 'react';
import { BookOpen, CalendarDays, Clock, MapPin, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PortalRefreshButton from '../../components/PortalRefreshButton';

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
    <div className="h-full overflow-y-auto bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Instructor Portal</h1>
            <p className="mt-1 text-sm text-slate-500">Registrar-approved class assignments for active academic terms.</p>
          </div>
          <PortalRefreshButton onRefresh={loadClasses} />
        </div>

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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {classes.map((course) => (
              <div key={course._id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">{course.subjectCode}</p>
                    <h2 className="mt-1 font-bold text-slate-900">{course.subjectName}</h2>
                  </div>
                  <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">{course.sectionCode}</span>
                </div>
                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <p className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" />{course.term?.name || 'Term not set'}</p>
                  <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" />{course.schedule?.day || 'TBA'} · {course.schedule?.time || 'TBA'}</p>
                  <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{course.schedule?.room || 'TBA'}</p>
                  <p className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />Roster managed by official enrollment</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
