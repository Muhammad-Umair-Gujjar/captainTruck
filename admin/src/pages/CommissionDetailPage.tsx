import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuthed } from '@/hooks/useAuthed';
import { ApiError } from '@/lib/api';
import {
  confirmCommission,
  getCommission,
  type CommissionEntry,
} from '@/lib/commissions-api';
import { formatPkrCents } from '@/lib/money';

export function CommissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { withToken } = useAuthed();
  const [entry, setEntry] = useState<CommissionEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void withToken((token) => getCommission(token, id))
      .then((data) => {
        if (!cancelled) setEntry(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) setError(`${err.code}: ${err.message}`);
        else if (err instanceof Error) setError(err.message);
        else setError('Failed to load commission');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, withToken]);

  async function onConfirm() {
    if (!id) return;
    setBusy(true);
    setActionError(null);
    try {
      const updated = await withToken((token) => confirmCommission(token, id));
      setEntry(updated);
    } catch (err: unknown) {
      if (err instanceof ApiError) setActionError(`${err.code}: ${err.message}`);
      else if (err instanceof Error) setActionError(err.message);
      else setActionError('Confirm failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }
  if (error || !entry) {
    return (
      <div>
        <Link
          to="/commissions"
          className="text-sm text-accent-strong hover:underline"
        >
          ← Commissions
        </Link>
        <p className="mt-4 text-sm text-danger">{error ?? 'Not found'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Link
        to="/commissions"
        className="text-sm text-accent-strong hover:underline"
      >
        ← Commissions
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">Ledger entry</h2>
        <StatusBadge status={entry.confirmed ? 'ACTIVE' : 'PENDING'} />
      </div>
      <p className="mt-1 font-mono text-xs text-ink-muted">{entry.id}</p>

      <section className="mt-6 rounded-xl border border-line bg-panel p-5 text-sm">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Driver</dt>
            <dd>
              <Link
                to={`/users/${entry.driverId}`}
                className="font-medium hover:text-accent-strong"
              >
                {entry.driver?.fullName ?? entry.driverId}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Trip</dt>
            <dd>
              <Link
                to={`/trips/${entry.tripId}`}
                className="font-mono text-xs hover:underline"
              >
                {entry.tripId}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Rate</dt>
            <dd>{entry.commissionPercent}%</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Final bill</dt>
            <dd className="font-mono text-xs">
              {formatPkrCents(entry.trip?.finalBillCents ?? null)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Expected</dt>
            <dd className="font-semibold">
              {formatPkrCents(entry.expectedCents)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Collected</dt>
            <dd>{formatPkrCents(entry.collectedCents)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Pending</dt>
            <dd>{formatPkrCents(entry.pendingCents)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Confirmed at</dt>
            <dd>
              {entry.adminConfirmedAt
                ? new Date(entry.adminConfirmedAt).toLocaleString()
                : '—'}
            </dd>
          </div>
        </dl>
        {entry.rule ? (
          <p className="mt-4 text-xs text-ink-muted">{entry.rule}</p>
        ) : null}
      </section>

      {!entry.confirmed ? (
        <div className="mt-6">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onConfirm()}
            className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Confirming…' : 'Confirm received from driver'}
          </button>
          <p className="mt-2 text-xs text-ink-muted">
            Sets collected = expected and clears pending. Drivers cannot
            self-confirm.
          </p>
        </div>
      ) : (
        <p className="mt-6 text-sm text-ok">Already confirmed.</p>
      )}

      {actionError ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {actionError}
        </p>
      ) : null}
    </div>
  );
}
