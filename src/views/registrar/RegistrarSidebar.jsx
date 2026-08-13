import React from 'react';
import { LayoutDashboard, ShieldCheck, CheckCircle, Users, Settings, Download } from 'lucide-react';
import StaffSidebar from '../../components/StaffSidebar';

export default function RegistrarSidebar({ activeTab, onTabChange, pendingCount }) {
  const tabs = [
    {
      group: 'Dashboard',
      items: [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
      ],
    },
    {
      group: 'Enrollment Validation',
      items: [
        { id: 'pending', label: 'Pending Validation', icon: ShieldCheck, badge: pendingCount },
        { id: 'enrolled', label: 'Officially Enrolled', icon: CheckCircle },
      ],
    },
    {
      group: 'Records & Reports',
      items: [
        { id: 'records', label: 'Student Records', icon: Users },
        { id: 'export', label: 'Export Data', icon: Download },
      ],
    },
    {
      group: 'Settings',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return <StaffSidebar title="Office of the Registrar" groups={tabs} activeTab={activeTab} onTabChange={onTabChange} />;
}
