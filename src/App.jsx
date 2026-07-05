import { useState } from 'react';
import { EnrollmentProvider, useEnrollment } from './context/EnrollmentContext';
import { AuthProvider, useAuth } from './context/AuthContext';
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
  const [viewMode, setViewMode] = useState(null); // 'student' | 'admin' | null

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
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="NCST Logo" className="w-8 h-8 object-contain" />
            <span className="font-semibold text-slate-800">NCST Student Portal</span>
          </div>
          <button onClick={() => setViewMode(null)} className="text-sm font-medium text-slate-500 hover:text-slate-700">Back to Home</button>
        </div>
        <main className="flex-1 overflow-hidden">
          <StudentView />
        </main>
      </div>
    );
  }

  // 2. If user is logged in as an admin staff
  if (user) {
    const ActiveView = viewMap[user.role] || AdmissionView;
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-slate-900 px-4 py-3 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="NCST Logo" className="w-8 h-8 object-contain" />
            <div>
              <div className="font-semibold leading-none">NCST Admin Portal</div>
              <div className="text-xs text-slate-400 capitalize mt-1">{user.role} Role</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">{user.email}</span>
            <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />
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

  // 3. If admin mode selected but not logged in
  if (viewMode === 'admin') {
    return (
      <div className="relative">
        <button onClick={() => setViewMode(null)} className="absolute top-6 left-6 text-sm font-medium text-slate-500 hover:text-slate-700 z-10">← Back</button>
        <LoginView />
      </div>
    );
  }

  // 4. Landing Page
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-10 flex flex-col items-center">
        <img src="/logo.png" alt="NCST Logo" className="h-32 w-auto mb-6 drop-shadow-sm" />
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">National College of Science and Technology</h1>
        <p className="text-slate-500 font-medium">College Student Enrollment System</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        <button 
          onClick={() => setViewMode('student')}
          className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-600 hover:shadow-md transition-all group text-left cursor-pointer"
        >
          <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
            <GraduationCap className="w-7 h-7 text-indigo-600 group-hover:text-white transition-colors" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Student Portal</h2>
          <p className="text-sm text-slate-500">Register as a new student, upload documents, and track your enrollment status.</p>
        </button>

        <button 
          onClick={() => setViewMode('admin')}
          className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-600 hover:shadow-md transition-all group text-left cursor-pointer"
        >
          <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
            <Briefcase className="w-7 h-7 text-slate-600 group-hover:text-white transition-colors" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Admin Portal</h2>
          <p className="text-sm text-slate-500">Staff access for Admission, Advising, Accounting, and Registrar departments.</p>
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <EnrollmentProvider>
        <Toaster position="top-right" />
        <AppContent />
      </EnrollmentProvider>
    </AuthProvider>
  );
}
