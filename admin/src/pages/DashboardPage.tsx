import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthed } from '@/hooks/useAuthed';
import { ApiError, fetchHealth, type HealthData } from '@/lib/api';
import { API_URL, MISSING_PROD_API_URL } from '@/lib/config';
import { listPendingDispatches } from '@/lib/dispatches-api';
import { listAdminTrips } from '@/lib/trips-api';

type Shortcut = {
  to: string;
  title: string;
  hint: (n: number | null) => string;
};

const shortcuts: Shortcut[] = [
  {
    to: '/dispatches',
    title: 'Pending dispatches',
    hint: (n) =>
      n == null
        ? 'Approve, assign drivers, or reject requests.'
        : `${n} waiting for review.`,
  },
  {
    to: '/trips',
    title: 'Live trips',
    hint: (n) =>
      n == null
        ? 'Track GPS and trip status updates.'
        : `${n} active trip${n === 1 ? '' : 's'}.`,
  },
  {
    to: '/users',
    title: 'Users & drivers',
    hint: () => 'Enable/disable accounts or create drivers.',
  },
  {
    to: '/truck-types',
    title: 'Truck types',
    hint: () => 'Catalog and base rate history.',
  },
  {
    to: '/commissions',
    title: 'Commissions',
    hint: () => 'Ledger, by-driver summary, confirm received.',
  },
];

export function DashboardPage() {
  const { withToken } = useAuthed();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [activeTrips, setActiveTrips] = useState<number | null>(null);
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
    void withToken((token) =>
      Promise.all([
        listPendingDispatches(token, { page: 1, limit: 1 }),
        listAdminTrips(token, { page: 1, limit: 1, activeOnly: true }),
      ]),
    )
      .then(([pending, trips]) => {
        setPendingCount(pending.meta.total);
        setActiveTrips(trips.meta.total);
      })
      .catch(() => {
        setPendingCount(null);
        setActiveTrips(null);
      });
    return () => ac.abort();
  }, [withToken]);

  return (
    <div className="max-w-4xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
        Overview
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">Dashboard</h2>
      <p className="mt-2 text-sm text-ink-muted">
        API connectivity and shortcuts into the ops queue.
      </p>

      {MISSING_PROD_API_URL ? (
        <p
          className="mt-4 rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger"
          role="alert"
        >
          Production build is missing <code className="font-mono">VITE_API_URL</code>.
          Set it (and <code className="font-mono">VITE_SOCKET_URL</code>) on Vercel and
          redeploy.
        </p>
      ) : null}

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
        {shortcuts.map((s) => {
          const count =
            s.to === '/dispatches'
              ? pendingCount
              : s.to === '/trips'
                ? activeTrips
                : null;
          return (
            <Link
              key={s.to}
              to={s.to}
              className="rounded-xl border border-line bg-panel p-5 hover:border-amber-300 transition-colors"
            >
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{s.hint(count)}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
