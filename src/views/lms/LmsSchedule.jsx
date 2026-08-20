import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';

const weekDays = [
  { short: 'M', label: 'Monday' },
  { short: 'T', label: 'Tuesday' },
  { short: 'W', label: 'Wednesday' },
  { short: 'TH', label: 'Thursday' },
  { short: 'F', label: 'Friday' },
  { short: 'S', label: 'Saturday' },
];

function meetsOn(dayCode, target) {
  const value = String(dayCode || '').toUpperCase().replaceAll(' ', '');
  if (!value || value === 'TBA') return false;
  if (target === 'TH') return value.includes('TH');
  const withoutThursday = value.replaceAll('TH', '');
  return withoutThursday.includes(target);
}

function formatDeadline(value) {
  if (!value) return 'No deadline';
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function LmsSchedule({ classes, token, onOpenClass }) {
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSchedule = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const fetchPage = async (page) => {
        const response = await fetch(`/api/lms/assignments?page=${page}&limit=100`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to load schedule.');
        return payload;
      };
      const firstPage = await fetchPage(1);
      const remainingPages = await Promise.all(Array.from(
        { length: Math.max(0, (firstPage.pagination?.pages || 0) - 1) },
        (_, index) => fetchPage(index + 2),
      ));
      setAssignments([firstPage, ...remainingPages].flatMap((payload) => payload.data || []));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { loadSchedule(); }, [loadSchedule]);

  const deadlines = useMemo(() => {
    return assignments
      .map((item) => ({ ...item.assignment, offering: item.offering, state: item.state }))
      .sort((left, right) => new Date(left.dueAt) - new Date(right.dueAt));
  }, [assignments]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Schedule</h1><p className="mt-1 text-sm text-slate-600">Weekly classes and upcoming LMS deadlines.</p></div>
        <button type="button" onClick={loadSchedule} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">Weekly class schedule</h2></div>
        <div className="overflow-x-auto">
          <div className="grid min-w-[900px] grid-cols-6 divide-x divide-slate-200">
            {weekDays.map((day) => {
              const meetings = classes.filter((offering) => meetsOn(offering.schedule?.day, day.short));
              return (
                <section key={day.label} className="min-h-72">
                  <h3 className="border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700">{day.label}</h3>
                  <div className="space-y-2 p-2">
                    {meetings.length === 0 ? <p className="px-2 py-4 text-xs text-slate-400">No classes</p> : meetings.map((offering) => (
                      <button key={offering._id} type="button" onClick={() => onOpenClass(offering)} className="w-full border-l-2 border-univ-blue bg-slate-50 px-3 py-2 text-left hover:bg-blue-50">
                        <span className="block text-xs font-semibold text-slate-900">{offering.subjectCode}</span>
                        <span className="mt-1 block text-xs text-slate-600">{offering.schedule?.time || 'TBA'}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{offering.schedule?.room || 'Room TBA'}</span>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">Assignment deadlines</h2></div>
        {isLoading ? <div className="px-5 py-10 text-center text-sm text-slate-500">Loading deadlines...</div> : error ? <div className="m-4 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : deadlines.length === 0 ? <div className="px-5 py-10 text-center text-sm text-slate-500">No upcoming deadlines.</div> : <div className="divide-y divide-slate-100">{deadlines.map((assignment) => {
          const overdue = new Date(assignment.dueAt).getTime() < Date.now();
          return <button key={assignment._id} type="button" onClick={() => onOpenClass(assignment.offering, 'assignments')} className="flex w-full flex-col gap-2 px-5 py-4 text-left hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"><span><span className="block text-sm font-semibold text-slate-900">{assignment.title}</span><span className="mt-1 block text-xs text-slate-500">{assignment.offering?.subjectCode} · {assignment.points} points</span></span><span className={`flex items-center gap-2 text-xs font-medium ${overdue && !['graded', 'submitted'].includes(assignment.state) ? 'text-rose-700' : 'text-slate-600'}`}>{assignment.state ? `${assignment.state === 'grading' ? 'Needs grading' : assignment.state} · ` : ''}{formatDeadline(assignment.dueAt)}<ArrowRight className="h-3.5 w-3.5" /></span></button>;
        })}</div>}
      </section>
    </div>
  );
}
