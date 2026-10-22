import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, fetchHealth, type HealthData } from '@/lib/api';
import { API_URL } from '@/lib/config';

export function DashboardPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetchHealth(ac.signal)
      .then(setHealth)
      .catch((err: unknown) => {
        if (err instanceof ApiError) setError(`${err.code}: ${err.message}`);
        else if (err instanceof Error) setError(err.message);
        else setError('Health check failed');
      });
    return () => ac.abort();
  }, []);

  return (
    <div className="max-w-4xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
        Overview
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">Dashboard</h2>
      <p className="mt-2 text-sm text-ink-muted">
        API connectivity and shortcuts into the ops queue.
      </p>

      <section className="mt-8 rounded-xl border border-line bg-panel p-5">
        <h3 className="text-sm font-semibold">API health</h3>
        <p className="mt-1 text-xs font-mono text-ink-muted">
          {API_URL || '(same-origin / Vite proxy)'} → /api/v1/health
        </p>
        {error ? (
          <p className="mt-4 text-sm text-danger">{error}</p>
        ) : health ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-ink-muted">Status</dt>
              <dd className="font-medium capitalize">{health.status}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Phase</dt>
              <dd className="font-mono">{health.phase}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Database</dt>
              <dd className="font-medium">{health.database ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Uptime</dt>
              <dd className="font-mono">
                {health.uptimeSeconds != null
                  ? `${health.uptimeSeconds}s`
                  : '—'}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">Checking…</p>
        )}
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          to="/dispatches"
          className="rounded-xl border border-line bg-panel p-5 hover:border-amber-300 transition-colors"
        >
          <h3 className="font-semibold">Pending dispatches</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Approve, assign drivers, or reject requests.
          </p>
        </Link>
        <Link
          to="/trips"
          className="rounded-xl border border-line bg-panel p-5 hover:border-amber-300 transition-colors"
        >
          <h3 className="font-semibold">Live trips</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Track GPS and trip status updates.
          </p>
        </Link>
      </section>
    </div>
  );
}
