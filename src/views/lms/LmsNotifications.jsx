import { Bell } from 'lucide-react';

function formatDate(value) {
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function groupLabel(value) {
  const date = new Date(value);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.floor((startToday - startDate) / 86400000);
  if (daysAgo <= 0) return 'Today';
  if (daysAgo < 7) return 'This week';
  return 'Earlier';
}

export default function LmsNotifications({ notifications, unreadCount, isLoading, error, onReload, onMarkRead, onMarkAllRead, onLoadMore, hasMore, isLoadingMore, onOpenClass }) {
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const label = groupLabel(notification.createdAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(notification);
    return groups;
  }, {});
  const markRead = async (notification) => {
    await onMarkRead(notification);
    if (notification.offering) onOpenClass(notification.offering, notification.tab);
  };

  const markAllRead = async () => {
    await onMarkAllRead();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-600">Class updates, deadlines, submissions, and grading activity.</p>
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={markAllRead} className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Mark all as read
          </button>
        )}
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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
          <>
          <div>
            {['Today', 'This week', 'Earlier'].map((label) => groupedNotifications[label]?.length > 0 && (
              <section key={label} aria-labelledby={`notifications-${label.replace(' ', '-').toLowerCase()}`}>
                <h3 id={`notifications-${label.replace(' ', '-').toLowerCase()}`} className="border-b border-slate-100 bg-slate-50 px-5 py-2 text-xs font-semibold text-slate-600">{label}</h3>
                <div className="divide-y divide-slate-100">
                  {groupedNotifications[label].map((notification) => (
                    <button
                      key={notification._id}
                      type="button"
                      onClick={() => markRead(notification)}
                      className={`flex w-full items-start justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50 ${notification.readAt ? '' : 'bg-blue-50/60'}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${notification.readAt ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>{notification.title}</span>
                        {notification.message && <span className="mt-1 block text-xs text-slate-600">{notification.message}</span>}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">{formatDate(notification.createdAt)}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
          {hasMore && <div className="border-t border-slate-200 p-3 text-center"><button type="button" onClick={onLoadMore} disabled={isLoadingMore} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{isLoadingMore ? 'Loading...' : 'Load older notifications'}</button></div>}
          </>
        )}
      </section>
    </div>
  );
}
