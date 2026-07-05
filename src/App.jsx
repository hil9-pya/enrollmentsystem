import { useState } from 'react';
import { EnrollmentProvider, useEnrollment } from './context/EnrollmentContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfirmationProvider } from './context/ConfirmationContext';
import LoginView from './views/auth/LoginView';
import StudentView from './views/student/StudentView';
import AdmissionView from './views/admission/AdmissionView';
import AdviserView from './views/adviser/AdviserView';
import AccountingView from './views/accounting/AccountingView';
import RegistrarView from './views/registrar/RegistrarView';
import DashboardView from './views/admin/DashboardView';
import { GraduationCap, Briefcase, LogOut } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

function AppContent() {
  const { user, logout, isLoading } = useAuth();
  const { activeStudentId } = useEnrollment();
  const [viewMode, setViewMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const portal = params.get('portal');
    if (portal === 'student') return 'student';
    if (portal === 'staff' || portal === 'admin') return portal;
    return null;
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
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse">Loading system data...</p>
      </div>
    );
  }

  // 1. If user explicitly chose student, show student view
  if (viewMode === 'student') {
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-univ-navy border-b-2 border-univ-gold px-6 py-4.5 flex justify-between items-center shadow-premium text-white">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="NCST Logo" className="w-9 h-9 object-contain" />
            <div>
              <span className="font-bold text-base tracking-wide text-white">National College of Science &amp; Technology</span>
              <span className="hidden sm:inline-block ml-3 px-2 py-0.5 text-[10px] font-bold bg-univ-gold text-univ-navy rounded tracking-wider uppercase">Student Portal</span>
            </div>
          </div>
          <button 
            onClick={() => {
              window.history.pushState({}, '', '/');
              setViewMode(null);
            }} 
            className="text-xs font-semibold bg-univ-navy-light hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            Back to Gateway
          </button>
        </div>
        <main className="flex-1 overflow-hidden">
          <StudentView key={activeStudentId || 'anonymous'} />
        </main>
      </div>
    );
  }

  // 2. If user is logged in as an admin staff
  if (user) {
    const ActiveView = viewMap[user.role] || AdmissionView;
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-univ-navy border-b border-univ-navy-light px-6 py-3.5 flex justify-between items-center text-white shadow-premium">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="NCST Logo" className="w-9 h-9 object-contain" />
            <div>
              <div className="font-bold text-sm leading-tight tracking-wide text-white">NCST Enrollment Management System</div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] text-slate-400 font-medium">Logged in:</span>
                <span className="px-2 py-0.5 text-[9px] font-bold bg-univ-gold/15 text-univ-gold border border-univ-gold/30 rounded uppercase tracking-wider">{user.role} Portal</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline-block text-xs text-slate-300 font-medium">{user.email}</span>
            <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-univ-navy-light hover:bg-slate-700 border border-slate-700 rounded-lg transition-all cursor-pointer text-slate-200">
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

  // 3. If admin or staff mode selected but not logged in
  if (viewMode === 'admin' || viewMode === 'staff') {
    return (
      <div className="relative min-h-screen bg-slate-50">
        <button 
          onClick={() => {
            window.history.pushState({}, '', '/');
            setViewMode(null);
          }} 
          className="absolute top-6 left-6 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 shadow-sm text-slate-600 px-3.5 py-1.5 rounded-lg transition-all z-10 cursor-pointer"
        >
          ← Back to Gateway
        </button>
        <LoginView portalType={viewMode} />
      </div>
    );
  }

  // 4. Landing Page
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Banner Navigation */}
      <header className="bg-univ-navy border-b-4 border-univ-gold text-white px-6 py-4 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="NCST Logo" className="h-10 w-auto object-contain" />
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-wider leading-none uppercase text-white">National College of Science and Technology</h1>
            <span className="text-[10px] text-univ-gold font-bold tracking-widest uppercase mt-1 block">Online Academic Services</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-300 font-medium">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          Enrollment Systems Operational
        </div>
      </header>

      {/* Hero Body */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-xl scale-125"></div>
            <img src="/logo.png" alt="NCST Crest" className="h-28 w-auto relative object-contain drop-shadow-md hover:scale-105 transition-transform duration-300" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-univ-navy mb-2 tracking-tight">Central Enrollment Gateway</h2>
          <p className="text-sm text-slate-500 max-w-md font-medium leading-relaxed">
            Welcome to the NCST Online Enrollment System. Please select your portal access option below to begin.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-12">
          {/* Student Access card */}
          <button 
            onClick={() => setViewMode('student')}
            className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-univ-indigo hover:-translate-y-1 hover:shadow-premium-lg shadow-premium transition-all duration-300 group text-left cursor-pointer flex flex-col justify-between h-64"
          >
            <div>
              <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-univ-indigo transition-colors duration-300 shadow-sm">
                <GraduationCap className="w-7 h-7 text-univ-indigo group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-lg font-bold text-univ-navy mb-2 group-hover:text-univ-indigo transition-colors duration-300">Student Portal</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Register as a new student, upload admission requirements, choose your course program, and track your enrollment status.</p>
            </div>
            <span className="text-xs font-bold text-univ-indigo flex items-center gap-1 mt-4 group-hover:underline">
              Enter Student Portal →
            </span>
          </button>

          {/* Admin Access card */}
          <button 
            onClick={() => setViewMode('staff')}
            className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-univ-gold hover:-translate-y-1 hover:shadow-premium-lg shadow-premium transition-all duration-300 group text-left cursor-pointer flex flex-col justify-between h-64"
          >
            <div>
              <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-univ-gold transition-colors duration-300 shadow-sm">
                <Briefcase className="w-7 h-7 text-univ-gold group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-lg font-bold text-univ-navy mb-2 group-hover:text-univ-gold transition-colors duration-300">Staff Portal</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Authorized access for university staff roles including Admissions, Advising, Accounting, Registrar, and Administrators.</p>
            </div>
            <span className="text-xs font-bold text-univ-gold flex items-center gap-1 mt-4 group-hover:underline">
              Enter Staff Portal →
            </span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 px-6 text-center text-xs">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} National College of Science and Technology. All rights reserved.</p>
          <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
            <span className="text-slate-500 hover:text-slate-300 cursor-pointer">Privacy Policy</span>
            <span className="text-slate-500 hover:text-slate-300 cursor-pointer">Support Desk</span>
            <span className="text-slate-500 hover:text-slate-300 cursor-pointer">NCST Website</span>
          </div>
        </div>
      </footer>
    </div>
  );
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
