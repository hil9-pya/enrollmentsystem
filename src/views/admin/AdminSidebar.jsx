import React from 'react';
import {
  BookOpen,
  LayoutDashboard,
  ListChecks,
  Settings,
  Trash2,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import StaffSidebar from '../../components/StaffSidebar';

const NAV_GROUPS = [
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
      { id: 'trash', label: 'Archived Students', icon: Trash2 },
    ],
  },
  {
    group: 'Administration',
    items: [
      { id: 'courses', label: 'Course Management', icon: BookOpen },
      { id: 'integrity', label: 'Data Integrity', icon: ListChecks },
      { id: 'staff', label: 'Staff Management', icon: UserCog },
    ],
  },
  {
    group: 'Settings',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

export default function AdminSidebar({ activeTab, onTabChange }) {
  return <StaffSidebar title="Admin portal" groups={NAV_GROUPS} activeTab={activeTab} onTabChange={onTabChange} />;
}
