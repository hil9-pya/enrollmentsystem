import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

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
    setEmail(`${role}@example.com`);
    setPassword('password123');
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-start pt-4 outline-none focus:outline-none">
      <div className="text-center mb-8 flex flex-col items-center">
        <h3 className="text-xl font-heading font-bold text-univ-navy capitalize">{portalType} Portal</h3>
        <p className="text-sm text-slate-500 mt-1">Sign in to securely manage your account</p>
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
              placeholder="admin@example.com"
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
          disabled={isSubmitting}
          className="w-full mt-2 flex items-center justify-center py-3 px-4 rounded-xl shadow-premium text-sm font-bold text-white bg-univ-blue hover:bg-univ-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-univ-blue disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? 'Authenticating...' : 'Sign In'}
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
                className="px-3 py-1.5 text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg transition-colors capitalize"
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
