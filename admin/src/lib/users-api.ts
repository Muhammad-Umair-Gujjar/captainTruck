import { apiRequest } from './api';
import type { AdminUser, Paginated } from './types';

function qs(
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export function listUsers(
  token: string,
  query: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    q?: string;
  } = {},
) {
  return apiRequest<Paginated<AdminUser>>(
    `/api/v1/users${qs({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      role: query.role,
      status: query.status,
      q: query.q,
    })}`,
    { token },
  );
}

export function getUser(token: string, id: string, signal?: AbortSignal) {
  return apiRequest<AdminUser>(`/api/v1/users/${id}`, { token, signal });
}

export function updateUserStatus(
  token: string,
  id: string,
  status: 'ACTIVE' | 'DISABLED' | 'PENDING' | 'REJECTED',
) {
  return apiRequest<AdminUser>(`/api/v1/users/${id}/status`, {
    method: 'PATCH',
    token,
    body: { status },
  });
}

export type CreateDriverBody = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  licenseNumber?: string;
  vehiclePlate?: string;
};

export function createDriver(token: string, body: CreateDriverBody) {
  return apiRequest<{ user: AdminUser; driverProfile: unknown }>(
    '/api/v1/auth/drivers',
    {
      method: 'POST',
      token,
      body,
    },
  );
}
