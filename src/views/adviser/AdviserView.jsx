import React, { useState } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import AdviserSidebar from './AdviserSidebar';
import AdviserDashboard from './AdviserDashboard';
import AdvisingQueue from './AdvisingQueue';
import PortalShell from '../../components/PortalShell';
import StaffUnavailablePanel from '../../components/StaffUnavailablePanel';

export default function AdviserView() {
  const { state } = useEnrollment();
  const { students } = state;

  const [activeTab, setActiveTab] = useState('dashboard');

  // Compute notification badges
  const pendingCount = students.filter(s =>
    s.status === 'advising_pending' &&
    (s.enrollmentType !== 'new' || !!s.subjectChangeRequest)
  ).length;

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
        return <StaffUnavailablePanel title="Adviser settings" description="System administrators manage adviser configuration." />;

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
