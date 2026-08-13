import React, { useState } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import RegistrarSidebar from './RegistrarSidebar';
import RegistrarDashboard from './RegistrarDashboard';
import EnrollmentValidation from './EnrollmentValidation';
import GradeReviewQueue from './GradeReviewQueue';
import PortalShell from '../../components/PortalShell';

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
      
      case 'export':
        return (
          <div className="p-8 flex flex-col items-center justify-center h-full">
            <h1 className="text-xl font-semibold text-univ-navy">Export records</h1>
            <p className="text-slate-500 font-medium mt-2">Export functionality is available from the Data Grid.</p>
            <button 
              onClick={() => handleTabChange('records')}
              className="mt-4 rounded-lg bg-univ-blue px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-blue-700 cursor-pointer"
            >
              Open data grid
            </button>
          </div>
        );

      case 'settings':
        return (
          <div className="p-8 flex flex-col items-center justify-center h-full">
            <h1 className="text-xl font-semibold text-univ-navy">Settings</h1>
            <p className="text-slate-500 font-medium mt-2">Registrar settings are currently managed by the System Admin.</p>
          </div>
        );

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
