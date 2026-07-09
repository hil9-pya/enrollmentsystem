import React, { useState } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { Mail, Lock, AlertCircle } from 'lucide-react';

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
    <div className="w-full flex-1 flex flex-col justify-start pt-4 outline-none focus:outline-none">
        
        <div className="text-center mb-8 flex flex-col items-center">
          <h3 className="text-xl font-heading font-bold text-univ-navy">Applicant Portal</h3>
          <p className="text-sm text-slate-500 mt-1">Resume an application or start a new one</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 rounded-xl flex items-start gap-3 border border-rose-100 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-700 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-premium pl-10"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-premium pl-10"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center py-3 px-4 rounded-xl shadow-premium text-sm font-bold text-white bg-univ-blue hover:bg-univ-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-univ-blue disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? 'Checking...' : 'Resume Application'}
          </button>
        </form>
        
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-slate-400 font-bold text-[10px] uppercase tracking-widest">Or</span>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleStartNew}
            className="w-full flex items-center justify-center py-3 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 hover:text-univ-navy focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-200 transition-all"
          >
            Start New Application
          </button>
        </div>
        
    </div>
  );
}
