import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError, AppUser, isDemo } from '@/lib/api';

/**
 * Auth state for the whole app, backed by the self-hosted FastAPI backend.
 * - demo mode (EXPO_PUBLIC_DEMO=1): no gate, mock roles apply.
 * - otherwise: no token/session → the AuthGate sends you to /login.
 * Server-side checks are the real enforcement; this only decides rendering.
 */

const TOKEN_KEY = 'rangeday.auth.token.v1';

interface AuthValue {
  configured: boolean;
  loading: boolean;
  session: boolean;
  token: string | null;
  appUser: AppUser | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, displayName: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string | null>;
  resetPassword: (token: string, newPassword: string) => Promise<string | null>;
  refreshAppUser: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(!isDemo);
  const [token, setToken] = useState<string | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);

  // Restore the saved session and validate it against the server.
  useEffect(() => {
    if (isDemo) return;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(TOKEN_KEY);
        if (saved) {
          const user = await api.me(saved);
          setToken(saved);
          setAppUser(user);
        }
      } catch (e) {
        // 401/403 → stale or disabled; network error → stay logged out for now
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          await AsyncStorage.removeItem(TOKEN_KEY);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const acceptAuth = useCallback(async (accessToken: string, user: AppUser) => {
    await AsyncStorage.setItem(TOKEN_KEY, accessToken);
    setToken(accessToken);
    setAppUser(user);
  }, []);

  const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

  const value = useMemo<AuthValue>(
    () => ({
      configured: !isDemo,
      loading,
      session: !!token,
      token,
      appUser,
      isAdmin: !!appUser && appUser.role === 'admin' && !appUser.disabled,
      signIn: async (email, password) => {
        try {
          const r = await api.login(email, password);
          await acceptAuth(r.access_token, r.user);
          return null;
        } catch (e) { return errMsg(e); }
      },
      signUp: async (email, password, displayName) => {
        try {
          const r = await api.signup(email, password, displayName);
          await acceptAuth(r.access_token, r.user);
          return null;
        } catch (e) { return errMsg(e); }
      },
      signOut: async () => {
        await AsyncStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setAppUser(null);
      },
      requestPasswordReset: async (email) => {
        try { await api.forgot(email); return null; } catch (e) { return errMsg(e); }
      },
      resetPassword: async (resetToken, newPassword) => {
        try { await api.reset(resetToken, newPassword); return null; } catch (e) { return errMsg(e); }
      },
      refreshAppUser: async () => {
        if (!token) return;
        try { setAppUser(await api.me(token)); } catch { /* keep old */ }
      },
    }),
    [loading, token, appUser, acceptAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
