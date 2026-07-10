import React, { useState } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import RegistrarSidebar from './RegistrarSidebar';
import RegistrarDashboard from './RegistrarDashboard';
import ValidationQueue from './ValidationQueue';
import EnrollmentValidation from './EnrollmentValidation';

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
        return <RegistrarDashboard students={students} onNavigate={handleTabChange} />;
      
      case 'pending':
        return <ValidationQueue students={students} initialFilter="pending" onViewDetails={handleViewDetails} key="pending" />;
      
      case 'enrolled':
        return <ValidationQueue students={students} initialFilter="enrolled" onViewDetails={handleViewDetails} key="enrolled" />;
      
      case 'records':
        return <ValidationQueue students={students} initialFilter="all" onViewDetails={handleViewDetails} key="records" />;
      
      case 'export':
        return (
          <div className="p-8 flex flex-col items-center justify-center h-full">
            <h1 className="text-xl font-extrabold text-univ-navy">Export Records</h1>
            <p className="text-slate-500 font-medium mt-2">Export functionality is available from the Validation Queue views.</p>
            <button 
              onClick={() => handleTabChange('records')}
              className="mt-4 px-4 py-2 bg-univ-blue text-white font-bold rounded-lg"
            >
              Go to Student Records
            </button>
          </div>
        );

      case 'settings':
        return (
          <div className="p-8 flex flex-col items-center justify-center h-full">
            <h1 className="text-xl font-extrabold text-univ-navy">Settings</h1>
            <p className="text-slate-500 font-medium mt-2">Registrar settings are currently managed by the System Admin.</p>
          </div>
        );

      default:
        return <RegistrarDashboard students={students} onNavigate={handleTabChange} />;
    }
  };

  return (
    <div className="flex h-full bg-[#f4f6fb]">
      <RegistrarSidebar 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        pendingCount={pendingCount}
      />
      
      <main className="flex-1 overflow-hidden flex flex-col">
        {renderContent()}
      </main>
    </div>
  );
}
