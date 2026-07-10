import React, { useState } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import AccountingSidebar from './AccountingSidebar';
import AccountingDashboard from './AccountingDashboard';
import PaymentLedger from './PaymentLedger';
import PaymentVerification from './PaymentVerification';

export default function AccountingView() {
  const { state } = useEnrollment();
  const { students } = state;

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  // Compute notification badges
  const pendingCount = students.filter(s => s.status === 'payment_pending' && s.paymentStatus !== 'paid').length;

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
        <PaymentVerification 
          studentId={selectedStudentId} 
          onBack={() => setSelectedStudentId(null)} 
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <AccountingDashboard students={students} onNavigate={handleTabChange} />;
      
      case 'pending':
        return <PaymentLedger students={students} initialFilter="pending" onViewDetails={handleViewDetails} key="pending" />;
      
      case 'ledger':
        return <PaymentLedger students={students} initialFilter="all" onViewDetails={handleViewDetails} key="ledger" />;
      
      case 'paid':
        return <PaymentLedger students={students} initialFilter="paid" onViewDetails={handleViewDetails} key="paid" />;
      
      case 'settings':
        return (
          <div className="p-8 flex flex-col items-center justify-center h-full">
            <h1 className="text-xl font-extrabold text-univ-navy">Settings</h1>
            <p className="text-slate-500 font-medium mt-2">Accounting settings are currently managed by the System Admin.</p>
          </div>
        );

      default:
        return <AccountingDashboard students={students} onNavigate={handleTabChange} />;
    }
  };

  return (
    <div className="flex h-full bg-[#f4f6fb]">
      <AccountingSidebar 
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
