import { apiRequest } from './api';
import type { Paginated } from './types';

export type CommissionDriver = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
};

export type CommissionTrip = {
  id: string;
  status: string;
  finalBillCents: number | null;
  completedAt: string | null;
  requestId: string;
};

export type CommissionEntry = {
  id: string;
  driverId: string;
  tripId: string;
  expectedCents: number;
  collectedCents: number;
  pendingCents: number;
  commissionPercent: number;
  adminConfirmedAt: string | null;
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
  trip?: CommissionTrip;
  driver?: CommissionDriver;
  rule?: string;
};

export type CommissionSummaryRow = {
  driverId: string;
  driver: CommissionDriver | null;
  tripCount: number;
  expectedCents: number;
  collectedCents: number;
  pendingCents: number;
};

function qs(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export function listAdminCommissions(
  token: string,
  query: {
    page?: number;
    limit?: number;
    driverId?: string;
    unconfirmedOnly?: boolean;
  } = {},
) {
  return apiRequest<Paginated<CommissionEntry>>(
    `/api/v1/commissions/admin${qs({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      driverId: query.driverId,
      unconfirmedOnly: query.unconfirmedOnly ? true : undefined,
    })}`,
    { token },
  );
}

export function commissionsSummary(token: string) {
  return apiRequest<{ rule: string; items: CommissionSummaryRow[] }>(
    '/api/v1/commissions/admin/summary',
    { token },
  );
}

export function getCommission(token: string, id: string) {
  return apiRequest<CommissionEntry>(`/api/v1/commissions/${id}`, { token });
}

export function confirmCommission(token: string, id: string) {
  return apiRequest<CommissionEntry>(`/api/v1/commissions/${id}/confirm`, {
    method: 'POST',
    token,
  });
}
