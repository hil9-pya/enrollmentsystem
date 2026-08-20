import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, Search } from 'lucide-react';

function formatDate(value) {
  if (!value) return 'No deadline';
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

const studentFilters = [
  ['all', 'All'], ['upcoming', 'Upcoming'], ['overdue', 'Overdue'], ['missing', 'Missing'],
  ['submitted', 'Submitted'], ['late', 'Late'], ['returned', 'Returned'], ['graded', 'Graded'],
];
const staffFilters = [['all', 'All'], ['upcoming', 'Upcoming'], ['overdue', 'Overdue'], ['grading', 'Needs grading'], ['closed', 'Closed']];

function stateLabel(state) {
  return state === 'grading' ? 'Needs grading' : state;
}

function stateClass(state) {
  if (['overdue', 'missing'].includes(state)) return 'text-rose-700';
  if (['returned', 'late'].includes(state)) return 'text-amber-700';
  if (['graded', 'submitted'].includes(state)) return 'text-emerald-700';
  return 'text-slate-600';
}

export default function LmsAllAssignments({ role, token, onOpenClass }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 0, total: 0 });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => { setPage(1); }, [filter, debouncedSearch]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25', state: filter });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const response = await fetch(`/api/lms/assignments?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to load assignments.');
      setItems(payload.data || []);
      setPagination(payload.pagination || { page, pages: 0, total: 0 });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, filter, page, token]);

  useEffect(() => { load(); }, [load]);

  const filters = role === 'student' ? studentFilters : staffFilters;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Assignments</h1><p className="mt-1 text-sm text-slate-600">Coursework across current active classes.</p></div>
        <button type="button" onClick={load} className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
      </div>

      <div className="space-y-3">
        <label className="relative block max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <span className="sr-only">Search assignments</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, subject, or section" className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-univ-blue focus:ring-2 focus:ring-blue-500/20" />
        </label>
        <div className="flex flex-wrap gap-1 border-b border-slate-200">{filters.map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`border-b-2 px-3 py-2 text-xs font-semibold ${filter === value ? 'border-univ-blue text-univ-blue' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>{label}</button>)}</div>
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3 text-xs text-slate-500">{pagination.total} assignment{pagination.total === 1 ? '' : 's'}</div>
        {isLoading ? <div className="p-10 text-center text-sm text-slate-500">Loading assignments...</div> : error ? <div className="m-4 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : items.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No assignments in this view.</div> : <div className="divide-y divide-slate-100">{items.map((item) => (
          <button key={item.assignment?._id} type="button" onClick={() => onOpenClass(item.offering, 'assignments')} className="grid w-full gap-3 px-5 py-4 text-left hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_11rem_9rem_auto] sm:items-center">
            <span><span className="block text-sm font-semibold text-slate-900">{item.assignment?.title || 'Assignment'}</span><span className="mt-1 block text-xs text-slate-500">{item.offering?.subjectCode || 'Course'}{item.offering?.sectionCode ? ` · ${item.offering.sectionCode}` : ''}</span></span>
            <span className="text-xs text-slate-600">{formatDate(item.assignment?.dueAt)}</span>
            <span><span className={`block text-xs font-semibold capitalize ${stateClass(item.state)}`}>{stateLabel(item.state)}</span>{role !== 'student' && <span className="mt-1 block text-[11px] text-slate-500">{item.pendingSubmissionCount || 0} pending · {item.submissionCount || 0} submitted</span>}{role === 'student' && item.state === 'graded' && <span className="mt-1 block text-[11px] text-slate-500">{item.submission?.score} / {item.assignment?.points}</span>}</span>
            <ArrowRight className="hidden h-4 w-4 text-slate-400 sm:block" />
          </button>
        ))}</div>}
        {!isLoading && !error && pagination.pages > 1 && <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3"><span className="text-xs text-slate-500">Page {pagination.page} of {pagination.pages}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><ArrowLeft className="h-3.5 w-3.5" /> Previous</button><button type="button" disabled={page >= pagination.pages} onClick={() => setPage((current) => current + 1)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">Next <ArrowRight className="h-3.5 w-3.5" /></button></div></div>}
      </section>
    </div>
  );
}
