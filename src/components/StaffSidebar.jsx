import React from 'react';

export default function StaffSidebar({ title, groups, activeTab, onTabChange }) {
  return (
    <aside className="z-10 flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-univ-navy">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">Staff access</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={`${title} sections`}>
        {groups.map((group) => (
          <section key={group.group} className="mb-5 last:mb-0">
            <h3 className="mb-1.5 px-3 text-xs font-semibold text-slate-500">{group.group}</h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const hasBadge = Number(item.badge) > 0;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onTabChange(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-univ-blue/10 text-univ-blue'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-univ-navy'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-univ-blue' : 'text-slate-400'}`} aria-hidden="true" />
                        <span>{item.label}</span>
                      </span>
                      {hasBadge && (
                        <span
                          className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                            isActive ? 'bg-univ-blue text-white' : 'bg-amber-50 text-amber-700'
                          }`}
                          aria-label={`${item.badge} items`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>
    </aside>
  );
}
