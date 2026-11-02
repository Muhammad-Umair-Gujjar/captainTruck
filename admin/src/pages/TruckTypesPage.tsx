import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuthed } from '@/hooks/useAuthed';
import { ApiError } from '@/lib/api';
import { formatPkrCents } from '@/lib/money';
import {
  listTruckTypesAdmin,
  type TruckTypeAdmin,
} from '@/lib/truck-types-api';

export function TruckTypesPage() {
  const { withToken } = useAuthed();
  const [items, setItems] = useState<TruckTypeAdmin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void withToken((token) => listTruckTypesAdmin(token))
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) setError(`${err.code}: ${err.message}`);
        else if (err instanceof Error) setError(err.message);
        else setError('Failed to load truck types');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [withToken]);

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            Phase A5
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Truck types
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Catalog and base rates. New rates do not change locked dispatch
            bills.
          </p>
        </div>
        <Link
          to="/truck-types/new"
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add truck type
        </Link>
      </div>

      {error ? (
        <p className="mt-6 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Capacity</th>
              <th className="px-4 py-3 font-medium">Current rate</th>
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
                  No truck types yet.
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
                      to={`/truck-types/${t.id}`}
                      className="font-mono font-medium text-ink hover:text-accent-strong"
                    >
                      {t.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{t.name}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {t.capacity ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatPkrCents(t.currentRateCents)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.isActive ? 'ACTIVE' : 'DISABLED'} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
