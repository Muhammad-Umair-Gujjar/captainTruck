import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuthed } from '@/hooks/useAuthed';
import { ApiError } from '@/lib/api';
import {
  approveDispatch,
  getDispatch,
  listDrivers,
  rejectDispatch,
} from '@/lib/dispatches-api';
import { formatKm, formatMinutes, formatPkrCents } from '@/lib/money';
import type { Dispatch, DriverUser } from '@/lib/types';

export function DispatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { withToken } = useAuthed();
  const [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const [drivers, setDrivers] = useState<DriverUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void withToken(async (token) => {
      const [d, drv] = await Promise.all([
        getDispatch(token, id),
        listDrivers(token),
      ]);
      return { d, drv };
    })
      .then(({ d, drv }) => {
        if (cancelled) return;
        setDispatch(d);
        setDrivers(drv.items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) setError(`${err.code}: ${err.message}`);
        else if (err instanceof Error) setError(err.message);
        else setError('Failed to load dispatch');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, withToken]);

  const canDecide =
    dispatch?.status === 'PENDING_ADMIN' ||
    dispatch?.status === 'APPROVED_ASSIGNED';

  async function onApprove(e: FormEvent) {
    e.preventDefault();
    if (!id || !driverId) return;
    setBusy('approve');
    setActionError(null);
    try {
      const updated = await withToken(async (token) => {
        const next = await approveDispatch(token, id, {
          driverId,
          note: note.trim() || undefined,
        });
        const drv = await listDrivers(token);
        return { next, drv };
      });
      setDispatch(updated.next);
      setDrivers(updated.drv.items);
      setDriverId('');
      setNote('');
    } catch (err: unknown) {
      if (err instanceof ApiError) setActionError(`${err.code}: ${err.message}`);
      else if (err instanceof Error) setActionError(err.message);
      else setActionError('Approve failed');
    } finally {
      setBusy(null);
    }
  }

  async function onReject(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setBusy('reject');
    setActionError(null);
    try {
      const updated = await withToken((token) =>
        rejectDispatch(token, id, reason.trim()),
      );
      setDispatch(updated);
    } catch (err: unknown) {
      if (err instanceof ApiError) setActionError(`${err.code}: ${err.message}`);
      else if (err instanceof Error) setActionError(err.message);
      else setActionError('Reject failed');
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading dispatch…</p>;
  }
  if (error || !dispatch) {
    return (
      <div>
        <Link to="/dispatches" className="text-sm text-accent-strong hover:underline">
          ← Dispatches
        </Link>
        <p className="mt-4 text-sm text-danger">{error ?? 'Not found'}</p>
      </div>
    );
  }

  const selected = dispatch.routeOptions?.find((r) => r.isSelected);
  const bill = dispatch.billBreakdown;
  const availableDrivers = drivers.filter(
    (d) => d.status === 'ACTIVE' && d.driverProfile?.isAvailable === true,
  );

  return (
    <div className="max-w-4xl">
      <Link to="/dispatches" className="text-sm text-accent-strong hover:underline">
        ← Dispatches
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">Dispatch</h2>
        <StatusBadge status={dispatch.status} />
      </div>
      <p className="mt-1 font-mono text-xs text-ink-muted">{dispatch.id}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-line bg-panel p-5">
          <h3 className="text-sm font-semibold">Customer</h3>
          <p className="mt-2 font-medium">{dispatch.customer?.fullName ?? '—'}</p>
          <p className="text-sm text-ink-muted">{dispatch.customer?.email}</p>
          <p className="text-sm text-ink-muted">{dispatch.customer?.phone ?? ''}</p>
        </section>
        <section className="rounded-xl border border-line bg-panel p-5">
          <h3 className="text-sm font-semibold">Truck</h3>
          <p className="mt-2 font-medium">
            {dispatch.truckType?.name ?? dispatch.truckType?.code ?? '—'}
          </p>
          <p className="text-sm text-ink-muted">
            Count {dispatch.truckCount}
            {dispatch.truckCount > 1
              ? ' — one lead driver (FYP policy)'
              : ''}
          </p>
          <p className="text-sm text-ink-muted">
            Payment {dispatch.paymentMethod.replace(/_/g, ' ').toLowerCase()}
          </p>
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-line bg-panel p-5">
        <h3 className="text-sm font-semibold">Route</h3>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Pickup</dt>
            <dd>{dispatch.pickupAddress}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Dropoff</dt>
            <dd>{dispatch.dropoffAddress}</dd>
          </div>
        </dl>
        {selected ? (
          <p className="mt-3 text-sm text-ink-muted">
            Selected: {formatKm(selected.distanceMeters)}
            {selected.durationSeconds != null
              ? ` · ${formatMinutes(selected.durationSeconds)}`
              : ''}
            {' · '}AI cost {formatPkrCents(selected.aiCostCents)}
          </p>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">No selected route.</p>
        )}
        {dispatch.notes ? (
          <p className="mt-3 text-sm">
            <span className="text-ink-muted">Notes: </span>
            {dispatch.notes}
          </p>
        ) : null}
      </section>

      {bill ? (
        <section className="mt-4 rounded-xl border border-line bg-panel p-5">
          <h3 className="text-sm font-semibold">Bill (server)</h3>
          {bill.flaggedOutlier ? (
            <p className="mt-2 text-sm text-warn">
              AI cost flagged as outlier vs distance — review before assign.
            </p>
          ) : null}
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-ink-muted">Locked base</dt>
              <dd className="font-mono">{formatPkrCents(bill.lockedBaseRateCents)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">AI trip</dt>
              <dd className="font-mono">{formatPkrCents(bill.aiTripCostCents)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Per truck</dt>
              <dd className="font-mono">{formatPkrCents(bill.perTruckCents)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Total</dt>
              <dd className="font-semibold">{formatPkrCents(bill.totalBillCents)}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {dispatch.trip ? (
        <section className="mt-4 rounded-xl border border-line bg-panel p-5">
          <h3 className="text-sm font-semibold">Assignment</h3>
          <p className="mt-2 text-sm">
            {dispatch.trip.driver?.fullName ?? dispatch.trip.driverId} · trip{' '}
            <span className="font-mono text-xs">{dispatch.trip.id}</span>
          </p>
          <p className="text-sm text-ink-muted">
            Trip status {dispatch.trip.status.replace(/_/g, ' ').toLowerCase()}
            {dispatch.trip.driver?.driverProfile?.vehiclePlate
              ? ` · ${dispatch.trip.driver.driverProfile.vehiclePlate}`
              : ''}
          </p>
        </section>
      ) : null}

      {dispatch.rejectionReason ? (
        <p className="mt-4 text-sm text-danger">
          Rejection reason: {dispatch.rejectionReason}
        </p>
      ) : null}

      {canDecide ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {dispatch.status === 'PENDING_ADMIN' ? (
            <form
              onSubmit={onApprove}
              className="rounded-xl border border-line bg-panel p-5 flex flex-col gap-3"
            >
              <h3 className="text-sm font-semibold">Approve & assign</h3>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Lead driver</span>
                <select
                  required
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="rounded-md border border-line bg-white px-3 py-2"
                >
                  <option value="">Select driver…</option>
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName}
                      {d.driverProfile?.vehiclePlate
                        ? ` · ${d.driverProfile.vehiclePlate}`
                        : ''}
                      {d.driverProfile?.isAvailable === false ? ' (busy)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              {availableDrivers.length === 0 ? (
                <p className="text-xs text-ink-muted">
                  No available active drivers. Create one in Users (A4).
                </p>
              ) : null}
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Note (optional)</span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  className="rounded-md border border-line bg-white px-3 py-2"
                />
              </label>
              <button
                type="submit"
                disabled={busy !== null || !driverId}
                className="mt-1 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy === 'approve' ? 'Assigning…' : 'Approve & assign'}
              </button>
            </form>
          ) : (
            <div className="rounded-xl border border-line bg-panel p-5 text-sm text-ink-muted">
              Already assigned. Reject below to unassign.
            </div>
          )}

          <form
            onSubmit={onReject}
            className="rounded-xl border border-line bg-panel p-5 flex flex-col gap-3"
          >
            <h3 className="text-sm font-semibold">Reject</h3>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Reason (min 3 characters)</span>
              <textarea
                required
                minLength={3}
                maxLength={500}
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="rounded-md border border-line bg-white px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={busy !== null || reason.trim().length < 3}
              className="mt-1 rounded-md border border-danger px-4 py-2 text-sm font-medium text-danger disabled:opacity-50"
            >
              {busy === 'reject' ? 'Rejecting…' : 'Reject dispatch'}
            </button>
          </form>
        </div>
      ) : null}

      {actionError ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {actionError}
        </p>
      ) : null}
    </div>
  );
}
