import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuthed } from '@/hooks/useAuthed';
import { ApiError } from '@/lib/api';
import { listUsers, updateUserStatus } from '@/lib/users-api';
import type { AdminUser, PageMeta } from '@/lib/types';

const ROLES = [
  { id: '', label: 'All roles' },
  { id: 'CUSTOMER', label: 'Customers' },
  { id: 'DRIVER', label: 'Drivers' },
  { id: 'ADMIN', label: 'Admins' },
] as const;

export function UsersPage() {
  const { withToken } = useAuthed();
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [qDraft, setQDraft] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void withToken((token) =>
      listUsers(token, {
        page,
        limit: 20,
        role: role || undefined,
        q: q || undefined,
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
        else setError('Failed to load users');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, role, q, withToken]);

  async function toggleStatus(user: AdminUser) {
    const next = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    setBusyId(user.id);
    setActionError(null);
    try {
      const updated = await withToken((token) =>
        updateUserStatus(token, user.id, next),
      );
      setItems((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u)),
      );
    } catch (err: unknown) {
      if (err instanceof ApiError) setActionError(`${err.code}: ${err.message}`);
      else if (err instanceof Error) setActionError(err.message);
      else setActionError('Status update failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            Phase A4
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Users</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Search accounts, enable/disable, and register drivers.
          </p>
        </div>
        <Link
          to="/users/drivers/new"
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Create driver
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <button
            key={r.id || 'all'}
            type="button"
            onClick={() => {
              setRole(r.id);
              setPage(1);
            }}
            className={[
              'rounded-full border px-3 py-1 text-sm',
              role === r.id
                ? 'border-accent bg-amber-50 text-accent-strong'
                : 'border-line text-ink-muted hover:text-ink',
            ].join(' ')}
          >
            {r.label}
          </button>
        ))}
      </div>

      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(qDraft.trim());
          setPage(1);
        }}
      >
        <input
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          placeholder="Search name, email, phone…"
          className="min-w-[220px] flex-1 rounded-md border border-line bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md border border-line px-4 py-2 text-sm font-medium"
        >
          Search
        </button>
      </form>

      {error ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {actionError ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Details</th>
              <th className="px-4 py-3 font-medium">Actions</th>
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
                  No users match.
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr
                  key={u.id}
                  className="border-t border-line hover:bg-slate-50/80"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/users/${u.id}`}
                      className="font-medium text-ink hover:text-accent-strong"
                    >
                      {u.fullName}
                    </Link>
                    <p className="text-xs font-mono text-ink-muted">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {u.role.toLowerCase()}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {u.phone ?? '—'}
                    {u.driverProfile?.vehiclePlate
                      ? ` · ${u.driverProfile.vehiclePlate}`
                      : ''}
                    {u.role === 'DRIVER' && u.driverProfile
                      ? u.driverProfile.isAvailable
                        ? ' · available'
                        : ' · busy'
                      : ''}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => void toggleStatus(u)}
                      className="text-xs font-medium text-accent-strong hover:underline disabled:opacity-50"
                    >
                      {busyId === u.id
                        ? '…'
                        : u.status === 'ACTIVE'
                          ? 'Disable'
                          : 'Enable'}
                    </button>
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
            Page {meta.page} of {meta.totalPages} ({meta.total})
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
