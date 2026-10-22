/** API origin. Empty string uses same-origin + Vite proxy in dev. */
export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ||
  API_URL ||
  'http://localhost:3000'
).replace(/\/$/, '');

export function apiPath(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${p}`;
}
