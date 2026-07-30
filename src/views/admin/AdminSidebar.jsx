import React from 'react';
import {
  BookOpen,
  LayoutDashboard,
  Settings,
  Trash2,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ALL_NAV_GROUPS = [
  {
    group: 'Dashboard',
    items: [
      { id: 'analytics', label: 'Overview', icon: LayoutDashboard },
    ],
  },
  {
    group: 'Records',
    items: [
      { id: 'applicants', label: 'Applicant Directory', icon: UserPlus },
      { id: 'students', label: 'Student Database', icon: Users },
      { id: 'trash', label: 'Archived Students', icon: Trash2, roles: ['admin'] },
    ],
  },
  {
    group: 'Administration',
    items: [
      { id: 'courses', label: 'Course Management', icon: BookOpen, roles: ['admin'] },
      { id: 'staff', label: 'Staff Management', icon: UserCog, roles: ['admin'] },
    ],
  },
  {
    group: 'Settings',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin'] },
    ],
  },
];

export default function AdminSidebar({ activeTab, onTabChange }) {
  const { user } = useAuth();
  const role = user?.role || 'guest';

  const navGroups = ALL_NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => !item.roles || item.roles.includes(role))
  })).filter(group => group.items.length > 0);

  return (
    <aside className="w-68 shrink-0 border-r border-slate-200 bg-white flex flex-col shadow-sm z-10">
      <div className="p-6 border-b border-slate-100 flex flex-col gap-2 bg-slate-50/50">
        <h2 className="text-xs font-extrabold text-univ-navy uppercase tracking-widest leading-relaxed">
          Admin Portal
        </h2>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Staff Access
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {navGroups.map((group) => (
          <div key={group.group} className="mb-6 px-4">
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
                      type="button"
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-univ-indigo/10 text-univ-indigo shadow-sm'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-univ-navy'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-univ-indigo' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
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
