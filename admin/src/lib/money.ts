/** Server money is integer PKR cents. */
export function formatPkrCents(cents: number | null | undefined): string {
  if (cents == null || Number.isNaN(cents)) return '—';
  const rupees = cents / 100;
  return `PKR ${rupees.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase();
}

export function formatKm(meters: number | null | undefined): string {
  if (meters == null) return '—';
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatMinutes(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  const m = Math.round(seconds / 60);
  return `${m} min`;
}
