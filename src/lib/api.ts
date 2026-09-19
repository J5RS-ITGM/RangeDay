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
  phone: string;
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

export interface PostRow {
  id: string;
  author: string;
  initial: string;
  org_post: boolean;
  vis: 'public' | 'org';
  title: string;
  body: string;
  created_at: string;
  likes: number;
  liked: boolean;
  mine: boolean;
}

export interface ContactRow {
  id: string;
  status: 'pending' | 'accepted';
  direction: 'outgoing' | 'incoming';
  user: { id: string; display_name: string; email: string; phone: string };
}

export interface ContactsResponse {
  contacts: ContactRow[];
  incoming: ContactRow[];
  outgoing: ContactRow[];
}

export interface AppSettings {
  signup_mode: 'open' | 'closed';
  phone_verification: 'required' | 'off';
  twilio_account_sid: string;
  twilio_verify_sid: string;
  twilio_sms_from: string;
  twilio_auth_token_set: boolean;
  twilio_configured: boolean;
  sms_sender_configured: boolean;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_from: string;
  smtp_password_set: boolean;
  email_configured: boolean;
}

export interface AccountRequestRow {
  id: string;
  email: string;
  display_name: string;
  phone: string;
  note: string;
  created_at: string;
}

export const api = {
  config: () => request<{ signup_open: boolean; phone_verification: boolean }>('/config'),
  requestAccount: (email: string, displayName: string, note: string, phone = '') =>
    request<{ ok: boolean }>('/auth/request-account', {
      method: 'POST',
      body: { email, display_name: displayName, note, phone },
    }),
  signup: (email: string, password: string, displayName: string, phone = '', verificationToken = '') =>
    request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: { email, password, display_name: displayName, phone, verification_token: verificationToken },
    }),
  verifyStart: (phone: string) =>
    request<{ ok: boolean; phone: string }>('/auth/verify/start', { method: 'POST', body: { phone } }),
  verifyCheck: (phone: string, code: string) =>
    request<{ verification_token: string }>('/auth/verify/check', { method: 'POST', body: { phone, code } }),
  resetByPhone: (verificationToken: string, newPassword: string) =>
    request<{ ok: boolean }>('/auth/reset-by-phone', {
      method: 'POST',
      body: { verification_token: verificationToken, new_password: newPassword },
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }),
  me: (token: string) => request<AppUser>('/auth/me', { token }),
  forgot: (email: string) => request<{ ok: boolean }>('/auth/forgot', { method: 'POST', body: { email } }),
  reset: (token: string, newPassword: string) =>
    request<{ ok: boolean }>('/auth/reset', { method: 'POST', body: { token, new_password: newPassword } }),
  adminListUsers: (token: string) => request<AppUser[]>('/admin/users', { token }),
  adminPatchUser: (token: string, id: string, patch: { role?: AppRole; disabled?: boolean; phone?: string }) =>
    request<AppUser>(`/admin/users/${id}`, { method: 'PATCH', body: patch, token }),
  adminDeleteUser: (token: string, id: string) =>
    request<{ ok: boolean }>(`/admin/users/${id}`, { method: 'DELETE', token }),
  adminCreateUser: (token: string, body: { email: string; display_name: string; role: AppRole; phone?: string }) =>
    request<{ user: AppUser; invite_link: string; sms_sent: boolean }>('/admin/users', { method: 'POST', body, token }),
  adminListRequests: (token: string) => request<AccountRequestRow[]>('/admin/requests', { token }),
  listPosts: (token: string) => request<PostRow[]>('/posts', { token }),
  createPost: (token: string, body: string, vis: 'public' | 'org') =>
    request<PostRow>('/posts', { method: 'POST', body: { body, vis }, token }),
  likePost: (token: string, id: string) =>
    request<{ liked: boolean; likes: number }>(`/posts/${id}/like`, { method: 'POST', token }),
  deletePost: (token: string, id: string) =>
    request<{ ok: boolean }>(`/posts/${id}`, { method: 'DELETE', token }),
  listContacts: (token: string) => request<ContactsResponse>('/contacts', { token }),
  addContact: (token: string, identifier: string) =>
    request<ContactRow>('/contacts', { method: 'POST', body: { identifier }, token }),
  acceptContact: (token: string, id: string) =>
    request<ContactRow>(`/contacts/${id}/accept`, { method: 'POST', token }),
  removeContact: (token: string, id: string) =>
    request<{ ok: boolean }>(`/contacts/${id}`, { method: 'DELETE', token }),
  adminGetSettings: (token: string) => request<AppSettings>('/admin/settings', { token }),
  adminPatchSettings: (token: string, patch: Partial<Record<'signup_mode' | 'phone_verification' | 'twilio_account_sid' | 'twilio_auth_token' | 'twilio_verify_sid' | 'twilio_sms_from' | 'smtp_host' | 'smtp_port' | 'smtp_user' | 'smtp_password' | 'smtp_from', string>>) =>
    request<AppSettings>('/admin/settings', { method: 'PATCH', body: patch, token }),
  adminApproveRequest: (token: string, id: string) =>
    request<{ user: AppUser; invite_link: string; sms_sent: boolean }>(`/admin/requests/${id}/approve`, { method: 'POST', token }),
  adminRejectRequest: (token: string, id: string) =>
    request<{ ok: boolean }>(`/admin/requests/${id}`, { method: 'DELETE', token }),
};
