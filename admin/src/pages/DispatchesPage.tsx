import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuthed } from '@/hooks/useAuthed';
import { ApiError } from '@/lib/api';
import { listAdminDispatches, listPendingDispatches } from '@/lib/dispatches-api';
import { formatPkrCents } from '@/lib/money';
import type { Dispatch, PageMeta } from '@/lib/types';

const TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'all', label: 'All' },
] as const;

type Tab = (typeof TABS)[number]['id'];

export function DispatchesPage() {
  const { withToken } = useAuthed();
  const [tab, setTab] = useState<Tab>('pending');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Dispatch[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void withToken((token) =>
      tab === 'pending'
        ? listPendingDispatches(token, { page, limit: 20 })
        : listAdminDispatches(token, { page, limit: 20 }),
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
        else setError('Failed to load dispatches');
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
        Phase A2
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">Dispatches</h2>
      <p className="mt-2 text-sm text-ink-muted">
        Review pending requests, assign a lead driver, or reject with a reason.
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
            {t.id === 'pending' && meta && tab === 'pending'
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
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Route</th>
              <th className="px-4 py-3 font-medium">Truck</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-ink-muted">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-ink-muted">
                  {tab === 'pending'
                    ? 'No pending dispatches.'
                    : 'No dispatches yet.'}
                </td>
              </tr>
            ) : (
              items.map((d) => (
                <tr key={d.id} className="border-t border-line hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <Link
                      to={`/dispatches/${d.id}`}
                      className="font-medium text-ink hover:text-accent-strong"
                    >
                      {d.customer?.fullName ?? d.customerId}
                    </Link>
                    <p className="text-xs text-ink-muted font-mono">
                      {d.customer?.phone ?? d.customer?.email ?? ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate">{d.pickupAddress}</p>
                    <p className="truncate text-ink-muted">→ {d.dropoffAddress}</p>
                  </td>
                  <td className="px-4 py-3">
                    {d.truckType?.name ?? d.truckType?.code ?? '—'}
                    {d.truckCount > 1 ? (
                      <span className="text-ink-muted"> ×{d.truckCount}</span>
                    ) : null}
                    {d.billBreakdown ? (
                      <p className="text-xs text-ink-muted">
                        {formatPkrCents(d.billBreakdown.totalBillCents)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted whitespace-nowrap">
                    {new Date(d.createdAt).toLocaleString()}
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
