import { useCallback } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { ApiError } from '@/lib/api';

export function useAuthed() {
  const { accessToken, refresh, logout } = useAuth();

  const withToken = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      if (!accessToken) {
        throw new ApiError('AUTH_009', 'Not signed in', 401);
      }
      try {
        return await fn(accessToken);
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 401) {
          throw err;
        }
        const next = await refresh();
        if (!next) {
          await logout();
          throw err;
        }
        return fn(next);
      }
    },
    [accessToken, logout, refresh],
  );

  return { accessToken, withToken };
}
