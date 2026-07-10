import React from 'react';
import { LayoutDashboard, GraduationCap, CheckCircle, AlertTriangle, Settings, BookOpen } from 'lucide-react';

export default function AdviserSidebar({ activeTab, onTabChange, pendingCount }) {
  const tabs = [
    {
      group: 'Dashboard',
      items: [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
      ],
    },
    {
      group: 'Academic Advising',
      items: [
        { id: 'pending', label: 'Pending Evaluation', icon: BookOpen, badge: pendingCount },
        { id: 'approved', label: 'Approved Students', icon: CheckCircle },
        { id: 'rejected', label: 'Returned for Revision', icon: AlertTriangle },
      ],
    },
    {
      group: 'Settings',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-68 shrink-0 border-r border-slate-200 bg-white flex flex-col shadow-sm z-10">
      <div className="p-6 border-b border-slate-100 flex flex-col gap-2 bg-slate-50/50">
        <h2 className="text-xs font-extrabold text-univ-navy uppercase tracking-widest leading-relaxed">
          Adviser Portal
        </h2>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Staff Access</span>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {tabs.map((group, index) => (
          <div key={index} className="mb-6 px-4">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 px-3">
              {group.group}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-univ-indigo/10 text-univ-indigo shadow-sm'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-univ-navy'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-univ-indigo' : 'text-slate-400'}`} />
                        {item.label}
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className={`px-2 py-0.5 text-[10px] rounded-full font-extrabold ${
                          isActive ? 'bg-univ-indigo text-white' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
