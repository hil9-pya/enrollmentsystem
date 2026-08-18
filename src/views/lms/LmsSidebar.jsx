import { BookOpen, Settings2 } from 'lucide-react';

export default function LmsSidebar({ role, activeView, onChange }) {
  const items = role === 'admin'
    ? [{ id: 'access', label: 'Course access', icon: Settings2 }]
    : [{ id: 'classes', label: 'My classes', icon: BookOpen }];

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-univ-navy">NCST LMS</h2>
        <p className="mt-0.5 text-xs text-slate-500">{role === 'admin' ? 'Administrator access' : `${role} access`}</p>
      </div>
      <nav className="flex-1 px-3 py-4" aria-label="LMS sections">
        <p className="mb-1.5 px-3 text-xs font-semibold text-slate-500">Learning</p>
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
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
