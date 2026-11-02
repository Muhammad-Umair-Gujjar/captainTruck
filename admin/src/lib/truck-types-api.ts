import { apiRequest } from './api';

export type TruckTypeAdmin = {
  id: string;
  code: string;
  name: string;
  capacity: string | null;
  isActive: boolean;
  currentRateCents: number | null;
  currentRateEffectiveFrom: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BaseRateRow = {
  id: string;
  amountCents: number;
  effectiveFrom: string;
  createdAt: string;
};

export function listTruckTypesAdmin(token: string, signal?: AbortSignal) {
  return apiRequest<TruckTypeAdmin[]>('/api/v1/truck-types/admin/all', {
    token,
    signal,
  });
}

export function getTruckTypeAdmin(
  token: string,
  id: string,
  signal?: AbortSignal,
) {
  return apiRequest<TruckTypeAdmin>(`/api/v1/truck-types/admin/${id}`, {
    token,
    signal,
  });
}

export function createTruckType(
  token: string,
  body: {
    code: string;
    name: string;
    capacity?: string;
    initialRateCents?: number;
    isActive?: boolean;
  },
) {
  return apiRequest<TruckTypeAdmin>('/api/v1/truck-types', {
    method: 'POST',
    token,
    body,
  });
}

export function updateTruckType(
  token: string,
  id: string,
  body: {
    name?: string;
    capacity?: string | null;
    isActive?: boolean;
  },
) {
  return apiRequest<TruckTypeAdmin>(`/api/v1/truck-types/${id}`, {
    method: 'PATCH',
    token,
    body,
  });
}

export function listRateHistory(token: string, id: string) {
  return apiRequest<{ truckTypeId: string; items: BaseRateRow[] }>(
    `/api/v1/truck-types/${id}/rates`,
    { token },
  );
}

export function setBaseRate(
  token: string,
  id: string,
  body: { amountCents: number; effectiveFrom?: string },
) {
  return apiRequest<{
    id: string;
    truckTypeId: string;
    amountCents: number;
    effectiveFrom: string;
    note?: string;
  }>(`/api/v1/truck-types/${id}/rates`, {
    method: 'POST',
    token,
    body,
  });
}

/** UI enters whole PKR rupees; API stores cents. */
export function rupeesToCents(rupees: number): number {
  return Math.round(rupees * 100);
}
