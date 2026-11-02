import { apiRequest } from './api';
import type { Dispatch, DriverUser, Paginated } from './types';

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export function listPendingDispatches(
  token: string,
  query: { page?: number; limit?: number } = {},
) {
  return apiRequest<Paginated<Dispatch>>(
    `/api/v1/dispatches/admin/pending${qs({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    })}`,
    { token },
  );
}

export function listAdminDispatches(
  token: string,
  query: { page?: number; limit?: number; status?: string } = {},
) {
  return apiRequest<Paginated<Dispatch>>(
    `/api/v1/dispatches/admin/all${qs({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      status: query.status,
    })}`,
    { token },
  );
}

export function getDispatch(token: string, id: string, signal?: AbortSignal) {
  return apiRequest<Dispatch>(`/api/v1/dispatches/${id}`, { token, signal });
}

export function approveDispatch(
  token: string,
  id: string,
  body: { driverId: string; note?: string },
) {
  return apiRequest<Dispatch>(`/api/v1/dispatches/${id}/approve`, {
    method: 'POST',
    token,
    body,
  });
}

export function rejectDispatch(token: string, id: string, reason: string) {
  return apiRequest<Dispatch>(`/api/v1/dispatches/${id}/reject`, {
    method: 'POST',
    token,
    body: { reason },
  });
}

export function listDrivers(token: string, signal?: AbortSignal) {
  return apiRequest<Paginated<DriverUser>>(
    `/api/v1/users${qs({ role: 'DRIVER', status: 'ACTIVE', limit: 100 })}`,
    { token, signal },
  );
}
