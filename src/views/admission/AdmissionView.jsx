import React, { useState, useMemo } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import AdmissionSidebar from './AdmissionSidebar';
import DashboardOverview from './DashboardOverview';
import ApplicantManagement from './ApplicantManagement';
import ApplicantDetails from './ApplicantDetails';

export default function AdmissionView() {
  const { state } = useEnrollment();
  const { students } = state;

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  // Compute notification badges
  const validStudents = useMemo(() => students.filter(s => s.firstName?.trim() || s.lastName?.trim()), [students]);

  const pendingCount = validStudents.filter(s => s.status === 'registration').length;
  const incompleteCount = validStudents.filter(s => s.status === 'documents_submitted').length; // Waiting for verification

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
      
      case 'pending':
        return <ApplicantManagement students={validStudents} initialFilter="pending" onViewDetails={handleViewDetails} onNavigate={handleTabChange} key="pending" />;
      
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

  return (
    <div className="flex h-full bg-[#f4f6fb]">
      <AdmissionSidebar 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        pendingCount={pendingCount}
        incompleteCount={incompleteCount}
      />
      
      <main className="flex-1 overflow-hidden flex flex-col">
        {renderContent()}
      </main>
    </div>
  );
}
