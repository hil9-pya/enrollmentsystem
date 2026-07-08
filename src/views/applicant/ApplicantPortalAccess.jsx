import React, { useState } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { CreditCard, ArrowRight, UserPlus, FileText } from 'lucide-react';

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
      const res = await fetch(`http://localhost:5000/api/students/applicant-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Application not found or invalid password.');
      }
      
      const data = await res.json();
      setActiveStudent(data._id);
      onVerified();
    } catch (err) {
      setError(err.message || 'Application not found. Please check your email and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNew = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/students/draft`, { method: 'POST' });
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
    <div className="flex h-screen w-full bg-slate-50 items-center justify-center p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left Col - Info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <img src="/logo.png" alt="NCST Logo" className="h-10 w-auto" />
              <span className="text-sm font-extrabold text-univ-navy uppercase tracking-widest leading-tight">
                National College of<br />Science & Technology
              </span>
            </div>
            <h1 className="text-4xl font-extrabold text-univ-navy tracking-tight leading-tight mt-6">
              Applicant <span className="text-univ-gold">Portal</span>
            </h1>
            <p className="text-slate-500 mt-4 max-w-md leading-relaxed text-sm">
              Welcome to the NCST Applicant Portal. Start a new application for admission or check the status of your existing application.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <UserPlus size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-univ-navy">New Applicant</h3>
                <p className="text-xs text-slate-500 mt-0.5">Start a fresh admission application for the upcoming term.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <FileText size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-univ-navy">Track Application</h3>
                <p className="text-xs text-slate-500 mt-0.5">Upload requirements and monitor your admission status.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col - Access Form */}
        <div className="bg-white rounded-2xl shadow-premium p-8 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-univ-navy via-univ-gold to-univ-navy"></div>
          
          <div className="space-y-8 relative">
            <div>
              <h2 className="text-xl font-bold text-univ-navy">Resume Application</h2>
              <p className="text-sm text-slate-500 mt-1">Enter your email address to check your status or continue uploading documents.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <CreditCard className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-univ-blue focus:border-univ-blue transition-all bg-slate-50/50 hover:bg-white text-sm"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-univ-blue focus:border-univ-blue transition-all bg-slate-50/50 hover:bg-white text-sm"
                    placeholder="Enter Password"
                  />
                </div>
                {error && <p className="text-rose-500 text-xs mt-1.5 font-medium">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-univ-navy hover:bg-univ-navy/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-univ-navy shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  'Checking...'
                ) : (
                  <span className="flex items-center gap-2">
                    Access Application
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-slate-400 font-medium text-xs uppercase tracking-widest">Or</span>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={handleStartNew}
                className="w-full inline-flex items-center justify-center px-4 py-3 border-2 border-univ-navy text-sm font-bold text-univ-navy bg-white hover:bg-univ-navy hover:text-white transition-colors rounded-xl group"
              >
                Start New Application
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
