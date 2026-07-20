import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import FloatingInput from '../../components/FloatingInput';

export default function LoginView({ portalType }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    const result = await login(email, password);
    if (!result.success) {
      setError(result.error);
    }
    
    setIsSubmitting(false);
  };

  // Quick login helper for demo purposes
  const fillCredentials = (role) => {
    if (role === 'student') {
       setEmail('STU-2026-0000'); // the mock student ID
    } else {
       setEmail(`${role}@example.com`);
    }
    setPassword('password123');
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-start pt-2 outline-none focus:outline-none">
      <div className="text-center mb-8 flex flex-col items-center">
        <h3 className="text-2xl font-heading font-extrabold text-univ-navy capitalize tracking-tight">{portalType} Portal</h3>
        <p className="text-sm text-slate-500 mt-1.5 font-medium">Sign in to securely manage your account</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 rounded-xl flex items-start gap-3 border border-rose-200/50 shadow-sm animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 stroke-[2]" />
          <p className="text-sm text-rose-800 font-bold leading-relaxed">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2" autoComplete="off">
        <FloatingInput
          label={portalType === 'student' ? 'Student ID' : 'Email Address'}
          id="email"
          type={portalType === 'student' ? 'text' : 'email'}
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
          disabled={isSubmitting}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-md shadow-univ-blue/20 hover:shadow-lg hover:shadow-univ-blue/30 text-sm font-extrabold text-white bg-univ-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-univ-blue disabled:opacity-70 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 group"
        >
          {isSubmitting ? (
             <span className="flex items-center gap-2">
               <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               Authenticating...
             </span>
          ) : (
             <>
               Sign In
               <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
             </>
          )}
        </button>
      </form>
      
      {/* Quick Demo Logins */}
      {portalType !== 'student' && (
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 mb-3 text-center uppercase tracking-wider">Quick Demo Access</p>
          <div className="flex flex-wrap justify-center gap-2">
            {(portalType === 'admin' ? ['admin'] : ['admission', 'adviser', 'accounting', 'registrar']).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => fillCredentials(role)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-univ-navy rounded-lg transition-colors capitalize cursor-pointer shadow-sm"
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
