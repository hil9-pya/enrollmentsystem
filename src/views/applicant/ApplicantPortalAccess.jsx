import React, { useState } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import FloatingInput from '../../components/FloatingInput';
import { storeApplicantAccess } from '../../utils/authFetch.js';

export default function ApplicantPortalAccess({ onVerified }) {
  const { setActiveStudent, state } = useEnrollment();
  const enrollmentSettings = state?.settings;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password to continue.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/students/applicant-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Application not found or invalid password.');
      }
      
      const data = await res.json();
      storeApplicantAccess(data);
      setActiveStudent(data.id);
      onVerified();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNew = async () => {
    try {
      const res = await fetch(`/api/students/draft`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        storeApplicantAccess(data);
        localStorage.removeItem(`applicant_completed_steps_${data._id}`);
        localStorage.removeItem(`applicant_current_step_${data._id}`);
        setActiveStudent(data._id);
        onVerified();
      }
    } catch (err) {
      console.error('Failed to create application draft', err);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-start pt-2 outline-none focus:outline-none">
        
        <div className="text-center mb-6">
          <h3 className="text-xl font-heading font-bold text-univ-navy">Admissions portal</h3>
          <p className="text-sm text-slate-500 mt-1.5 font-medium max-w-sm leading-relaxed">
            For New and Transfer applicants. Resume an existing application or start a new one.
          </p>
        </div>

        {/* System Announcement */}
        {enrollmentSettings?.announcement && (
          <div className="mb-5 p-3 bg-amber-50 rounded-lg flex items-start gap-3 border border-amber-200" role="status">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 stroke-[2]" />
            <p className="text-sm text-amber-900 font-bold leading-relaxed whitespace-pre-wrap">
              {enrollmentSettings.announcement}
            </p>
          </div>
        )}

        {useEnrollment().settings?.systemMaintenance ? (
          <div className="mb-5 p-4 bg-slate-50 rounded-lg flex items-start gap-3 border border-slate-200">
            <div className="w-9 h-9 bg-amber-100 text-amber-700 rounded-md flex shrink-0 items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div><h4 className="text-sm font-semibold text-slate-800">System maintenance</h4>
            <p className="mt-1 text-sm text-slate-600">The admissions portal is temporarily unavailable. Please check back later.</p></div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-5 p-3 bg-rose-50 rounded-lg flex items-start gap-3 border border-rose-200" role="alert">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 stroke-[2]" />
                <p className="text-sm text-rose-800 font-bold leading-relaxed">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2">
              <FloatingInput
                label="Email Address"
                id="email"
                type="email"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />

              <FloatingInput
                label="Password"
                id="password"
                type="password"
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold text-white bg-univ-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-univ-blue disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin h-4 w-4" aria-hidden="true" />
                    Signing in...
                  </span>
                ) : (
                  'Resume application'
                )}
              </button>
            </form>
            
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/60"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-xs text-slate-500">or</span>
              </div>
            </div>

            <div className="text-center">
              {enrollmentSettings?.enrollmentOpen === false ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-sm text-slate-600 font-bold">Enrollment is currently closed.</p>
                  <p className="text-xs text-slate-400 mt-1">We are not accepting new applications at this time.</p>
                </div>
              ) : (
                <button
                  onClick={handleStartNew}
                  className="w-full flex items-center justify-center py-3 px-4 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-univ-blue transition-colors cursor-pointer"
                >
                  Start new application
                </button>
              )}
            </div>
          </>
        )}
    </div>
  );
}
