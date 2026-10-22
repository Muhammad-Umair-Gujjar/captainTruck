import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiRequest } from '@/lib/api';
import {
  clearSession,
  loadSession,
  saveSession,
  type AuthUser,
} from '@/lib/auth-storage';

type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = loadSession();
  const [user, setUser] = useState<AuthUser | null>(initial.user);
  const [accessToken, setAccessToken] = useState<string | null>(
    initial.accessToken,
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    initial.refreshToken,
  );

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiRequest<LoginResult>('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (data.user.role !== 'ADMIN') {
      throw new Error('Admin role required');
    }
    saveSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    });
    setUser(data.user);
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
  }, []);

  const logout = useCallback(async () => {
    if (refreshToken) {
      try {
        await apiRequest<{ ok?: boolean }>('/api/v1/auth/logout', {
          method: 'POST',
          body: { refreshToken },
        });
      } catch {
        // ignore network errors on logout
      }
    }
    clearSession();
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
  }, [refreshToken]);

  const refresh = useCallback(async () => {
    if (!refreshToken) return null;
    try {
      const data = await apiRequest<LoginResult>('/api/v1/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
      });
      if (data.user.role !== 'ADMIN') {
        await logout();
        return null;
      }
      saveSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });
      setUser(data.user);
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      return data.accessToken;
    } catch {
      clearSession();
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      return null;
    }
  }, [logout, refreshToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(accessToken && user),
      isAdmin: user?.role === 'ADMIN',
      login,
      logout,
      refresh,
    }),
    [user, accessToken, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
