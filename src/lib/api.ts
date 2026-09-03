import { Platform } from 'react-native';

/**
 * Range Day API client (FastAPI backend, self-hosted).
 * Web production is same-origin behind Caddy → relative '/api'.
 * Native / local dev can override with EXPO_PUBLIC_API_URL.
 * EXPO_PUBLIC_DEMO=1 disables the auth gate (mock data only).
 */

export const isDemo = process.env.EXPO_PUBLIC_DEMO === '1';

const BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'web' ? '/api' : 'https://range.jwbegroup.com/api');

export type AppRole = 'shooter' | 'instructor_pending' | 'instructor' | 'admin';

export interface AppUser {
  id: string;
  email: string;
  display_name: string;
  role: AppRole;
  disabled: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  user: AppUser;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server — check your connection');
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const detail =
      typeof data.detail === 'string'
        ? data.detail
        : Array.isArray(data.detail) && data.detail[0]?.msg
          ? data.detail[0].msg
          : `Request failed (${res.status})`;
    throw new ApiError(res.status, detail);
  }
  return data as T;
}

export const api = {
  signup: (email: string, password: string, displayName: string) =>
    request<AuthResponse>('/auth/signup', { method: 'POST', body: { email, password, display_name: displayName } }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }),
  me: (token: string) => request<AppUser>('/auth/me', { token }),
  forgot: (email: string) => request<{ ok: boolean }>('/auth/forgot', { method: 'POST', body: { email } }),
  reset: (token: string, newPassword: string) =>
    request<{ ok: boolean }>('/auth/reset', { method: 'POST', body: { token, new_password: newPassword } }),
  adminListUsers: (token: string) => request<AppUser[]>('/admin/users', { token }),
  adminPatchUser: (token: string, id: string, patch: { role?: AppRole; disabled?: boolean }) =>
    request<AppUser>(`/admin/users/${id}`, { method: 'PATCH', body: patch, token }),
  adminDeleteUser: (token: string, id: string) =>
    request<{ ok: boolean }>(`/admin/users/${id}`, { method: 'DELETE', token }),
};
