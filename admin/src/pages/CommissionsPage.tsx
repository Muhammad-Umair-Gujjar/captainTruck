import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuthed } from '@/hooks/useAuthed';
import { ApiError } from '@/lib/api';
import {
  commissionsSummary,
  listAdminCommissions,
  type CommissionEntry,
  type CommissionSummaryRow,
} from '@/lib/commissions-api';
import { formatPkrCents } from '@/lib/money';
import type { PageMeta } from '@/lib/types';

const TABS = [
  { id: 'unconfirmed', label: 'Unconfirmed' },
  { id: 'all', label: 'All entries' },
  { id: 'summary', label: 'By driver' },
] as const;

type Tab = (typeof TABS)[number]['id'];

export function CommissionsPage() {
  const { withToken } = useAuthed();
  const [tab, setTab] = useState<Tab>('unconfirmed');
  const [page, setPage] = useState(1);
  const [driverId, setDriverId] = useState<string | undefined>();
  const [items, setItems] = useState<CommissionEntry[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [summary, setSummary] = useState<CommissionSummaryRow[]>([]);
  const [rule, setRule] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      if (tab === 'summary') {
        const data = await withToken((token) => commissionsSummary(token));
        if (cancelled) return;
        setSummary(data.items);
        setRule(data.rule);
        setItems([]);
        setMeta(null);
        return;
      }
      const data = await withToken((token) =>
        listAdminCommissions(token, {
          page,
          limit: 20,
          driverId,
          unconfirmedOnly: tab === 'unconfirmed',
        }),
      );
      if (cancelled) return;
      setItems(data.items);
      setMeta(data.meta);
      setSummary([]);
    };

    void load()
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) setError(`${err.code}: ${err.message}`);
        else if (err instanceof Error) setError(err.message);
        else setError('Failed to load commissions');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, page, driverId, withToken]);

  return (
    <div className="max-w-5xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
        Phase A6
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">
        Commissions
      </h2>
      <p className="mt-2 text-sm text-ink-muted">
        Driver owes platform % of final bill. Confirm when cash/transfer is
        received from the driver.
      </p>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setPage(1);
              if (t.id !== 'all' && t.id !== 'unconfirmed') setDriverId(undefined);
            }}
            className={[
              'px-3 py-2 text-sm font-medium border-b-2 -mb-px',
              tab === t.id
                ? 'border-accent text-accent-strong'
                : 'border-transparent text-ink-muted hover:text-ink',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {driverId && tab !== 'summary' ? (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-ink-muted">Filtered by driver</span>
          <button
            type="button"
            className="text-accent-strong hover:underline"
            onClick={() => {
              setDriverId(undefined);
              setPage(1);
            }}
          >
            Clear
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {tab === 'summary' ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-line bg-panel">
          {rule ? (
            <p className="border-b border-line px-4 py-3 text-xs text-ink-muted">
              {rule}
            </p>
          ) : null}
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">Trips</th>
                <th className="px-4 py-3 font-medium">Expected</th>
                <th className="px-4 py-3 font-medium">Collected</th>
                <th className="px-4 py-3 font-medium">Pending</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-ink-muted">
                    Loading…
                  </td>
                </tr>
              ) : summary.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-ink-muted">
                    No commission rows yet.
                  </td>
                </tr>
              ) : (
                summary.map((row) => (
                  <tr
                    key={row.driverId}
                    className="border-t border-line hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="font-medium text-left hover:text-accent-strong"
                        onClick={() => {
                          setDriverId(row.driverId);
                          setTab('all');
                          setPage(1);
                        }}
                      >
                        {row.driver?.fullName ?? row.driverId}
                      </button>
                      <p className="text-xs font-mono text-ink-muted">
                        {row.driver?.email ?? ''}
                      </p>
                    </td>
                    <td className="px-4 py-3">{row.tripCount}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatPkrCents(row.expectedCents)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatPkrCents(row.collectedCents)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-medium">
                      {formatPkrCents(row.pendingCents)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-hidden rounded-xl border border-line bg-panel">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Driver</th>
                  <th className="px-4 py-3 font-medium">Trip / %</th>
                  <th className="px-4 py-3 font-medium">Expected</th>
                  <th className="px-4 py-3 font-medium">Pending</th>
                  <th className="px-4 py-3 font-medium">Status</th>
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
                      {tab === 'unconfirmed'
                        ? 'No unconfirmed commissions.'
                        : 'No ledger entries.'}
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-line hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/commissions/${row.id}`}
                          className="font-medium hover:text-accent-strong"
                        >
                          {row.driver?.fullName ?? row.driverId}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-muted">
                        <Link
                          to={`/trips/${row.tripId}`}
                          className="font-mono hover:underline"
                        >
                          {row.tripId.slice(0, 10)}…
                        </Link>
                        <span> · {row.commissionPercent}%</span>
                        {row.trip?.finalBillCents != null ? (
                          <p>Bill {formatPkrCents(row.trip.finalBillCents)}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {formatPkrCents(row.expectedCents)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {formatPkrCents(row.pendingCents)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={row.confirmed ? 'ACTIVE' : 'PENDING'}
                        />
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
        </>
      )}
    </div>
  );
}
