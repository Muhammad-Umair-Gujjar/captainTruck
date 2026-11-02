import { formatStatus } from '@/lib/money';

const TONES: Record<string, string> = {
  PENDING_ADMIN: 'bg-amber-50 text-accent-strong border-amber-200',
  APPROVED_ASSIGNED: 'bg-emerald-50 text-ok border-emerald-200',
  IN_PROGRESS: 'bg-sky-50 text-sky-800 border-sky-200',
  COMPLETED: 'bg-slate-100 text-ink border-line',
  REJECTED: 'bg-red-50 text-danger border-red-200',
  CANCELLED: 'bg-slate-100 text-ink-muted border-line',
  DRAFT: 'bg-slate-50 text-ink-muted border-line',
  AWAITING_ROUTE_SELECTION: 'bg-amber-50/60 text-ink-muted border-amber-100',
  ASSIGNED: 'bg-amber-50 text-accent-strong border-amber-200',
  EN_ROUTE_PICKUP: 'bg-sky-50 text-sky-800 border-sky-200',
  ARRIVED_PICKUP: 'bg-sky-50 text-sky-800 border-sky-200',
  IN_TRANSIT: 'bg-sky-50 text-sky-900 border-sky-200',
  DELIVERED: 'bg-emerald-50 text-ok border-emerald-200',
};

export function StatusBadge({ status }: { status: string }) {
  const tone = TONES[status] ?? 'bg-slate-50 text-ink border-line';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${tone}`}
    >
      {formatStatus(status)}
    </span>
  );
}
