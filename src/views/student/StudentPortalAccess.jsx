import React, { useState } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { UserCheck, FilePlus, ChevronRight, AlertCircle, ArrowLeft, LogIn } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function StudentPortalAccess({ onVerified }) {
  const { state, setActiveStudent } = useEnrollment();
  const { students } = state;

  const [mode, setMode] = useState('new'); // 'new' | 'resume'
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

  const handleResume = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!identifier.trim()) {
      setError('Please enter your Student ID or Email.');
      return;
    }

    try {
      const q = identifier.trim();
      const res = await fetch(`/api/students/${encodeURIComponent(q)}`);
      
      let data = {};
      try {
        data = await res.json();
      } catch (_) {
        // Fallback
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || 'No matching student record found.');
      }

      setActiveStudent(data.id);
      toast.success(`Welcome back, ${data.firstName || 'Student'}!`);
      onVerified();
    } catch (err) {
      setError(err.message || 'No matching student record found. If you are new, please start a new application.');
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

  const handleQuickDemo = async (studentId) => {
    try {
      const res = await fetch(`/api/students/${studentId}`);
      
      let data = {};
      try {
        data = await res.json();
      } catch (_) {
        // Fallback
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Demo student not found');
      }

      setActiveStudent(data.id);
      toast.success(`Logged in as Demo: ${data.firstName} ${data.lastName}`);
      onVerified();
    } catch (err) {
      toast.error('Could not connect to the server or demo profile not found.');
    }
  };

  const switchMode = (newMode) => {
    setError('');
    setMode(newMode);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="text-center mb-8 flex flex-col items-center">
        <h2 className="text-2xl font-extrabold text-univ-navy mb-2">Student Enrollment Portal</h2>
        <p className="text-xs text-slate-500 max-w-md leading-relaxed font-medium">
          {mode === 'new'
            ? 'Fill in your details below to begin your enrollment application.'
            : 'Enter your Student ID or Email to resume your existing application.'}
        </p>
      </div>

      {/* Main Form Card */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-premium border border-slate-200/80 p-8 mb-6">
        {/* Mode Toggle Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
          <button
            onClick={() => switchMode('new')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              mode === 'new'
                ? 'bg-white text-univ-navy shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FilePlus className="w-3.5 h-3.5" />
            New Application
          </button>
          <button
            onClick={() => switchMode('resume')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              mode === 'resume'
                ? 'bg-white text-univ-navy shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Already Have One?
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700 font-semibold leading-relaxed">{error}</p>
          </div>
        )}

        {/* New Application Form */}
        {mode === 'new' && (
          <form onSubmit={handleNewApplication} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">First Name</label>
                <input
                  type="text"
                  required
                  pattern="[A-Za-z][A-Za-z\s'.-]{1,49}"
                  title="Use letters only. Spaces, hyphens, periods, and apostrophes are allowed."
                  placeholder="Juan"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-univ-indigo focus:border-transparent transition-all bg-slate-50/50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Last Name</label>
                <input
                  type="text"
                  required
                  pattern="[A-Za-z][A-Za-z\s'.-]{1,49}"
                  title="Use letters only. Spaces, hyphens, periods, and apostrophes are allowed."
                  placeholder="Dela Cruz"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-univ-indigo focus:border-transparent transition-all bg-slate-50/50 focus:bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                type="email"
                required
                pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                placeholder="juan@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-univ-indigo focus:border-transparent transition-all bg-slate-50/50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Contact Number</label>
              <input
                type="tel"
                required
                pattern="09\d{2}[-\s]?\d{3}[-\s]?\d{4}"
                title="Use a valid PH mobile number, e.g., 0917-123-4567 or 09171234567."
                placeholder="0917-123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-univ-indigo focus:border-transparent transition-all bg-slate-50/50 focus:bg-white"
              />
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-univ-indigo hover:bg-univ-blue disabled:bg-slate-400 text-white font-bold rounded-lg text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer">
              {isSubmitting ? 'Registering...' : 'Start Application'} <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Resume Application Form */}
        {mode === 'resume' && (
          <form onSubmit={handleResume} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Student ID or Email</label>
              <input
                type="text"
                placeholder="e.g. STU-2026-0001 or name@email.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-univ-indigo focus:border-transparent transition-all bg-slate-50/50 focus:bg-white"
              />
            </div>
            <button type="submit" className="w-full py-3 bg-univ-indigo hover:bg-univ-blue text-white font-bold rounded-lg text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer">
              Continue Enrollment <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {/* Demo Student Shortcuts */}
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-premium">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Demo Profiles (Bypass Verification)</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={() => handleQuickDemo('STU-2026-0001')} className="px-4 py-3 border border-slate-100 hover:border-univ-indigo hover:shadow-sm rounded-xl text-left transition-all bg-slate-50/50 hover:bg-white cursor-pointer flex flex-col justify-between h-20">
            <p className="text-xs font-bold text-univ-navy">Maria Santos</p>
            <span className="px-2 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-600 rounded mt-2 self-start uppercase tracking-wider">Docs Pending</span>
          </button>
          <button onClick={() => handleQuickDemo('STU-2026-0002')} className="px-4 py-3 border border-slate-100 hover:border-univ-indigo hover:shadow-sm rounded-xl text-left transition-all bg-slate-50/50 hover:bg-white cursor-pointer flex flex-col justify-between h-20">
            <p className="text-xs font-bold text-univ-navy">Carlos Reyes</p>
            <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-50 text-univ-gold border border-univ-gold/20 rounded mt-2 self-start uppercase tracking-wider">Advising</span>
          </button>
          <button onClick={() => handleQuickDemo('STU-2026-0003')} className="px-4 py-3 border border-slate-100 hover:border-univ-indigo hover:shadow-sm rounded-xl text-left transition-all bg-slate-50/50 hover:bg-white cursor-pointer flex flex-col justify-between h-20">
            <p className="text-xs font-bold text-univ-navy">Ana Torres</p>
            <span className="px-2 py-0.5 text-[9px] font-bold bg-purple-50 text-purple-600 border border-purple-200/40 rounded mt-2 self-start uppercase tracking-wider">Payment</span>
          </button>
        </div>
      </div>
    </div>
  );
}
