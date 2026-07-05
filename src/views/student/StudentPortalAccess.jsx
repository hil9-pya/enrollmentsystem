import React, { useState } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { UserCheck, FilePlus, ChevronRight, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function StudentPortalAccess({ onVerified }) {
  const { state, setActiveStudent } = useEnrollment();
  const { students } = state;

  const [mode, setMode] = useState('menu'); // 'menu' | 'resume' | 'new'
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameRegex = /^[A-Za-z][A-Za-z\s'.-]{1,49}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^09\d{2}[-\s]?\d{3}[-\s]?\d{4}$/;

  const handleResume = (e) => {
    e.preventDefault();
    setError('');
    
    if (!identifier.trim()) {
      setError('Please enter your Student ID or Email.');
      return;
    }

    const q = identifier.trim().toLowerCase();
    const matched = students.find(
      (s) => s.id.toLowerCase() === q || (s.email && s.email.toLowerCase() === q)
    );

    if (matched) {
      setActiveStudent(matched.id);
      toast.success(`Welcome back, ${matched.firstName || 'Student'}!`);
      onVerified();
    } else {
      setError('No matching student record found. If you are new, please start a new application.');
    }
  };

  const handleNewApplication = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!email.trim() || !firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError('Please fill in all fields.');
      setIsSubmitting(false);
      return;
    }

    if (!nameRegex.test(firstName.trim())) {
      setError('First name must contain letters only.');
      setIsSubmitting(false);
      return;
    }

    if (!nameRegex.test(lastName.trim())) {
      setError('Last name must contain letters only.');
      setIsSubmitting(false);
      return;
    }

    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      setIsSubmitting(false);
      return;
    }

    if (!phoneRegex.test(phone.trim())) {
      setError('Please enter a valid PH phone number (e.g., 0917-123-4567).');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/students/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email: email.trim(),
          phone: phone.trim(),
        }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch (_) {
        // Fallback for non-JSON responses
      }

      if (!res.ok || data.error) {
        setError(data.error || `Server error (Status ${res.status})`);
      } else {
        setActiveStudent(data.id);
        toast.success(`Application started! Your Student ID is ${data.id}`);
        onVerified();
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = (studentId) => {
    const matched = students.find((s) => s.id === studentId);
    if (matched) {
      setActiveStudent(matched.id);
      toast.success(`Logged in as Demo: ${matched.firstName} ${matched.lastName}`);
      onVerified();
    }
  };

  if (mode === 'resume') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <button onClick={() => setMode('menu')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 font-medium">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          
          <h2 className="text-xl font-bold text-slate-900 mb-2">Resume Application</h2>
          <p className="text-sm text-slate-500 mb-6">Enter your registered email address or Student ID to retrieve your enrollment progress.</p>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleResume} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Student ID or Email</label>
              <input
                type="text"
                placeholder="e.g. STU-2026-0001 or name@email.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer">
              Continue Enrollment <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'new') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <button onClick={() => setMode('menu')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 font-medium">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          
          <h2 className="text-xl font-bold text-slate-900 mb-2">New Student Registration</h2>
          <p className="text-sm text-slate-500 mb-6">Create a new applicant profile to begin the online enrollment process.</p>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleNewApplication} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  pattern="[A-Za-z][A-Za-z\s'.-]{1,49}"
                  title="Use letters only. Spaces, hyphens, periods, and apostrophes are allowed."
                  placeholder="Juan"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  pattern="[A-Za-z][A-Za-z\s'.-]{1,49}"
                  title="Use letters only. Spaces, hyphens, periods, and apostrophes are allowed."
                  placeholder="Dela Cruz"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                placeholder="juan@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Number</label>
              <input
                type="tel"
                required
                pattern="09\d{2}[-\s]?\d{3}[-\s]?\d{4}"
                title="Use a valid PH mobile number, e.g., 0917-123-4567 or 09171234567."
                placeholder="0917-123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold rounded-lg text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer">
              {isSubmitting ? 'Registering...' : 'Start Application'} <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-10 flex flex-col items-center">
        <img src="/logo.png" alt="NCST Logo" className="h-28 w-auto mb-6 object-contain" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">NCST Student Portal Access</h1>
        <p className="text-slate-500">Welcome to the College of Science &amp; Technology Enrollment Gateway</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mb-8">
        <button
          onClick={() => setMode('new')}
          className="bg-white p-6 rounded-xl border border-slate-200 hover:border-indigo-600 hover:shadow-md transition-all group text-left cursor-pointer flex flex-col items-start"
        >
          <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition-colors">
            <FilePlus className="w-6 h-6 text-indigo-600 group-hover:text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Start New Application</h3>
          <p className="text-sm text-slate-500">Begin a new enrollment process for the upcoming academic semester.</p>
        </button>

        <button
          onClick={() => setMode('resume')}
          className="bg-white p-6 rounded-xl border border-slate-200 hover:border-indigo-600 hover:shadow-md transition-all group text-left cursor-pointer flex flex-col items-start"
        >
          <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition-colors">
            <UserCheck className="w-6 h-6 text-slate-600 group-hover:text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Resume Application</h3>
          <p className="text-sm text-slate-500">Check status, upload documents, or modify subject choices on an existing application.</p>
        </button>
      </div>

      {/* Demo Student Shortcuts */}
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl p-6">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Demo Profiles (Bypass Verification)</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={() => handleQuickDemo('STU-2026-0001')} className="px-4 py-3 border border-slate-100 hover:border-indigo-500 rounded-lg text-left transition-all bg-slate-50/50 cursor-pointer">
            <p className="text-xs font-bold text-slate-700">Maria Santos</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Documents Pending</p>
          </button>
          <button onClick={() => handleQuickDemo('STU-2026-0002')} className="px-4 py-3 border border-slate-100 hover:border-indigo-500 rounded-lg text-left transition-all bg-slate-50/50 cursor-pointer">
            <p className="text-xs font-bold text-slate-700">Carlos Reyes</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Advising Pending</p>
          </button>
          <button onClick={() => handleQuickDemo('STU-2026-0003')} className="px-4 py-3 border border-slate-100 hover:border-indigo-500 rounded-lg text-left transition-all bg-slate-50/50 cursor-pointer">
            <p className="text-xs font-bold text-slate-700">Ana Torres</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Payment Pending</p>
          </button>
        </div>
      </div>
    </div>
  );
}
