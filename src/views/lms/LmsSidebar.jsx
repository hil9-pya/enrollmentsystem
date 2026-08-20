import { Bell, BookOpen, CalendarDays, ClipboardList, LayoutDashboard, Settings2 } from 'lucide-react';

export default function LmsSidebar({ role, activeView, onChange, unreadCount = 0 }) {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'classes', label: role === 'admin' ? 'Course access' : 'My courses', icon: role === 'admin' ? Settings2 : BookOpen },
    { id: 'assignments', label: 'Assignments', icon: ClipboardList },
    { id: 'schedule', label: 'Schedule', icon: CalendarDays },
    { id: 'notifications', label: 'Notifications', icon: Bell, count: unreadCount },
  ];

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-[#0c2a52] text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3"><img src="/logo.png" alt="NCST Logo" className="h-10 w-10 object-contain" /><div><p className="text-base font-bold">NCST LMS</p><p className="mt-0.5 text-xs text-blue-100/70">Learning workspace</p></div></div>
      </div>
      <nav className="flex-1 px-3 py-5" aria-label="LMS sections">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeView;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onChange(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors ${active ? 'bg-white/12 text-white' : 'text-blue-100/80 hover:bg-white/8 hover:text-white'}`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-[#f5c542]' : 'text-blue-100/60'}`} />
                  <span className="flex-1">{item.label}</span>
                  {item.count > 0 && <span className="min-w-5 rounded-md bg-white/12 px-1.5 py-0.5 text-center text-[11px] font-semibold text-white">{item.count > 99 ? '99+' : item.count}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-white/10 px-5 py-4 text-xs text-blue-100/60">
        {role === 'admin' ? 'Administrator access' : `${role.charAt(0).toUpperCase()}${role.slice(1)} access`}
      </div>
    </aside>
  );
}
