import React, { useState } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import AdviserSidebar from './AdviserSidebar';
import AdviserDashboard from './AdviserDashboard';
import AdvisingQueue from './AdvisingQueue';
import PortalShell from '../../components/PortalShell';

export default function AdviserView() {
  const { state } = useEnrollment();
  const { students } = state;

  const [activeTab, setActiveTab] = useState('dashboard');

  // Compute notification badges
  const pendingCount = students.filter(s => s.status === 'advising_pending').length;

  function handleTabChange(tabId) {
    setActiveTab(tabId);
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdviserDashboard students={students} onNavigate={handleTabChange} />;
      
      case 'pending':
        return <AdvisingQueue students={students} initialFilter="pending" onNavigate={handleTabChange} key="pending" />;
      
      case 'approved':
        return <AdvisingQueue students={students} initialFilter="approved" onNavigate={handleTabChange} key="approved" />;
      
      case 'rejected':
        return <AdvisingQueue students={students} initialFilter="rejected" onNavigate={handleTabChange} key="rejected" />;
      
      case 'settings':
        return (
          <div className="p-8 flex flex-col items-center justify-center h-full">
            <h1 className="text-xl font-extrabold text-univ-navy">Settings</h1>
            <p className="text-slate-500 font-medium mt-2">Adviser settings are currently managed by the System Admin.</p>
          </div>
        );

      default:
        return <AdviserDashboard students={students} onNavigate={handleTabChange} />;
    }
  };

  const sidebar = (
    <AdviserSidebar
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        pendingCount={pendingCount}
    />
  );

  return (
    <PortalShell sidebar={sidebar} portalTitle="Adviser Portal">
      <main className="h-full min-w-0 overflow-hidden flex flex-col">
        {renderContent()}
      </main>
    </PortalShell>
  );
}
