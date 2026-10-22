const ACCESS_KEY = 'ct_admin_access';
const REFRESH_KEY = 'ct_admin_refresh';
const USER_KEY = 'ct_admin_user';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
};

export function loadSession(): {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
} {
  const accessToken = localStorage.getItem(ACCESS_KEY);
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  const raw = localStorage.getItem(USER_KEY);
  let user: AuthUser | null = null;
  if (raw) {
    try {
      user = JSON.parse(raw) as AuthUser;
    } catch {
      user = null;
    }
  }
  return { accessToken, refreshToken, user };
}

export function saveSession(input: {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}) {
  localStorage.setItem(ACCESS_KEY, input.accessToken);
  localStorage.setItem(REFRESH_KEY, input.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(input.user));
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}
