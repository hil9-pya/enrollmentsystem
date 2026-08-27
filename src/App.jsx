import { useEffect, useState } from 'react';
import { EnrollmentProvider, useEnrollment } from './context/EnrollmentContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfirmationProvider, useConfirm } from './context/ConfirmationContext';

// Views
import LandingView from './views/public/LandingView';
import GatewayView from './views/public/GatewayView';
import NotFoundView from './views/public/NotFoundView';
import ApplicantView from './views/applicant/ApplicantView';
import StudentView from './views/student/StudentView';
import AdmissionView from './views/admission/AdmissionView';
import AdviserView from './views/adviser/AdviserView';
import AccountingView from './views/accounting/AccountingView';
import RegistrarView from './views/registrar/RegistrarView';
import DashboardView from './views/admin/DashboardView';
import InstructorView from './views/instructor/InstructorView';
import PaymongoCheckoutView from './views/public/PaymongoCheckoutView';
import PaymentSuccessView from './views/public/PaymentSuccessView';
import LmsLoginView from './views/lms/LmsLoginView';
import LmsView from './views/lms/LmsView';

import { LogOut } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { clearApplicantAccess } from './utils/authFetch.js';

const STAFF_VIEWS = new Set([
  'staff',
  'admin',
  'admission',
  'adviser',
  'accounting',
  'registrar',
  'instructor',
]);

const PORTAL_VIEWS = new Set([
  'gateway',
  'applicant',
  'student',
  'lms',
  'paymongo-checkout',
  'payment-success',
  ...STAFF_VIEWS,
]);

function readPortalFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const portal = params.get('portal');
  // If no portal param, show landing
  if (!portal) return 'landing';
  // If portal param exists but is invalid, show 404
  if (!PORTAL_VIEWS.has(portal)) return '404';
  return portal;
}

function buildPortalUrl(view, tab) {
  if (view === 'landing') return '/';
  if (view === '404') return '/';
  const params = new URLSearchParams({ portal: view });
  if (tab) params.set('tab', tab);
  return `/?${params.toString()}`;
}

// Page title map per view mode
const PAGE_TITLES = {
  landing: 'NCST — National College of Science & Technology',
  gateway: 'Sign In — NCST Gateway',
  applicant: 'Applicant Portal — NCST',
  student: 'Student Portal — NCST',
  staff: 'Staff Portal — NCST',
  admin: 'Admin Dashboard — NCST',
  admission: 'Admissions Portal — NCST',
  adviser: 'Adviser Portal — NCST',
  accounting: 'Accounting Portal — NCST',
  registrar: 'Registrar Portal — NCST',
  instructor: 'Instructor Portal — NCST',
  lms: 'Learning Management System — NCST',
  'paymongo-checkout': 'Checkout — NCST',
  'payment-success': 'Payment Confirmed — NCST',
  '404': 'Page Not Found — NCST',
};

function AppContent() {
  const { user, logout, isLoading } = useAuth();
  const { confirm } = useConfirm();
  const { state: { activeStudentId } } = useEnrollment();
  const [isApplicantVerified, setIsApplicantVerified] = useState(false);
  
  const [viewMode, setViewMode] = useState(readPortalFromUrl);
  const gatewayTab = new URLSearchParams(window.location.search).get('tab') || 'applicant';

  // Dynamic page title on view change
  useEffect(() => {
    const role = user?.role;
    let title = PAGE_TITLES[viewMode] || PAGE_TITLES.landing;
    // Personalise staff title to their actual role
    if (user && role !== 'student' && !['landing', 'gateway', '404'].includes(viewMode)) {
      const roleName = role === 'admin' ? 'Admin' : 
                       role === 'admission' ? 'Admissions' :
                       role === 'adviser' ? 'Adviser' :
                       role === 'accounting' ? 'Accounting' :
                       role === 'registrar' ? 'Registrar' :
                       role === 'instructor' ? 'Instructor' : 'Staff';
      title = `${roleName} Portal — NCST`;
    }
    document.title = title;
  }, [viewMode, user]);

  const navigateTo = (view, { tab, replace = false } = {}) => {
    const nextView = PORTAL_VIEWS.has(view) ? view : 'landing';
    const nextUrl = buildPortalUrl(nextView, tab);
    window.history[replace ? 'replaceState' : 'pushState']({}, '', nextUrl);
    setViewMode(nextView);
  };

  useEffect(() => {
    const handlePopState = () => {
      setIsApplicantVerified(false);
      setViewMode(readPortalFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLogout = async () => {
    const isConfirmed = await confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      animate: false,
      type: 'warning'
    });
    if (isConfirmed) {
      logout();
      navigateTo('gateway', { tab: user?.role === 'student' ? 'student' : 'staff' });
    }
  };

  const viewMap = {
    student: StudentView,
    admission: AdmissionView,
    adviser: AdviserView,
    accounting: AccountingView,
    registrar: RegistrarView,
    instructor: InstructorView,
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

  // 1. Unrecognized or explicit 404
  if (viewMode === '404') {
    return <NotFoundView onNavigate={navigateTo} />;
  }

  // 2. Dedicated Learning Management System
  if (viewMode === 'lms') {
    if (!user) {
      return (
        <LmsLoginView
          onBack={() => navigateTo('gateway')}
        />
      );
    }

    return (
      <LmsView
        onBack={() => {
          const destination = user.role === 'student' ? 'student' : user.role === 'admin' ? 'admin' : 'staff';
          navigateTo(destination);
        }}
        onSignOut={async () => {
          const isConfirmed = await confirm({
            title: 'Sign Out',
            message: 'Are you sure you want to sign out of NCST LMS?',
            confirmText: 'Sign Out',
            cancelText: 'Cancel',
            animate: false,
            type: 'warning'
          });
          if (isConfirmed) {
            logout();
            navigateTo('lms');
          }
        }}
      />
    );
  }

  // 3. PayMongo Checkout & Success Views
  if (viewMode === 'paymongo-checkout') {
    return <PaymongoCheckoutView />;
  }

  if (viewMode === 'payment-success') {
    return <PaymentSuccessView />;
  }

  // 4. Gateway View (Login / Access Panel)
  if (viewMode === 'gateway') {
    return (
      <GatewayView 
        initialView={gatewayTab}
        onLogin={(signedInUser) => {
          const destination = signedInUser?.role === 'student'
            ? 'student'
            : signedInUser?.role === 'admin'
              ? 'admin'
              : 'staff';
          navigateTo(destination);
        }}
        onVerified={() => {
          setIsApplicantVerified(true);
          navigateTo('applicant');
        }} 
        onBack={() => navigateTo('landing')}
      />
    );
  }

  // 5. Applicant Portal View
  if (viewMode === 'applicant') {
    if (activeStudentId || isApplicantVerified) {
      return (
        <div className="h-screen flex flex-col">
          <div className="z-50 flex min-h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-md shadow-slate-900/5 px-4 sm:px-6">
            <button
              onClick={() => {
                navigateTo('gateway');
                setIsApplicantVerified(false);
                clearApplicantAccess();
              }}
              className="flex items-center gap-3 group cursor-pointer"
              aria-label="Back to Gateway"
            >
              <img src="/logo.png" alt="NCST Logo" className="w-9 h-9 object-contain" />
              <div>
                <span className="sm:hidden font-heading font-bold text-sm tracking-wide text-univ-navy group-hover:text-univ-blue transition-colors">NCST Applicant Portal</span>
                <span className="hidden sm:inline font-heading font-bold text-lg tracking-wide text-univ-navy group-hover:text-univ-blue transition-colors">National College of Science &amp; Technology</span>
                <span className="hidden sm:inline-block ml-3 px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 rounded tracking-wider uppercase">Applicant Portal</span>
              </div>
            </button>
            <button 
              onClick={() => {
                navigateTo('gateway');
                setIsApplicantVerified(false);
                clearApplicantAccess();
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
    // Accessing applicant portal without active student ID or verification -> 404
    return <NotFoundView onNavigate={navigateTo} />;
  }

  // 6. Student Portal View
  if (viewMode === 'student') {
    if (user?.role === 'student') {
      return (
        <div className="h-screen flex flex-col">
          <div className="z-50 flex min-h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-md shadow-slate-900/5 px-4 sm:px-6">
            <button
              onClick={() => navigateTo('student')}
              className="flex min-w-0 items-center gap-3 group cursor-pointer"
              aria-label="NCST Student Portal Home"
            >
              <img src="/logo.png" alt="NCST Logo" className="w-9 h-9 object-contain" />
              <div className="min-w-0">
                <span className="font-heading text-sm font-bold tracking-wide text-univ-navy lg:hidden group-hover:text-univ-blue transition-colors">NCST Student Portal</span>
                <span className="hidden truncate font-heading text-lg font-bold tracking-wide text-univ-navy lg:inline group-hover:text-univ-blue transition-colors">National College of Science &amp; Technology</span>
                <span className="ml-3 hidden rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 xl:inline-block">Student Portal</span>
              </div>
            </button>
            <div className="flex shrink-0 items-center gap-4">
              <span className="hidden md:inline-block text-xs text-slate-500 font-medium">{user.email}</span>
              <button onClick={handleLogout} className="flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-bold hover:bg-slate-50 rounded-lg transition-all cursor-pointer text-slate-500 hover:text-rose-600">
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
    // Accessing student portal without student credentials -> 404
    return <NotFoundView onNavigate={navigateTo} />;
  }

  // 7. Staff/Admin Portal Views
  if (STAFF_VIEWS.has(viewMode)) {
    if (user && user.role !== 'student') {
      // Role permission check:
      // - admin role can view any staff view ('admin', 'staff', 'admission', 'adviser', 'accounting', 'registrar', 'instructor')
      // - staff role can view generic 'staff' or their exact matching role (e.g. registrar can view 'staff' or 'registrar')
      const isAuthorized =
        user.role === 'admin' ||
        viewMode === 'staff' ||
        viewMode === user.role;

      if (!isAuthorized) {
        return <NotFoundView onNavigate={navigateTo} />;
      }

      const ActiveView = viewMap[user.role] || AdmissionView;
      return (
        <div className="h-screen flex flex-col">
          <div className="z-50 flex min-h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-md shadow-slate-900/5 px-4 sm:px-6">
            <button
              onClick={() => navigateTo(user.role === 'admin' ? 'admin' : 'staff')}
              className="flex items-center gap-3 group cursor-pointer"
              aria-label="NCST Enrollment System Home"
            >
              <img src="/logo.png" alt="NCST Logo" className="w-9 h-9 object-contain" />
              <div>
                <div className="sm:hidden font-heading font-bold text-sm leading-tight tracking-wide text-univ-navy group-hover:text-univ-blue transition-colors">NCST Enrollment System</div>
                <div className="hidden sm:block font-heading font-bold text-lg leading-tight tracking-wide text-univ-navy group-hover:text-univ-blue transition-colors">NCST Enrollment Management System</div>
              </div>
            </button>
            <div className="flex items-center gap-4">
              <span className="hidden md:inline-block text-xs text-slate-500 font-medium">{user.email}</span>
              <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold hover:bg-slate-50 rounded-lg transition-all cursor-pointer text-slate-500 hover:text-rose-600">
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
    // Accessing any staff/admin portal without staff credentials -> 404
    return <NotFoundView onNavigate={navigateTo} />;
  }

  // 8. Public Landing Page
  if (viewMode === 'landing') {
    return <LandingView onNavigate={navigateTo} />;
  }

  // Fallback for any unknown state -> 404
  return <NotFoundView onNavigate={navigateTo} />;
}

export default function App() {
  return (
    <AuthProvider>
      <EnrollmentProvider>
        <ConfirmationProvider>
          <Toaster
            position="bottom-right"
            gutter={8}
            containerStyle={{ bottom: 20, right: 20 }}
          />
          <AppContent />
        </ConfirmationProvider>
      </EnrollmentProvider>
    </AuthProvider>
  );
}
