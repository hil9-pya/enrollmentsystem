import { useState } from 'react';
import { EnrollmentProvider, useEnrollment } from './context/EnrollmentContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfirmationProvider } from './context/ConfirmationContext';
import LoginView from './views/auth/LoginView';
import ApplicantView from './views/applicant/ApplicantView';
import ApplicantPortalAccess from './views/applicant/ApplicantPortalAccess';
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
  const { state: { activeStudentId } } = useEnrollment();
  const [isApplicantVerified, setIsApplicantVerified] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const portal = params.get('portal');
    if (portal === 'applicant' || portal === 'student' || portal === 'staff' || portal === 'admin') return portal;
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

  // 1. If user explicitly chose applicant, show applicant portal
  if (viewMode === 'applicant' && activeStudentId && isApplicantVerified) {
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
              setViewMode(null);
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

  // 2. If user explicitly chose student, show student view BUT only if logged in as student
  if (viewMode === 'student' && user?.role === 'student') {
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
            <button onClick={() => { logout(); setViewMode(null); }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold hover:bg-slate-50 rounded-lg transition-all cursor-pointer text-slate-500 hover:text-rose-600">
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

  // 3. If user is logged in as an admin staff

  if (user) {
    const ActiveView = viewMap[user.role] || AdmissionView;
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-50">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="NCST Logo" className="w-9 h-9 object-contain" />
            <div>
              <div className="font-heading font-bold text-lg leading-tight tracking-wide text-univ-navy">NCST Enrollment Management System</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-slate-400 font-medium">Logged in:</span>
                <span className="px-2 py-0.5 text-[9px] font-bold bg-blue-50 text-univ-blue rounded uppercase tracking-wider">{user.role} Portal</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline-block text-xs text-slate-500 font-medium">{user.email}</span>
            <button onClick={logout} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold hover:bg-slate-50 rounded-lg transition-all cursor-pointer text-slate-500 hover:text-rose-600">
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

  // 4. Split-Screen Gateway (Landing & Login)
  return (
    <div className="flex h-screen w-full overflow-hidden font-sans bg-[#f4f6fb]">
      {/* Left side: Premium Image */}
      <div className="hidden lg:flex w-1/2 relative bg-univ-navy">
        <img 
          src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80" 
          alt="Campus" 
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-univ-navy-dark via-univ-navy/40 to-transparent"></div>
        <div className="absolute bottom-16 left-16 right-16 z-10 text-white">
          <div className="flex items-center gap-5 mb-8">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-xl">
               <img src="/logo.png" alt="NCST Logo" className="h-14 w-14 object-contain" />
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-4xl tracking-tight uppercase leading-tight text-white drop-shadow-md">National College of<br/>Science &amp; Technology</h1>
            </div>
          </div>
          <p className="text-slate-200 font-medium text-base max-w-lg leading-relaxed drop-shadow">
            Empowering the next generation of innovators and leaders. Access your centralized portal for enrollment, academics, and administration.
          </p>
        </div>
      </div>
      
      {/* Right side: Access Panel */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12 xl:p-24 relative bg-white">
        {/* Top bar for mobile only */}
        <div className="lg:hidden absolute top-8 left-8 flex items-center gap-3">
           <img src="/logo.png" alt="NCST Logo" className="h-10 w-10 object-contain" />
           <span className="font-heading font-bold text-univ-navy uppercase text-sm tracking-wider">NCST Gateway</span>
        </div>
        
        <div className="w-full max-w-md">
           <div className="mb-6 text-center lg:text-left">
             <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-univ-navy tracking-tight mb-3">Welcome Back</h2>
             <p className="text-slate-500 font-medium text-sm">Please select your portal access option below to begin.</p>
           </div>
           
           <div className="flex bg-slate-100 p-1.5 rounded-xl shadow-sm border border-slate-200/60 mb-6">
              {['applicant', 'student', 'staff'].map((role) => (
                <button 
                  key={role}
                  onClick={() => setViewMode(role)}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 outline-none focus:outline-none focus:ring-0 ${viewMode === role || (role === 'staff' && viewMode === 'admin') ? 'bg-white text-univ-blue shadow-sm border border-slate-200/50' : 'text-slate-500 hover:bg-slate-200/50 hover:text-univ-navy'}`}
                >
                  {role}
                </button>
              ))}
           </div>
           
           <div className="bg-white rounded-2xl shadow-premium border border-slate-100 p-2 h-[480px] flex flex-col outline-none focus:outline-none">
             {(viewMode === 'admin' || viewMode === 'staff' || viewMode === 'student') ? (
               <div className="flex-1 flex flex-col outline-none focus:outline-none p-6 sm:p-8 overflow-y-auto animate-in fade-in zoom-in-95 duration-500">
                  <LoginView portalType={viewMode} />
               </div>
             ) : viewMode === 'applicant' ? (
               <div className="flex-1 flex flex-col outline-none focus:outline-none p-6 sm:p-8 overflow-y-auto animate-in fade-in zoom-in-95 duration-500">
                  <ApplicantPortalAccess onVerified={() => setIsApplicantVerified(true)} />
               </div>
             ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-100 rounded-xl m-2 bg-slate-50/50">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Briefcase className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500 font-medium">Select a portal above.</p>
                </div>
             )}
           </div>
           
           {/* Footer right side */}
           <div className="mt-8 text-center flex flex-col items-center gap-4">
             <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
               <span className="hover:text-univ-blue cursor-pointer transition-colors">Privacy</span>
               <span className="hover:text-univ-blue cursor-pointer transition-colors">Support</span>
               <span className="hover:text-univ-blue cursor-pointer transition-colors">Website</span>
             </div>
           </div>
        </div>
      </div>
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
