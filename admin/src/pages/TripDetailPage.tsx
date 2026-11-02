import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { TripMap } from '@/components/TripMap';
import { useAuthed } from '@/hooks/useAuthed';
import { useTripLive } from '@/hooks/useTripLive';
import { ApiError } from '@/lib/api';
import { formatPkrCents } from '@/lib/money';
import { getTrip } from '@/lib/trips-api';
import type { Trip } from '@/lib/types';

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { withToken } = useAuthed();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void withToken((token) => getTrip(token, id))
      .then((data) => {
        if (!cancelled) setTrip(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) setError(`${err.code}: ${err.message}`);
        else if (err instanceof Error) setError(err.message);
        else setError('Failed to load trip');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, withToken]);

  const live = useTripLive(id, trip?.liveLocation ?? null);
  const displayStatus = live.status ?? trip?.status ?? '';

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading trip…</p>;
  }
  if (error || !trip) {
    return (
      <div>
        <Link to="/trips" className="text-sm text-accent-strong hover:underline">
          ← Trips
        </Link>
        <p className="mt-4 text-sm text-danger">{error ?? 'Not found'}</p>
      </div>
    );
  }

  const req = trip.request;
  const pickup =
    req?.pickupLat != null && req?.pickupLng != null
      ? { lat: req.pickupLat, lng: req.pickupLng }
      : null;
  const dropoff =
    req?.dropoffLat != null && req?.dropoffLng != null
      ? { lat: req.dropoffLat, lng: req.dropoffLng }
      : null;

  return (
    <div className="max-w-5xl">
      <Link to="/trips" className="text-sm text-accent-strong hover:underline">
        ← Trips
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">Trip</h2>
        {displayStatus ? <StatusBadge status={displayStatus} /> : null}
        <span
          className={[
            'text-xs font-mono px-2 py-0.5 rounded-full border',
            live.connected
              ? 'border-emerald-200 bg-emerald-50 text-ok'
              : 'border-line bg-slate-50 text-ink-muted',
          ].join(' ')}
        >
          {live.connected ? 'live' : 'offline'}
        </span>
      </div>
      <p className="mt-1 font-mono text-xs text-ink-muted">{trip.id}</p>
      {live.error ? (
        <p className="mt-2 text-sm text-danger">{live.error}</p>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-line bg-panel p-5">
          <h3 className="text-sm font-semibold">Driver</h3>
          <p className="mt-2 font-medium">
            {trip.driver?.fullName ?? trip.driverId}
          </p>
          <p className="text-sm text-ink-muted">{trip.driver?.phone ?? ''}</p>
          <p className="text-sm text-ink-muted">
            {trip.driver?.driverProfile?.vehiclePlate ?? ''}
          </p>
        </section>
        <section className="rounded-xl border border-line bg-panel p-5">
          <h3 className="text-sm font-semibold">Customer</h3>
          <p className="mt-2 font-medium">
            {req?.customer?.fullName ?? '—'}
          </p>
          <p className="text-sm text-ink-muted">{req?.customer?.phone ?? ''}</p>
          <Link
            to={`/dispatches/${trip.requestId}`}
            className="mt-2 inline-block text-sm text-accent-strong hover:underline"
          >
            Open dispatch
          </Link>
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-line bg-panel p-5">
        <h3 className="text-sm font-semibold">Route</h3>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Pickup</dt>
            <dd>{req?.pickupAddress ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Dropoff</dt>
            <dd>{req?.dropoffAddress ?? '—'}</dd>
          </div>
        </dl>
        {trip.finalBillCents != null ? (
          <p className="mt-3 text-sm">
            Final bill{' '}
            <span className="font-semibold">
              {formatPkrCents(trip.finalBillCents)}
            </span>
          </p>
        ) : null}
      </section>

      <section className="mt-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">Live map (OSM)</h3>
          {live.location ? (
            <p className="text-xs font-mono text-ink-muted">
              {live.location.lat.toFixed(5)}, {live.location.lng.toFixed(5)}
              {live.location.stale ? ' · stale' : ''}
              {live.location.sealed ? ' · sealed' : ''}
              {' · '}
              {new Date(live.location.updatedAt).toLocaleTimeString()}
            </p>
          ) : (
            <p className="text-xs text-ink-muted">Waiting for GPS…</p>
          )}
        </div>
        <TripMap
          pickup={pickup}
          dropoff={dropoff}
          live={live.location}
        />
      </section>
    </div>
  );
}
