import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bell, BookOpen, ExternalLink, LayoutDashboard, LogOut, RefreshCw, Settings2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import LmsClassView from './LmsClassView';
import LmsDashboard from './LmsDashboard';
import LmsNotifications from './LmsNotifications';

const allowedRoles = new Set(['student', 'instructor', 'admin']);

function formatTerm(term) {
  if (!term) return 'Term not set';
  if (term.schoolYear && !String(term.name || '').includes(term.schoolYear)) return `${term.name} ${term.schoolYear}`;
  return term.name || 'Term not set';
}

function ClassCard({ offering, role, onOpen }) {
  const disabledForStudent = role === 'student' && !offering.lmsEnabled;
  return (
    <article className="flex min-h-56 flex-col rounded-lg border border-slate-200 bg-white">
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-univ-blue">{offering.subjectCode}</span>
            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">{offering.sectionCode}</span>
          </div>
          <span className={`text-xs font-semibold ${offering.lmsEnabled ? 'text-emerald-700' : 'text-slate-500'}`}>
            {offering.lmsEnabled ? 'Open' : 'Unavailable'}
          </span>
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">{offering.subjectName}</h3>
        <p className="mt-1 text-sm text-slate-600">{offering.instructorName || 'Instructor not assigned'}</p>
        <dl className="mt-5 space-y-2 text-xs text-slate-600">
          <div className="flex gap-2"><dt className="w-16 shrink-0 text-slate-400">Term</dt><dd>{formatTerm(offering.term)}</dd></div>
          <div className="flex gap-2"><dt className="w-16 shrink-0 text-slate-400">Schedule</dt><dd>{offering.schedule?.day || 'TBA'} · {offering.schedule?.time || 'TBA'}</dd></div>
          <div className="flex gap-2"><dt className="w-16 shrink-0 text-slate-400">Room</dt><dd>{offering.schedule?.room || 'TBA'}</dd></div>
        </dl>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
        <span className="text-xs text-slate-500">{disabledForStudent ? 'Waiting for instructor' : 'Announcements and materials'}</span>
        <button
          type="button"
          onClick={() => onOpen(offering)}
          disabled={disabledForStudent}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-univ-blue hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
        >
          Open course <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

export default function LmsView({ onBack, onSignOut }) {
  const { user, token } = useAuth();
  const [classes, setClasses] = useState([]);
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedClassTab, setSelectedClassTab] = useState('overview');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');

  const loadClasses = useCallback(async () => {
    if (!allowedRoles.has(user?.role)) return;
    setError('');
    setIsLoading(true);
    try {
      const endpoint = user.role === 'admin' ? '/api/academic/offerings?status=active' : '/api/academic/my-classes';
      const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to load LMS classes.');
      const rows = user.role === 'student'
        ? (payload.data || []).map((membership) => membership.offering).filter(Boolean)
        : (payload.data || []);
      setClasses(rows);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [token, user?.role]);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  const loadNotifications = useCallback(async () => {
    if (!allowedRoles.has(user?.role)) return;
    setNotificationsError('');
    try {
      const response = await fetch('/api/lms/notifications', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to load notifications.');
      setNotifications(payload.data || []);
      setUnreadCount(payload.unreadCount || 0);
    } catch (requestError) {
      setNotificationsError(requestError.message);
    } finally {
      setNotificationsLoading(false);
    }
  }, [token, user?.role]);

  useEffect(() => {
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 30_000);
    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  const openClass = (offering, tab = 'overview') => {
    setActiveView('classes');
    setSelectedClassTab(tab);
    setSelectedClass(offering);
  };

  const groupedClasses = useMemo(() => classes, [classes]);

  const updateAccess = async (offering) => {
    setUpdatingId(offering._id);
    try {
      const response = await fetch(`/api/lms/offerings/${offering._id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !offering.lmsEnabled }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to update LMS access.');
      setClasses((current) => current.map((item) => item._id === offering._id ? { ...item, lmsEnabled: payload.data.lmsEnabled } : item));
      toast.success(payload.data.lmsEnabled ? 'LMS access enabled.' : 'LMS access disabled.');
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setUpdatingId('');
    }
  };

  if (!allowedRoles.has(user?.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">LMS access unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">Only student, instructor, and administrator accounts can use this system.</p>
          <button type="button" onClick={onBack} className="mt-5 rounded-md bg-univ-blue px-4 py-2 text-sm font-semibold text-white">Back to Enrollment System</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="z-50 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/logo.png" alt="NCST Logo" className="h-9 w-9 object-contain" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-univ-navy sm:text-base">NCST Learning Management System</p>
            <p className="hidden text-xs text-slate-500 sm:block">Academic classes and learning resources</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <span className="hidden text-xs font-medium text-slate-500 lg:inline">{user.email}</span>
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            <ExternalLink className="h-3.5 w-3.5" /><span className="hidden sm:inline">Enrollment System</span>
          </button>
          <button type="button" onClick={onSignOut} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-700">
            <LogOut className="h-3.5 w-3.5" /><span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white px-4 sm:px-6">
        <nav className="mx-auto flex h-11 max-w-6xl items-end gap-6" aria-label="LMS navigation">
          <button type="button" onClick={() => { setSelectedClass(null); setSelectedClassTab('overview'); setActiveView('dashboard'); }} className={`inline-flex h-11 items-center gap-2 border-b-2 px-1 text-sm font-semibold ${activeView === 'dashboard' && !selectedClass ? 'border-univ-blue text-univ-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </button>
          <button type="button" onClick={() => { setSelectedClass(null); setSelectedClassTab('overview'); setActiveView('classes'); }} className={`inline-flex h-11 items-center gap-2 border-b-2 px-1 text-sm font-semibold ${activeView === 'classes' || selectedClass ? 'border-univ-blue text-univ-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {user.role === 'admin' ? <Settings2 className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}{user.role === 'admin' ? 'Course access' : 'My courses'}
          </button>
          <button type="button" onClick={() => { setSelectedClass(null); setSelectedClassTab('overview'); setActiveView('notifications'); loadNotifications(); }} className={`inline-flex h-11 items-center gap-2 border-b-2 px-1 text-sm font-semibold ${activeView === 'notifications' && !selectedClass ? 'border-univ-blue text-univ-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Bell className="h-4 w-4" /> Notifications
            {unreadCount > 0 && <span className="min-w-5 rounded-md bg-indigo-100 px-1.5 py-0.5 text-center text-[11px] font-bold text-indigo-700">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
        </nav>
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-6xl space-y-6">
              {selectedClass ? (
                <LmsClassView offering={selectedClass} role={user.role} token={token} initialTab={selectedClassTab} onBack={() => { setSelectedClass(null); setSelectedClassTab('overview'); loadClasses(); loadNotifications(); }} />
              ) : activeView === 'dashboard' ? (
                <LmsDashboard role={user.role} token={token} onOpenClass={openClass} />
              ) : activeView === 'notifications' ? (
                <LmsNotifications
                  notifications={notifications}
                  unreadCount={unreadCount}
                  isLoading={notificationsLoading}
                  error={notificationsError}
                  token={token}
                  onReload={loadNotifications}
                  onUnreadChange={setUnreadCount}
                  onOpenClass={openClass}
                />
              ) : (
                <>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{user.role === 'admin' ? 'Course access' : 'My courses'}</h1>
                      <p className="mt-1 text-sm text-slate-600">{user.role === 'admin' ? 'Control which active course offerings can use LMS features.' : 'Open a course to read announcements and access learning materials.'}</p>
                    </div>
                    <button type="button" onClick={loadClasses} className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                      <RefreshCw className="h-3.5 w-3.5" /> Refresh
                    </button>
                  </div>

                  {isLoading ? (
                    <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Loading LMS classes...</div>
                  ) : error ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>
                  ) : groupedClasses.length === 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
                      <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-3 text-sm font-semibold text-slate-700">No classes available</p>
                      <p className="mt-1 text-xs text-slate-500">Classes appear after official enrollment or instructor assignment.</p>
                    </div>
                  ) : user.role === 'admin' ? (
                    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-200 px-5 py-4">
                        <h2 className="text-sm font-semibold text-slate-900">Active course offerings</h2>
                        <p className="mt-0.5 text-xs text-slate-500">{classes.length} offerings in active status</p>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {classes.map((offering) => (
                          <article key={offering._id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-bold text-indigo-700">{offering.subjectCode}</span>
                                <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">{offering.sectionCode}</span>
                              </div>
                              <p className="mt-1.5 text-sm font-semibold text-slate-900">{offering.subjectName}</p>
                              <p className="mt-1 text-xs text-slate-500">{formatTerm(offering.term)} · {offering.instructorName || 'Instructor not assigned'}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button type="button" onClick={() => openClass(offering)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Preview class</button>
                              <button
                                type="button"
                                onClick={() => updateAccess(offering)}
                                disabled={updatingId === offering._id}
                                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${offering.lmsEnabled ? 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50' : 'bg-univ-blue text-white hover:bg-blue-700'} disabled:opacity-60`}
                              >
                                <Settings2 className="h-3.5 w-3.5" />{updatingId === offering._id ? 'Saving...' : offering.lmsEnabled ? 'Disable LMS' : 'Enable LMS'}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  ) : (
                    <section>
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-900">Current courses</h2>
                        <p className="text-xs text-slate-500">{classes.length} {classes.length === 1 ? 'course' : 'courses'}</p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {classes.map((offering) => <ClassCard key={offering._id} offering={offering} role={user.role} onOpen={openClass} />)}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
      </main>
    </div>
  );
}
