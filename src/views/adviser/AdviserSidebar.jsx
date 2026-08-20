import React from 'react';
import { LayoutDashboard, CheckCircle, AlertTriangle, Settings, BookOpen } from 'lucide-react';
import StaffSidebar from '../../components/StaffSidebar';

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

  return <StaffSidebar title="Adviser portal" groups={tabs} activeTab={activeTab} onTabChange={onTabChange} />;
}
