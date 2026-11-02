import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { ApiError } from '@/lib/api';
import { MISSING_PROD_API_URL } from '@/lib/config';

export function LoginPage() {
  const { login, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? '/';

  const [email, setEmail] = useState('admin@captaintruck.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (isAuthenticated && isAdmin) {
    return <Navigate to={from} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="w-full max-w-md border border-line bg-panel/95 shadow-sm rounded-xl p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
          Captain Truck
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Admin sign in
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Dispatch, assign drivers, and monitor live trips.
        </p>

        {MISSING_PROD_API_URL ? (
          <p
            className="mt-4 rounded-md border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger"
            role="alert"
          >
            Missing <code className="font-mono">VITE_API_URL</code> in this
            production build. Set Vercel env and redeploy.
          </p>
        ) : null}

        <form className="mt-8 flex flex-col gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Email</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="rounded-md border border-line bg-white px-3 py-2 outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className="rounded-md border border-line bg-white px-3 py-2 outline-none focus:border-accent"
            />
          </label>
          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
