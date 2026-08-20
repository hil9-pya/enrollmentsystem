import React, { useState } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import AccountingSidebar from './AccountingSidebar';
import AccountingDashboard from './AccountingDashboard';
import PaymentVerification from './PaymentVerification';
import WalkInPaymentQueue from './WalkInPaymentQueue';
import PortalShell from '../../components/PortalShell';
import StaffUnavailablePanel from '../../components/StaffUnavailablePanel';

function manilaDateKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default function AccountingView() {
  const { state } = useEnrollment();
  const { students } = state;

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  // Compute notification badges
  const pendingCount = students.filter(s => s.status === 'payment_pending' && s.paymentStatus !== 'paid').length;
  const queueCount = students.filter(s => (
    s.walkInQueue?.queueDate === manilaDateKey()
    && ['waiting', 'called', 'serving', 'skipped'].includes(s.walkInQueue?.status)
  )).length;

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
        return <AccountingDashboard students={students} initialFilter="all" showOverview={true} onViewDetails={handleViewDetails} onNavigate={handleTabChange} key="dashboard" />;
      
      case 'ledger':
        return <AccountingDashboard students={students} initialFilter="all" showOverview={false} onViewDetails={handleViewDetails} onNavigate={handleTabChange} key="ledger" />;
      
      case 'pending':
        return <AccountingDashboard students={students} initialFilter="pending" showOverview={false} onViewDetails={handleViewDetails} onNavigate={handleTabChange} key="pending" />;

      case 'queue':
        return <WalkInPaymentQueue students={students} onViewDetails={handleViewDetails} />;
      
      case 'paid':
        return <AccountingDashboard students={students} initialFilter="paid" showOverview={false} onViewDetails={handleViewDetails} onNavigate={handleTabChange} key="paid" />;
      
      case 'settings':
        return <StaffUnavailablePanel title="Accounting settings" description="System administrators manage accounting configuration." />;

      default:
        return <AccountingDashboard students={students} initialFilter="all" showOverview={true} onViewDetails={handleViewDetails} onNavigate={handleTabChange} key="default" />;
    }
  };

  const sidebar = (
    <AccountingSidebar
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        pendingCount={pendingCount}
        queueCount={queueCount}
    />
  );

  return (
    <PortalShell sidebar={sidebar} portalTitle="Accounting Portal">
      <main className="h-full min-w-0 overflow-hidden flex flex-col">
        {renderContent()}
      </main>
    </PortalShell>
  );
}
