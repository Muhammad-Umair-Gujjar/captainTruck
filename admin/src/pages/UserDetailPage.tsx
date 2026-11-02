import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuthed } from '@/hooks/useAuthed';
import { ApiError } from '@/lib/api';
import { getUser, updateUserStatus } from '@/lib/users-api';
import type { AdminUser } from '@/lib/types';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { withToken } = useAuthed();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void withToken((token) => getUser(token, id))
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) setError(`${err.code}: ${err.message}`);
        else if (err instanceof Error) setError(err.message);
        else setError('Failed to load user');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, withToken]);

  async function toggleStatus() {
    if (!user) return;
    const next = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    setBusy(true);
    setActionError(null);
    try {
      const updated = await withToken((token) =>
        updateUserStatus(token, user.id, next),
      );
      setUser(updated);
    } catch (err: unknown) {
      if (err instanceof ApiError) setActionError(`${err.code}: ${err.message}`);
      else if (err instanceof Error) setActionError(err.message);
      else setActionError('Status update failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading user…</p>;
  }
  if (error || !user) {
    return (
      <div>
        <Link to="/users" className="text-sm text-accent-strong hover:underline">
          ← Users
        </Link>
        <p className="mt-4 text-sm text-danger">{error ?? 'Not found'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Link to="/users" className="text-sm text-accent-strong hover:underline">
        ← Users
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">{user.fullName}</h2>
        <StatusBadge status={user.status} />
        <span className="rounded-full border border-line px-2 py-0.5 text-xs capitalize text-ink-muted">
          {user.role.toLowerCase()}
        </span>
      </div>
      <p className="mt-1 font-mono text-xs text-ink-muted">{user.id}</p>

      <section className="mt-6 rounded-xl border border-line bg-panel p-5 text-sm">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Email</dt>
            <dd className="font-mono">{user.email}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Phone</dt>
            <dd>{user.phone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Created</dt>
            <dd>{new Date(user.createdAt).toLocaleString()}</dd>
          </div>
        </dl>
      </section>

      {user.driverProfile ? (
        <section className="mt-4 rounded-xl border border-line bg-panel p-5 text-sm">
          <h3 className="font-semibold">Driver profile</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Plate</dt>
              <dd>{user.driverProfile.vehiclePlate ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">License</dt>
              <dd>{user.driverProfile.licenseNumber ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Availability</dt>
              <dd>
                {user.driverProfile.isAvailable ? 'Available' : 'Busy / unavailable'}
              </dd>
            </div>
            {user.driverProfile.adminNotes ? (
              <div className="sm:col-span-2">
                <dt className="text-ink-muted">Admin notes</dt>
                <dd>{user.driverProfile.adminNotes}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <div className="mt-6">
        <button
          type="button"
          disabled={busy}
          onClick={() => void toggleStatus()}
          className={[
            'rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50',
            user.status === 'ACTIVE'
              ? 'border border-danger text-danger'
              : 'bg-ink text-white',
          ].join(' ')}
        >
          {busy
            ? 'Updating…'
            : user.status === 'ACTIVE'
              ? 'Disable account'
              : 'Enable account'}
        </button>
        {actionError ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            {actionError}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-ink-muted">
          Last active admin cannot be disabled (USER_005). Drivers with active
          trips cannot be disabled (USER_006).
        </p>
      </div>
    </div>
  );
}
