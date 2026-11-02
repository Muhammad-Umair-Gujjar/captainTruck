import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthed } from '@/hooks/useAuthed';
import { ApiError } from '@/lib/api';
import { createTruckType, rupeesToCents } from '@/lib/truck-types-api';

export function CreateTruckTypePage() {
  const { withToken } = useAuthed();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [initialRatePkr, setInitialRatePkr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const rate = initialRatePkr.trim()
        ? Number(initialRatePkr)
        : undefined;
      if (rate !== undefined && (!Number.isFinite(rate) || rate <= 0)) {
        setError('Initial rate must be a positive PKR amount');
        setPending(false);
        return;
      }
      const created = await withToken((token) =>
        createTruckType(token, {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          capacity: capacity.trim() || undefined,
          initialRateCents:
            rate !== undefined ? rupeesToCents(rate) : undefined,
        }),
      );
      navigate(`/truck-types/${created.id}`, { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(`${err.code}: ${err.message}`);
      else if (err instanceof Error) setError(err.message);
      else setError('Create failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-lg">
      <Link
        to="/truck-types"
        className="text-sm text-accent-strong hover:underline"
      >
        ← Truck types
      </Link>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">
        Add truck type
      </h2>
      <form
        onSubmit={onSubmit}
        className="mt-6 flex flex-col gap-3 rounded-xl border border-line bg-panel p-5"
      >
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Code (e.g. SMALL)</span>
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            pattern="[A-Z0-9_]+"
            className="rounded-md border border-line bg-white px-3 py-2 font-mono"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Name</span>
          <input
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-line bg-white px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Capacity (optional)</span>
          <input
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="e.g. 1–2 ton"
            className="rounded-md border border-line bg-white px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Initial base rate PKR (optional)</span>
          <input
            type="number"
            min={1}
            step={1}
            value={initialRatePkr}
            onChange={(e) => setInitialRatePkr(e.target.value)}
            className="rounded-md border border-line bg-white px-3 py-2"
          />
        </label>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? 'Creating…' : 'Create'}
        </button>
      </form>
    </div>
  );
}
