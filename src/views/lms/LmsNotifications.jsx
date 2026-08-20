import { Bell, BookOpen, Check, ClipboardCheck, FileText, Megaphone } from 'lucide-react';

const notificationIcons = {
  announcement: Megaphone,
  material: FileText,
  assignment: BookOpen,
  submission: ClipboardCheck,
  graded: Check,
  returned: ClipboardCheck,
};

function formatDate(value) {
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function LmsNotifications({ notifications, unreadCount, isLoading, error, token, onReload, onUnreadChange, onOpenClass }) {
  const markRead = async (notification) => {
    if (!notification.readAt) {
      const response = await fetch(`/api/lms/notifications/${notification._id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) onUnreadChange(Math.max(0, unreadCount - 1));
    }
    if (notification.offering) onOpenClass(notification.offering, notification.tab);
  };

  const markAllRead = async () => {
    const response = await fetch('/api/lms/notifications/read-all', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      onUnreadChange(0);
      onReload();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-600">Class updates, deadlines, submissions, and grading activity.</p>
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={markAllRead} className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            Mark all as read
          </button>
        )}
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Recent notifications</h2>
            <p className="mt-0.5 text-xs text-slate-500">{unreadCount} unread</p>
          </div>
          <button type="button" onClick={onReload} className="text-xs font-semibold text-univ-blue hover:text-blue-700">Refresh</button>
        </div>
        {isLoading ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">Loading notifications...</div>
        ) : error ? (
          <div className="m-4 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Bell className="mx-auto h-7 w-7 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">No notifications yet</p>
            <p className="mt-1 text-xs text-slate-500">New class activity appears here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notification) => {
              const Icon = notificationIcons[notification.type] || Bell;
              return (
                <button
                  key={notification._id}
                  type="button"
                  onClick={() => markRead(notification)}
                  className={`flex w-full gap-4 px-5 py-4 text-left hover:bg-slate-50 ${notification.readAt ? '' : 'bg-indigo-50/50'}`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${notification.readAt ? 'text-slate-400' : 'text-indigo-600'}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${notification.readAt ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>{notification.title}</span>
                    {notification.message && <span className="mt-1 block text-xs text-slate-600">{notification.message}</span>}
                    <span className="mt-1.5 block text-xs text-slate-400">{formatDate(notification.createdAt)}</span>
                  </span>
                  {!notification.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-600" aria-label="Unread" />}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
