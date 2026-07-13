import { useState } from 'react';
import { EnrollmentProvider, useEnrollment } from './context/EnrollmentContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfirmationProvider } from './context/ConfirmationContext';

// Views
import LandingView from './views/public/LandingView';
import GatewayView from './views/public/GatewayView';
import ApplicantView from './views/applicant/ApplicantView';
import StudentView from './views/student/StudentView';
import AdmissionView from './views/admission/AdmissionView';
import AdviserView from './views/adviser/AdviserView';
import AccountingView from './views/accounting/AccountingView';
import RegistrarView from './views/registrar/RegistrarView';
import DashboardView from './views/admin/DashboardView';

import { LogOut } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

function AppContent() {
  const { user, logout, isLoading } = useAuth();
  const { state: { activeStudentId } } = useEnrollment();
  const [isApplicantVerified, setIsApplicantVerified] = useState(false);
  
  // Custom routing state
  const [viewMode, setViewMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const portal = params.get('portal');
    if (portal === 'applicant' || portal === 'student' || portal === 'staff' || portal === 'admin') return portal;
    return 'landing'; // Default to landing page
  });

  const viewMap = {
    student: StudentView,
    admission: AdmissionView,
    adviser: AdviserView,
    accounting: AccountingView,
    registrar: RegistrarView,
    admin: DashboardView
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-univ-blue/30 border-t-univ-blue rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse">Loading system data...</p>
      </div>
    );
  }

  // 1. Applicant Portal View
  if ((viewMode === 'applicant' || isApplicantVerified) && activeStudentId) {
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-50">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="NCST Logo" className="w-9 h-9 object-contain" />
            <div>
              <span className="font-heading font-bold text-lg tracking-wide text-univ-navy">National College of Science &amp; Technology</span>
              <span className="hidden sm:inline-block ml-3 px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 rounded tracking-wider uppercase">Applicant Portal</span>
            </div>
          </div>
          <button 
            onClick={() => {
              window.history.pushState({}, '', '/');
              setViewMode('gateway');
              setIsApplicantVerified(false);
            }} 
            className="text-xs font-bold text-slate-500 hover:text-univ-navy hover:bg-slate-50 px-3.5 py-2 rounded-lg transition-all cursor-pointer"
          >
            Back to Gateway
          </button>
        </div>
        <main className="flex-1 overflow-hidden">
          <ApplicantView key={activeStudentId || 'anonymous-app'} />
        </main>
      </div>
    );
  }

  // 2. Student Portal View
  if (user?.role === 'student') {
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-50">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="NCST Logo" className="w-9 h-9 object-contain" />
            <div>
              <span className="font-heading font-bold text-lg tracking-wide text-univ-navy">National College of Science &amp; Technology</span>
              <span className="hidden sm:inline-block ml-3 px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 rounded tracking-wider uppercase">Student Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline-block text-xs text-slate-500 font-medium">{user.email}</span>
            <button onClick={() => { logout(); setViewMode('gateway'); }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold hover:bg-slate-50 rounded-lg transition-all cursor-pointer text-slate-500 hover:text-rose-600">
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
        <main className="flex-1 overflow-hidden">
          <StudentView key={user._id} />
        </main>
      </div>
    );
  }

  // 3. Staff/Admin Portal View
  if (user && user.role !== 'student') {
    const ActiveView = viewMap[user.role] || AdmissionView;
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-50">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="NCST Logo" className="w-9 h-9 object-contain" />
            <div>
              <div className="font-heading font-bold text-lg leading-tight tracking-wide text-univ-navy">NCST Enrollment Management System</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline-block text-xs text-slate-500 font-medium">{user.email}</span>
            <button onClick={() => { logout(); setViewMode('gateway'); }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold hover:bg-slate-50 rounded-lg transition-all cursor-pointer text-slate-500 hover:text-rose-600">
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
        <main className="flex-1 overflow-hidden">
          <ActiveView />
        </main>
      </div>
    );
  }

  // 4. Gateway (Login / Access Panel)
  if (viewMode === 'gateway') {
    return (
      <GatewayView 
        onVerified={() => {
          setIsApplicantVerified(true);
          setViewMode('applicant');
        }} 
        onBack={() => setViewMode('landing')}
      />
    );
  }

  // 5. Default Public Landing Page
  return <LandingView onNavigate={(view) => setViewMode(view)} />;
}

export default function App() {
  return (
    <AuthProvider>
      <EnrollmentProvider>
        <ConfirmationProvider>
          <Toaster position="top-right" />
          <AppContent />
        </ConfirmationProvider>
      </EnrollmentProvider>
    </AuthProvider>
  );
}
