import React from 'react';
import { LayoutDashboard, Users, FileText, Settings, FileWarning, FolderCheck } from 'lucide-react';
import StaffSidebar from '../../components/StaffSidebar';

export default function AdmissionSidebar({ activeTab, onTabChange, reviewCount }) {
  const tabs = [
    {
      group: 'Dashboard',
      items: [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
      ],
    },
    {
      group: 'Applications',
      items: [
        { id: 'verification', label: 'Applications for Review', icon: FileText, badge: reviewCount },
        { id: 'approved', label: 'Approved Applications', icon: FolderCheck },
        { id: 'rejected', label: 'Incomplete / Resubmission Required', icon: FileWarning },
      ],
    },
    {
      group: 'Applicant Management',
      items: [
        { id: 'management', label: 'All Applicants', icon: Users },
      ],
    },
    {
      group: 'Settings',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return <StaffSidebar title="Admission portal" groups={tabs} activeTab={activeTab} onTabChange={onTabChange} />;
}
