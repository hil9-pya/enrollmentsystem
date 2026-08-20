import { useState } from 'react';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
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
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(320px,0.8fr)_minmax(520px,1.2fr)]">
      <section className="hidden bg-[#0c2a52] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
        <button type="button" onClick={onBack} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-blue-100/80 hover:text-white"><ArrowLeft className="h-4 w-4" /> NCST website</button>
        <div><img src="/logo.png" alt="NCST Logo" className="h-20 w-20 object-contain" /><h1 className="mt-6 text-3xl font-bold">NCST LMS</h1><p className="mt-3 max-w-sm text-base leading-7 text-blue-100/80">Courses, assignments, materials, and academic updates in one learning workspace.</p></div>
        <p className="text-xs text-blue-100/50">National College of Science &amp; Technology</p>
      </section>
      <div className="flex items-center px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-[440px]">
        <button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-univ-blue lg:hidden"><ArrowLeft className="h-4 w-4" /> Back to NCST website</button>
        <main>
          <header className="mb-7">
            <div className="flex items-center gap-3 lg:hidden">
              <img src="/logo.png" alt="NCST Logo" className="h-11 w-11 object-contain" />
              <p className="text-sm font-semibold text-univ-navy">National College of Science &amp; Technology</p>
            </div>
            <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 lg:mt-0">Sign in to NCST LMS</h1>
            <p className="mt-2 text-sm text-slate-600">Sign in using your existing NCST account.</p>
          </header>

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-md border border-rose-200 bg-rose-50 p-3" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <p className="text-sm font-medium text-rose-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">Email or student ID</span>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="username"
                    required
                    className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-univ-blue focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Enter your account"
                  />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-univ-blue focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Enter your password"
                  />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-univ-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-univ-blue disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
        </main>
      </div>
      </div>
    </div>
  );
}
