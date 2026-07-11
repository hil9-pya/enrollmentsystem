import React, { useState } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { Mail, Lock, AlertCircle, ArrowRight, Play } from 'lucide-react';
import FloatingInput from '../../components/FloatingInput';

export default function ApplicantPortalAccess({ onVerified }) {
  const { setActiveStudent } = useEnrollment();
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
        setActiveStudent(data._id);
        onVerified();
      }
    } catch (err) {
      console.error('Failed to create application draft', err);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-start pt-2 outline-none focus:outline-none">
        
        <div className="text-center mb-8 flex flex-col items-center">
          <h3 className="text-2xl font-heading font-extrabold text-univ-navy tracking-tight">Applicant Portal</h3>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">Resume an existing application or start a new one</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 rounded-xl flex items-start gap-3 border border-rose-200/50 shadow-sm animate-in fade-in slide-in-from-top-2">
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
            required
          />

          <FloatingInput
            label="Password"
            id="password"
            type="password"
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-md shadow-univ-blue/20 hover:shadow-lg hover:shadow-univ-blue/30 text-sm font-extrabold text-white bg-univ-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-univ-blue disabled:opacity-70 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 group"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Checking Credentials...
              </span>
            ) : (
              <>
                Resume Application
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
        
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200/60"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-slate-400 font-extrabold text-[10px] uppercase tracking-widest">Or</span>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleStartNew}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-slate-200 hover:border-univ-blue/30 shadow-sm rounded-xl text-sm font-extrabold text-slate-600 bg-white hover:bg-blue-50 hover:text-univ-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-univ-blue transition-all cursor-pointer group"
          >
            <Play className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Start New Application
          </button>
        </div>
        
    </div>
  );
}
