import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthed } from '@/hooks/useAuthed';
import { ApiError } from '@/lib/api';
import { createDriver } from '@/lib/users-api';

export function CreateDriverPage() {
  const { withToken } = useAuthed();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await withToken((token) =>
        createDriver(token, {
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
          licenseNumber: licenseNumber.trim() || undefined,
          vehiclePlate: vehiclePlate.trim() || undefined,
        }),
      );
      navigate(`/users/${result.user.id}`, { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(`${err.code}: ${err.message}`);
      else if (err instanceof Error) setError(err.message);
      else setError('Could not create driver');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-lg">
      <Link to="/users" className="text-sm text-accent-strong hover:underline">
        ← Users
      </Link>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
        Phase A4
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">
        Create driver
      </h2>
      <p className="mt-2 text-sm text-ink-muted">
        Drivers cannot self-register — admin creates the account.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-6 flex flex-col gap-3 rounded-xl border border-line bg-panel p-5"
      >
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Full name</span>
          <input
            required
            minLength={2}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-md border border-line bg-white px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-line bg-white px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Password (min 8)</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-line bg-white px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Phone (optional)</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+92300…"
            className="rounded-md border border-line bg-white px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">License # (optional)</span>
          <input
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            className="rounded-md border border-line bg-white px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Vehicle plate (optional)</span>
          <input
            value={vehiclePlate}
            onChange={(e) => setVehiclePlate(e.target.value)}
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
          {pending ? 'Creating…' : 'Create driver'}
        </button>
      </form>
    </div>
  );
}
