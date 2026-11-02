/** API origin. Empty string uses same-origin + Vite proxy in dev. */
export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ||
  API_URL ||
  'http://localhost:3000'
).replace(/\/$/, '');

/** True when a production build has no VITE_API_URL (will call same-origin and fail on Vercel). */
export const MISSING_PROD_API_URL =
  import.meta.env.PROD && !API_URL;

export function apiPath(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${p}`;
}
