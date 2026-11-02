import { apiRequest } from './api';
import type { LiveLocation, Paginated, Trip } from './types';

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export function listAdminTrips(
  token: string,
  query: {
    page?: number;
    limit?: number;
    status?: string;
    activeOnly?: boolean;
  } = {},
) {
  return apiRequest<Paginated<Trip>>(
    `/api/v1/trips/admin${qs({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      status: query.status,
      activeOnly: query.activeOnly,
    })}`,
    { token },
  );
}

export function getTrip(token: string, id: string, signal?: AbortSignal) {
  return apiRequest<Trip>(`/api/v1/trips/${id}`, { token, signal });
}

export function getTripLocation(
  token: string,
  id: string,
  signal?: AbortSignal,
) {
  return apiRequest<LiveLocation | null>(`/api/v1/trips/${id}/location`, {
    token,
    signal,
  });
}
