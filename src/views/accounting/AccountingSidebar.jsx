import React from 'react';
import { LayoutDashboard, Receipt, CheckCircle, Clock, Settings, ListOrdered } from 'lucide-react';
import StaffSidebar from '../../components/StaffSidebar';

export default function AccountingSidebar({ activeTab, onTabChange, pendingCount, queueCount }) {
  const tabs = [
    {
      group: 'Dashboard',
      items: [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
      ],
    },
    {
      group: 'Financial Assessment',
      items: [
        { id: 'queue', label: 'Walk-in Queue', icon: ListOrdered, badge: queueCount },
        { id: 'pending', label: 'Pending Payments', icon: Clock, badge: pendingCount },
        { id: 'ledger', label: 'Payment Ledger', icon: Receipt },
        { id: 'paid', label: 'Confirmed Payments', icon: CheckCircle },
      ],
    },
    {
      group: 'Settings',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return <StaffSidebar title="Accounting office" groups={tabs} activeTab={activeTab} onTabChange={onTabChange} />;
}
