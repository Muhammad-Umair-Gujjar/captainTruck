import { apiPath } from './config';

export type ApiErrorBody = {
  success: false;
  error: { code: string; message: string; details?: unknown };
  meta?: { statusCode?: number };
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: unknown;
};

export type ApiEnvelope<T> = ApiSuccess<T> | ApiErrorBody;

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const res = await fetch(apiPath(path), {
    method: options.method ?? (options.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  let envelope: ApiEnvelope<T> | null = null;
  try {
    envelope = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(
      'INTERNAL_ERROR',
      `Invalid JSON response (${res.status})`,
      res.status,
    );
  }

  if (!envelope.success) {
    throw new ApiError(
      envelope.error?.code ?? 'INTERNAL_ERROR',
      envelope.error?.message ?? 'Request failed',
      res.status,
    );
  }

  return envelope.data;
}

export type HealthData = {
  status: string;
  service: string;
  phase: number;
  database?: string;
  databaseConfigured?: boolean;
  uptimeSeconds?: number;
};

export function fetchHealth(signal?: AbortSignal) {
  return apiRequest<HealthData>('/api/v1/health', { signal });
}
