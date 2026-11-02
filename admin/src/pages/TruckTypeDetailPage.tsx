import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuthed } from '@/hooks/useAuthed';
import { ApiError } from '@/lib/api';
import { formatPkrCents } from '@/lib/money';
import {
  getTruckTypeAdmin,
  listRateHistory,
  rupeesToCents,
  setBaseRate,
  updateTruckType,
  type BaseRateRow,
  type TruckTypeAdmin,
} from '@/lib/truck-types-api';

export function TruckTypeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { withToken } = useAuthed();
  const [truck, setTruck] = useState<TruckTypeAdmin | null>(null);
  const [rates, setRates] = useState<BaseRateRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const [ratePkr, setRatePkr] = useState('');
  const [rateBusy, setRateBusy] = useState(false);

  async function reload(token: string, truckId: string) {
    const [t, history] = await Promise.all([
      getTruckTypeAdmin(token, truckId),
      listRateHistory(token, truckId),
    ]);
    setTruck(t);
    setName(t.name);
    setCapacity(t.capacity ?? '');
    setRates(history.items);
  }

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void withToken((token) => reload(token, id))
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) setError(`${err.code}: ${err.message}`);
        else if (err instanceof Error) setError(err.message);
        else setError('Failed to load truck type');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, withToken]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setActionError(null);
    try {
      const updated = await withToken((token) =>
        updateTruckType(token, id, {
          name: name.trim(),
          capacity: capacity.trim() || null,
        }),
      );
      setTruck(updated);
    } catch (err: unknown) {
      if (err instanceof ApiError) setActionError(`${err.code}: ${err.message}`);
      else if (err instanceof Error) setActionError(err.message);
      else setActionError('Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function onToggleActive() {
    if (!id || !truck) return;
    setToggling(true);
    setActionError(null);
    try {
      const updated = await withToken((token) =>
        updateTruckType(token, id, { isActive: !truck.isActive }),
      );
      setTruck(updated);
    } catch (err: unknown) {
      if (err instanceof ApiError) setActionError(`${err.code}: ${err.message}`);
      else if (err instanceof Error) setActionError(err.message);
      else setActionError('Status update failed');
    } finally {
      setToggling(false);
    }
  }

  async function onAddRate(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    const rupees = Number(ratePkr);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      setActionError('Enter a positive PKR rate');
      return;
    }
    setRateBusy(true);
    setActionError(null);
    try {
      await withToken(async (token) => {
        await setBaseRate(token, id, {
          amountCents: rupeesToCents(rupees),
        });
        await reload(token, id);
      });
      setRatePkr('');
    } catch (err: unknown) {
      if (err instanceof ApiError) setActionError(`${err.code}: ${err.message}`);
      else if (err instanceof Error) setActionError(err.message);
      else setActionError('Could not set rate');
    } finally {
      setRateBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }
  if (error || !truck) {
    return (
      <div>
        <Link
          to="/truck-types"
          className="text-sm text-accent-strong hover:underline"
        >
          ← Truck types
        </Link>
        <p className="mt-4 text-sm text-danger">{error ?? 'Not found'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link
        to="/truck-types"
        className="text-sm text-accent-strong hover:underline"
      >
        ← Truck types
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold tracking-tight font-mono">
          {truck.code}
        </h2>
        <StatusBadge status={truck.isActive ? 'ACTIVE' : 'DISABLED'} />
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        Current rate {formatPkrCents(truck.currentRateCents)}
        {truck.currentRateEffectiveFrom
          ? ` · since ${new Date(truck.currentRateEffectiveFrom).toLocaleString()}`
          : ''}
      </p>

      <form
        onSubmit={onSave}
        className="mt-6 flex flex-col gap-3 rounded-xl border border-line bg-panel p-5"
      >
        <h3 className="text-sm font-semibold">Details</h3>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-line bg-white px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Capacity</span>
          <input
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="rounded-md border border-line bg-white px-3 py-2"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            disabled={toggling}
            onClick={() => void onToggleActive()}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {toggling
              ? '…'
              : truck.isActive
                ? 'Deactivate'
                : 'Activate'}
          </button>
        </div>
      </form>

      <form
        onSubmit={onAddRate}
        className="mt-4 flex flex-col gap-3 rounded-xl border border-line bg-panel p-5"
      >
        <h3 className="text-sm font-semibold">New base rate</h3>
        <p className="text-xs text-ink-muted">
          Appends history. Open dispatches keep their locked rate.
        </p>
        <label className="flex flex-col gap-1.5 text-sm max-w-xs">
          <span className="font-medium">Amount (PKR)</span>
          <input
            type="number"
            required
            min={1}
            step={1}
            value={ratePkr}
            onChange={(e) => setRatePkr(e.target.value)}
            className="rounded-md border border-line bg-white px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={rateBusy}
          className="w-fit rounded-md border border-line px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {rateBusy ? 'Saving…' : 'Add rate'}
        </button>
      </form>

      {actionError ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {actionError}
        </p>
      ) : null}

      <section className="mt-4 overflow-hidden rounded-xl border border-line bg-panel">
        <div className="border-b border-line px-4 py-3 text-sm font-semibold">
          Rate history
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-ink-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Effective from</th>
            </tr>
          </thead>
          <tbody>
            {rates.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-ink-muted">
                  No rates yet.
                </td>
              </tr>
            ) : (
              rates.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-4 py-2 font-mono text-xs">
                    {formatPkrCents(r.amountCents)}
                  </td>
                  <td className="px-4 py-2 text-ink-muted">
                    {new Date(r.effectiveFrom).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
