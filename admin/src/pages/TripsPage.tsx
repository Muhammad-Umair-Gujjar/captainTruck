import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuthed } from '@/hooks/useAuthed';
import { ApiError } from '@/lib/api';
import { listAdminTrips } from '@/lib/trips-api';
import type { PageMeta, Trip } from '@/lib/types';

const TABS = [
  { id: 'active', label: 'Active' },
  { id: 'all', label: 'All' },
] as const;

type Tab = (typeof TABS)[number]['id'];

export function TripsPage() {
  const { withToken } = useAuthed();
  const [tab, setTab] = useState<Tab>('active');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Trip[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void withToken((token) =>
      listAdminTrips(token, {
        page,
        limit: 20,
        activeOnly: tab === 'active' ? true : undefined,
      }),
    )
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setMeta(data.meta);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) setError(`${err.code}: ${err.message}`);
        else if (err instanceof Error) setError(err.message);
        else setError('Failed to load trips');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, tab, withToken]);

  return (
    <div className="max-w-5xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
        Phase A3
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">Trips</h2>
      <p className="mt-2 text-sm text-ink-muted">
        Active assignments and live GPS on OpenStreetMap.
      </p>

      <div className="mt-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setPage(1);
            }}
            className={[
              'px-3 py-2 text-sm font-medium border-b-2 -mb-px',
              tab === t.id
                ? 'border-accent text-accent-strong'
                : 'border-transparent text-ink-muted hover:text-ink',
            ].join(' ')}
          >
            {t.label}
            {t.id === 'active' && meta && tab === 'active'
              ? ` (${meta.total})`
              : ''}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-6 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Driver</th>
              <th className="px-4 py-3 font-medium">Customer / route</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Started</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-ink-muted">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-ink-muted">
                  {tab === 'active' ? 'No active trips.' : 'No trips yet.'}
                </td>
              </tr>
            ) : (
              items.map((t) => (
                <tr
                  key={t.id}
                  className="border-t border-line hover:bg-slate-50/80"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/trips/${t.id}`}
                      className="font-medium text-ink hover:text-accent-strong"
                    >
                      {t.driver?.fullName ?? t.driverId}
                    </Link>
                    <p className="text-xs text-ink-muted font-mono">
                      {t.driver?.driverProfile?.vehiclePlate ?? ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate">
                      {t.request?.customer?.fullName ?? '—'}
                    </p>
                    <p className="truncate text-ink-muted text-xs">
                      {t.request?.pickupAddress ?? ''}
                      {t.request?.dropoffAddress
                        ? ` → ${t.request.dropoffAddress}`
                        : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted whitespace-nowrap">
                    {t.startedAt
                      ? new Date(t.startedAt).toLocaleString()
                      : new Date(t.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 ? (
        <div className="mt-4 flex items-center gap-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-line px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-ink-muted">
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-line px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
