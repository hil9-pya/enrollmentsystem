import { useState } from 'react';
import { AlertCircle, ArrowLeft, BookOpen, Loader2, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const allowedRoles = new Set(['student', 'instructor', 'admin']);

export default function LmsLoginView({ onBack }) {
  const { login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    const result = await login(email.trim(), password);
    if (!result.success) {
      setError(result.error || 'Unable to sign in.');
    } else if (!allowedRoles.has(result.user?.role)) {
      logout();
      setError('This account does not have access to NCST LMS.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-md">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-univ-blue focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-univ-blue"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Enrollment System
        </button>

        <main className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 px-6 py-6">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="NCST Logo" className="h-12 w-12 object-contain" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">National College of Science &amp; Technology</p>
                <h1 className="mt-1 text-xl font-bold text-univ-navy">Learning Management System</h1>
              </div>
            </div>
          </header>

          <div className="p-6">
            <div className="mb-6 flex items-start gap-3 rounded-md border border-indigo-100 bg-indigo-50 p-4">
              <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">LMS account access</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">Students, instructors, and administrators use their existing NCST account.</p>
              </div>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-md border border-rose-200 bg-rose-50 p-3" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <p className="text-sm font-medium text-rose-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">Email or student ID</span>
                <span className="relative block">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="username"
                    required
                    className="w-full rounded-md border border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Enter your account"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">Password</span>
                <span className="relative block">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    className="w-full rounded-md border border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Enter your password"
                  />
                </span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-univ-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-univ-blue disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Signing in...' : 'Sign in to LMS'}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
