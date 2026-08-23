import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Bell, BookOpen, CalendarDays, ClipboardList, LayoutDashboard, LogOut, RefreshCw, Search, Settings2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import LmsClassView from './LmsClassView';
import LmsDashboard from './LmsDashboard';
import LmsNotifications from './LmsNotifications';
import LmsSidebar from './LmsSidebar';
import LmsSchedule from './LmsSchedule';
import LmsAllAssignments from './LmsAllAssignments';

const allowedRoles = new Set(['student', 'instructor', 'admin']);

function formatTerm(term) {
  if (!term) return 'Term not set';
  if (term.schoolYear && !String(term.name || '').includes(term.schoolYear)) return `${term.name} ${term.schoolYear}`;
  return term.name || 'Term not set';
}

function ClassCard({ offering, role, onOpen }) {
  const disabledForStudent = role === 'student' && !offering.lmsEnabled;
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex h-1"><span className="flex-1 bg-[#0c2a52]" /><span className="w-12 bg-[#f5c542]" /></div>
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-univ-blue">{offering.subjectCode}</span>
            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">{offering.sectionCode}</span>
          </div>
          <span className={`text-xs font-semibold ${offering.lmsEnabled ? 'text-emerald-700' : 'text-slate-500'}`}>
            {offering.lmsEnabled ? 'Open' : 'Unavailable'}
          </span>
        </div>
        <h3 className="mt-3 text-base font-semibold text-slate-900">{offering.subjectName}</h3>
        <p className="mt-1 text-sm text-slate-600">{offering.instructorName || 'Instructor not assigned'}</p>
        <p className="mt-4 text-xs text-slate-500">{offering.schedule?.day || 'TBA'} · {offering.schedule?.time || 'TBA'} · {offering.schedule?.room || 'Room TBA'}</p>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
        <span className="text-xs text-slate-500">{disabledForStudent ? 'Waiting for instructor' : formatTerm(offering.term)}</span>
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
  const [notificationsLoadingMore, setNotificationsLoadingMore] = useState(false);
  const [notificationPagination, setNotificationPagination] = useState({ page: 1, pages: 0, total: 0 });
  const [notificationsError, setNotificationsError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [notificationMotionKey, setNotificationMotionKey] = useState(0);
  const [searchIndex, setSearchIndex] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const hasLoadedNotificationsRef = useRef(false);
  const unreadCountRef = useRef(0);
  const notificationMenuRef = useRef(null);

  const loadClasses = useCallback(async () => {
    if (!allowedRoles.has(user?.role)) return;
    setError('');
    setIsLoading(true);
    try {
      const endpoint = user.role === 'admin' ? '/api/academic/offerings?status=active' : '/api/academic/my-classes?scope=current';
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
      const response = await fetch('/api/lms/notifications?page=1&limit=50', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to load notifications.');
      const nextUnreadCount = payload.unreadCount || 0;
      if (hasLoadedNotificationsRef.current && nextUnreadCount > unreadCountRef.current) {
        setNotificationMotionKey((current) => current + 1);
      }
      hasLoadedNotificationsRef.current = true;
      unreadCountRef.current = nextUnreadCount;
      setNotifications(payload.data || []);
      setNotificationPagination(payload.pagination || { page: 1, pages: 0, total: payload.data?.length || 0 });
      setUnreadCount(nextUnreadCount);
    } catch (requestError) {
      setNotificationsError(requestError.message);
    } finally {
      setNotificationsLoading(false);
    }
  }, [token, user?.role]);

  const loadMoreNotifications = useCallback(async () => {
    if (notificationsLoadingMore || notificationPagination.page >= notificationPagination.pages) return;
    setNotificationsLoadingMore(true);
    try {
      const nextPage = notificationPagination.page + 1;
      const response = await fetch(`/api/lms/notifications?page=${nextPage}&limit=50`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to load more notifications.');
      setNotifications((current) => {
        const rows = [...current, ...(payload.data || [])];
        return rows.filter((item, index) => rows.findIndex((candidate) => candidate._id === item._id) === index);
      });
      setNotificationPagination(payload.pagination || notificationPagination);
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setNotificationsLoadingMore(false);
    }
  }, [notificationPagination, notificationsLoadingMore, token]);

  useEffect(() => {
    loadNotifications();
    const refreshOnFocus = () => loadNotifications();
    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') loadNotifications();
    };
    const interval = window.setInterval(loadNotifications, 10_000);
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnVisible);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!showNotificationMenu) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!notificationMenuRef.current?.contains(event.target)) setShowNotificationMenu(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [showNotificationMenu]);

  useEffect(() => {
    unreadCountRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2 || !allowedRoles.has(user?.role)) {
      setSearchIndex([]);
      setSearchLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await fetch(`/api/lms/search?q=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal });
        const payload = await response.json();
        if (response.ok) setSearchIndex(payload.data || []);
      } catch (requestError) {
        if (requestError.name !== 'AbortError') setSearchIndex([]);
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [searchQuery, token, user?.role]);

  const openClass = (offering, tab = 'overview') => {
    setActiveView('classes');
    setSelectedClassTab(tab);
    setSelectedClass(offering);
  };

  const changeView = (view) => {
    setSelectedClass(null);
    setSelectedClassTab('overview');
    setActiveView(view);
    if (view === 'notifications') loadNotifications();
  };

  const groupedClasses = useMemo(() => classes, [classes]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    const courseResults = classes.filter((offering) => [offering.subjectCode, offering.subjectName, offering.sectionCode, offering.instructorName].some((value) => String(value || '').toLowerCase().includes(query))).map((offering) => ({ id: `course-${offering._id}`, type: 'Course', title: `${offering.subjectCode} ${offering.subjectName}`, detail: offering.sectionCode, offering, tab: 'overview' }));
    const notificationResults = notifications.filter((item) => [item.title, item.message, item.offering?.subjectCode].some((value) => String(value || '').toLowerCase().includes(query))).map((item) => ({ id: `notification-${item._id}`, type: item.type === 'material' ? 'Material' : item.type === 'announcement' ? 'Announcement' : 'Update', title: item.title, detail: item.offering?.subjectCode, offering: item.offering, tab: item.tab || 'overview' }));
    return [...courseResults, ...searchIndex, ...notificationResults].filter((item, index, rows) => rows.findIndex((candidate) => candidate.id === item.id) === index).slice(0, 12);
  }, [classes, notifications, searchIndex, searchQuery]);

  const openSearchResult = (result) => {
    setSearchQuery('');
    setShowMobileSearch(false);
    if (result.offering) openClass(result.offering, result.tab);
  };

  const markNotificationRead = async (notification) => {
    if (notification.readAt) return true;
    const response = await fetch(`/api/lms/notifications/${notification._id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return false;
    setNotifications((current) => current.map((item) => item._id === notification._id ? { ...item, readAt: new Date().toISOString() } : item));
    setUnreadCount((current) => Math.max(0, current - 1));
    return true;
  };

  const markAllNotificationsRead = async () => {
    const response = await fetch('/api/lms/notifications/read-all', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return false;
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt })));
    setUnreadCount(0);
    return true;
  };

  const openNotification = async (notification) => {
    if (!notification.readAt) {
      await markNotificationRead(notification);
    }
    setShowNotificationMenu(false);
    if (notification.offering) openClass(notification.offering, notification.tab || 'overview');
  };

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
        <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center">
          <h1 className="text-lg font-semibold text-slate-900">LMS access unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">Only student, instructor, and administrator accounts can use this system.</p>
          <button type="button" onClick={onBack} className="mt-5 rounded-md bg-univ-blue px-4 py-2 text-sm font-semibold text-white">Back to Enrollment System</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <div className="hidden lg:block"><LmsSidebar role={user.role} activeView={selectedClass ? 'classes' : activeView} onChange={changeView} unreadCount={unreadCount} /></div>
      <div className="flex min-w-0 flex-1 flex-col">
      <header className="relative z-50 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 lg:hidden"><img src="/logo.png" alt="NCST Logo" className="h-9 w-9 object-contain" /><p className="truncate text-sm font-bold text-univ-navy">NCST LMS</p></div>
        <div className="relative hidden w-full max-w-lg sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search courses, assignments, announcements" aria-label="Search LMS" className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-univ-blue focus:ring-2 focus:ring-blue-500/20" />
          {searchQuery.trim() && <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"><div className="border-b border-slate-100 px-4 py-2 text-xs font-semibold text-slate-500">Search results</div>{searchLoading && searchResults.length === 0 ? <div className="px-4 py-6 text-center text-sm text-slate-500">Searching...</div> : searchResults.length === 0 ? <div className="px-4 py-6 text-center text-sm text-slate-500">No results found.</div> : <div className="divide-y divide-slate-100">{searchResults.map((result) => <button key={result.id} type="button" onClick={() => openSearchResult(result)} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50"><span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-900">{result.title}</span><span className="mt-0.5 block text-xs text-slate-500">{result.type}{result.detail ? ` · ${result.detail}` : ''}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-slate-400" /></button>)}</div>}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:ml-4 sm:gap-2">
          <button type="button" onClick={() => setShowMobileSearch((current) => !current)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 sm:hidden" aria-label="Search LMS"><Search className="h-4 w-4" /></button>
          <div ref={notificationMenuRef} className="relative">
            <button type="button" onClick={() => setShowNotificationMenu((current) => !current)} className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label={`${unreadCount} unread notifications`} aria-expanded={showNotificationMenu}><Bell key={`notification-bell-${notificationMotionKey}`} className={`h-4 w-4 ${notificationMotionKey > 0 ? 'lms-notification-ring' : ''}`} />{unreadCount > 0 && <span key={`notification-badge-${notificationMotionKey}`} className={`absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-univ-blue px-1 text-center text-[10px] font-bold leading-4 text-white ${notificationMotionKey > 0 ? 'lms-notification-badge' : ''}`}>{unreadCount > 9 ? '9+' : unreadCount}</span>}</button>
            {showNotificationMenu && <div className="lms-notification-menu absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><p className="text-sm font-semibold text-slate-900">Notifications</p><p className="mt-0.5 text-xs text-slate-500">{unreadCount} unread</p></div><button type="button" onClick={() => setShowNotificationMenu(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close notifications"><X className="h-4 w-4" /></button></div>{notificationsLoading ? <div className="p-6 text-center text-sm text-slate-500">Loading...</div> : notificationsError ? <div className="p-4 text-sm text-rose-700">{notificationsError}</div> : notifications.length === 0 ? <div className="p-6 text-center text-sm text-slate-500">No notifications.</div> : <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">{notifications.slice(0, 5).map((notification) => <button key={notification._id} type="button" onClick={() => openNotification(notification)} className={`w-full px-4 py-3 text-left hover:bg-slate-50 ${notification.readAt ? '' : 'bg-blue-50/60'}`}><span className={`block text-sm ${notification.readAt ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>{notification.title}</span>{notification.message && <span className="mt-1 line-clamp-2 block text-xs text-slate-500">{notification.message}</span>}</button>)}</div>}<button type="button" onClick={() => { setShowNotificationMenu(false); changeView('notifications'); }} className="w-full border-t border-slate-200 px-4 py-3 text-center text-xs font-semibold text-univ-blue hover:bg-slate-50">View all notifications</button></div>}
          </div>
          <span className="hidden max-w-40 truncate text-xs font-medium text-slate-600 md:inline">{user.firstName || user.email}</span>
          <button type="button" onClick={onSignOut} className="rounded-md p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700" aria-label="Sign out"><LogOut className="h-4 w-4" /></button>
        </div>
      </header>

      {showMobileSearch && <div className="relative z-40 border-b border-slate-200 bg-white p-3 sm:hidden"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search LMS" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-univ-blue" /></div>{searchQuery.trim() && <div className="mt-2 overflow-hidden rounded-md border border-slate-200">{searchResults.length === 0 ? <div className="p-4 text-center text-sm text-slate-500">No results found.</div> : searchResults.map((result) => <button key={result.id} type="button" onClick={() => openSearchResult(result)} className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2.5 text-left last:border-0"><span><span className="block text-sm font-medium text-slate-900">{result.title}</span><span className="text-xs text-slate-500">{result.type}</span></span><ArrowRight className="h-4 w-4 text-slate-400" /></button>)}</div>}</div>}

      <div className="border-b border-slate-200 bg-white px-4 lg:hidden">
        <nav className="mx-auto flex h-11 max-w-6xl items-end gap-6 overflow-x-auto" aria-label="LMS navigation">
          <button type="button" onClick={() => changeView('dashboard')} className={`inline-flex h-11 items-center gap-2 border-b-2 px-1 text-sm font-semibold ${activeView === 'dashboard' && !selectedClass ? 'border-univ-blue text-univ-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </button>
          <button type="button" onClick={() => changeView('classes')} className={`inline-flex h-11 items-center gap-2 border-b-2 px-1 text-sm font-semibold ${activeView === 'classes' || selectedClass ? 'border-univ-blue text-univ-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {user.role === 'admin' ? <Settings2 className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}{user.role === 'admin' ? 'Course access' : 'My courses'}
          </button>
          <button type="button" onClick={() => changeView('assignments')} className={`inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-1 text-sm font-semibold ${activeView === 'assignments' && !selectedClass ? 'border-univ-blue text-univ-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <ClipboardList className="h-4 w-4" /> Assignments
          </button>
          <button type="button" onClick={() => changeView('schedule')} className={`inline-flex h-11 items-center gap-2 border-b-2 px-1 text-sm font-semibold ${activeView === 'schedule' && !selectedClass ? 'border-univ-blue text-univ-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <CalendarDays className="h-4 w-4" /> Schedule
          </button>
          <button type="button" onClick={() => changeView('notifications')} className={`inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-1 text-sm font-semibold ${activeView === 'notifications' && !selectedClass ? 'border-univ-blue text-univ-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Bell className="h-4 w-4" /> Notifications{unreadCount > 0 ? ` (${unreadCount > 99 ? '99+' : unreadCount})` : ''}
          </button>
        </nav>
      </div>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-7">
            <div className="mx-auto max-w-6xl space-y-6">
              {selectedClass ? (
                <LmsClassView offering={selectedClass} role={user.role} token={token} initialTab={selectedClassTab} onBack={() => { setSelectedClass(null); setSelectedClassTab('overview'); loadClasses(); loadNotifications(); }} />
              ) : activeView === 'dashboard' ? (
                <LmsDashboard role={user.role} token={token} onOpenClass={openClass} onViewAssignments={() => changeView('assignments')} />
              ) : activeView === 'notifications' ? (
                <LmsNotifications
                  notifications={notifications}
                  unreadCount={unreadCount}
                  isLoading={notificationsLoading}
                  error={notificationsError}
                  onReload={loadNotifications}
                  onMarkRead={markNotificationRead}
                  onMarkAllRead={markAllNotificationsRead}
                  onLoadMore={loadMoreNotifications}
                  hasMore={notificationPagination.page < notificationPagination.pages}
                  isLoadingMore={notificationsLoadingMore}
                  onOpenClass={openClass}
                />
              ) : activeView === 'schedule' ? (
                <LmsSchedule classes={classes} token={token} onOpenClass={openClass} />
              ) : activeView === 'assignments' ? (
                <LmsAllAssignments role={user.role} token={token} onOpenClass={openClass} />
              ) : (
                <>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{user.role === 'admin' ? 'Course access' : 'My courses'}</h1>
                      <p className="mt-1 text-sm text-slate-600">{user.role === 'admin' ? 'Control which active course offerings can use LMS features.' : 'Open a course to read announcements and access learning materials.'}</p>
                    </div>
                    <button type="button" onClick={loadClasses} className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      <RefreshCw className="h-3.5 w-3.5" /> Refresh
                    </button>
                  </div>

                  {isLoading ? (
                    <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading LMS classes...</div>
                  ) : error ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>
                  ) : groupedClasses.length === 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
                      <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-3 text-sm font-semibold text-slate-700">No classes available</p>
                      <p className="mt-1 text-xs text-slate-500">Classes appear after official enrollment or instructor assignment.</p>
                    </div>
                  ) : user.role === 'admin' ? (
                    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <div className="border-b border-slate-200 px-5 py-4">
                        <h2 className="text-sm font-semibold text-slate-900">Active course offerings</h2>
                        <p className="mt-0.5 text-xs text-slate-500">{classes.length} offerings in active status</p>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {classes.map((offering) => (
                          <article key={offering._id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-bold text-univ-blue">{offering.subjectCode}</span>
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
    </div>
    </div>
  );
}
