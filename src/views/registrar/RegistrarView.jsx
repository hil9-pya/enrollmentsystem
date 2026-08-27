import React, { useState } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import RegistrarSidebar from './RegistrarSidebar';
import RegistrarDashboard from './RegistrarDashboard';
import EnrollmentValidation from './EnrollmentValidation';
import GradeReviewQueue from './GradeReviewQueue';
import TermClosingQueue from './TermClosingQueue';
import PortalShell from '../../components/PortalShell';
import StaffUnavailablePanel from '../../components/StaffUnavailablePanel';

export default function RegistrarView() {
  const { state } = useEnrollment();
  const { students } = state;

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  // Compute notification badges
  const pendingCount = students.filter(s => 
    s.status !== 'enrolled' && 
    (s.status === 'payment_confirmed' || s.paymentStatus === 'paid')
  ).length;

  function handleTabChange(tabId) {
    setActiveTab(tabId);
    setSelectedStudentId(null);
  }

  function handleViewDetails(studentId) {
    setSelectedStudentId(studentId);
  }

  const renderContent = () => {
    if (selectedStudentId) {
      return (
        <EnrollmentValidation 
          studentId={selectedStudentId} 
          onBack={() => setSelectedStudentId(null)} 
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <RegistrarDashboard students={students} initialFilter="all" showOverview={true} onViewDetails={handleViewDetails} onNavigate={handleTabChange} key="dashboard" />;
      
      case 'records':
        return <RegistrarDashboard students={students} initialFilter="all" showOverview={false} onViewDetails={handleViewDetails} onNavigate={handleTabChange} key="records" />;
      
      case 'pending':
        return <RegistrarDashboard students={students} initialFilter="pending" showOverview={false} onViewDetails={handleViewDetails} onNavigate={handleTabChange} key="pending" />;
      
      case 'enrolled':
        return <RegistrarDashboard students={students} initialFilter="enrolled" showOverview={false} onViewDetails={handleViewDetails} onNavigate={handleTabChange} key="enrolled" />;

      case 'grades':
        return <GradeReviewQueue />;

      case 'term-closing':
        return <TermClosingQueue onNavigate={handleTabChange} />;
      
      case 'export':
        return <StaffUnavailablePanel title="Export records" description="Export tools are available from the records table." action={(
            <button
              onClick={() => handleTabChange('records')}
              className="rounded-lg bg-univ-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 cursor-pointer"
            >
              Open records
            </button>
          )} />;

      case 'settings':
        return <StaffUnavailablePanel title="Registrar settings" description="System administrators manage registrar configuration." />;

      default:
        return <RegistrarDashboard students={students} initialFilter="all" showOverview={true} onViewDetails={handleViewDetails} onNavigate={handleTabChange} key="default" />;
    }
  };

  const sidebar = (
    <RegistrarSidebar
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        pendingCount={pendingCount}
    />
  );

  return (
    <PortalShell sidebar={sidebar} portalTitle="Registrar Portal">
      <main className="h-full min-w-0 overflow-hidden flex flex-col">
        {renderContent()}
      </main>
    </PortalShell>
  );
}
