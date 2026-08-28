import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import FloatingInput from '../../components/FloatingInput';

export default function LoginView({ portalType, onLogin }) {
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
    } else {
      onLogin?.(result.user);
    }
    
    setIsSubmitting(false);
  };

  // Quick login helper for demo purposes
  const fillCredentials = (role) => {
    setEmail(`${role}@example.com`);
    setPassword('password123');
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-start pt-2 outline-none focus:outline-none">
      <div className="text-center mb-6">
        <h3 className="text-xl font-heading font-bold text-univ-navy capitalize">{portalType} sign in</h3>
      </div>

      {error && (
        <div className="mb-5 p-3 bg-rose-50 rounded-lg flex items-start gap-3 border border-rose-200" role="alert">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 stroke-[2]" />
          <p className="text-sm text-rose-800 font-bold leading-relaxed">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <FloatingInput
          label={portalType === 'student' ? 'Student ID' : 'Email Address'}
          id="email"
          type={portalType === 'student' ? 'text' : 'email'}
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
          disabled={isSubmitting}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold text-white bg-univ-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-univ-blue disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
             <span className="flex items-center gap-2">
               <Loader2 className="animate-spin h-4 w-4" aria-hidden="true" />
               Signing in...
             </span>
          ) : (
             'Sign in'
          )}
        </button>
      </form>
      
      {import.meta.env.DEV && portalType !== 'student' && (
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex flex-wrap justify-center gap-2">
            {(portalType === 'admin' ? ['admin'] : ['admission', 'adviser', 'accounting', 'registrar']).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => fillCredentials(role)}
                className="cursor-pointer rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold capitalize text-slate-600 transition-colors hover:bg-slate-50 hover:text-univ-navy"
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
