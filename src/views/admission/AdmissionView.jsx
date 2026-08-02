import React, { useState, useMemo } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import AdmissionSidebar from './AdmissionSidebar';
import DashboardOverview from './DashboardOverview';
import ApplicantManagement from './ApplicantManagement';
import ApplicantDetails from './ApplicantDetails';
import PortalShell from '../../components/PortalShell';

export default function AdmissionView() {
  const { state } = useEnrollment();
  const { students } = state;

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  // Compute notification badges
  const validStudents = useMemo(
    () => students.filter((student) => student.status !== 'registration' && (student.firstName?.trim() || student.lastName?.trim())),
    [students],
  );

  const reviewCount = validStudents.filter(s => s.status === 'documents_submitted').length;

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
        <ApplicantDetails 
          studentId={selectedStudentId} 
          onBack={() => setSelectedStudentId(null)} 
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
      case 'reports':
        return <DashboardOverview students={validStudents} onNavigate={handleTabChange} />;
      
      case 'approved':
        return <ApplicantManagement students={validStudents} initialFilter="approved" onViewDetails={handleViewDetails} onNavigate={handleTabChange} key="approved" />;
      
      case 'rejected':
        return <ApplicantManagement students={validStudents} initialFilter="rejected" onViewDetails={handleViewDetails} onNavigate={handleTabChange} key="rejected" />;
      
      case 'management':
        return <ApplicantManagement students={validStudents} initialFilter="" onViewDetails={handleViewDetails} onNavigate={handleTabChange} key="management" />;
      
      case 'verification':
        return <ApplicantManagement students={validStudents} initialFilter="documents_submitted" onViewDetails={handleViewDetails} onNavigate={handleTabChange} key="verification" />;
      
      case 'settings':
        return (
          <div className="p-8 flex flex-col items-center justify-center h-full">
            <h1 className="text-xl font-extrabold text-univ-navy">Settings</h1>
            <p className="text-slate-500 font-medium mt-2">Admission settings are currently managed by the System Admin.</p>
          </div>
        );

      default:
        return <DashboardOverview students={validStudents} onNavigate={handleTabChange} />;
    }
  };

  const sidebar = (
    <AdmissionSidebar
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        reviewCount={reviewCount}
    />
  );

  return (
    <PortalShell sidebar={sidebar} portalTitle="Admission Portal">
      <main className="h-full min-w-0 overflow-hidden flex flex-col">
        {renderContent()}
      </main>
    </PortalShell>
  );
}
