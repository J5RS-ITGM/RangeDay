import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { AppUser, isSupabaseConfigured, supabase } from '@/lib/supabase';

/**
 * Auth state for the whole app.
 * - configured=false → demo mode: no gate, mock roles apply.
 * - configured=true  → the app is locked: no session, no app.
 * The user's role comes from public.app_users; RLS on the server is
 * the real enforcement — this context only decides what to render.
 */

interface AuthValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  appUser: AppUser | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, displayName: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string | null>;
  updatePassword: (newPassword: string) => Promise<string | null>;
  refreshAppUser: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

const RESET_REDIRECT =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? `${window.location.origin}/reset-password`
    : 'https://range.jwbegroup.com/reset-password';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);

  const fetchAppUser = useCallback(async (uid: string | undefined) => {
    if (!supabase || !uid) { setAppUser(null); return; }
    const { data } = await supabase.from('app_users').select('*').eq('id', uid).single();
    setAppUser((data as AppUser) ?? null);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      fetchAppUser(data.session?.user.id).finally(() => setLoading(false));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      fetchAppUser(s?.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [fetchAppUser]);

  const err = (e: { message?: string } | null): string | null => (e ? e.message ?? 'Something went wrong' : null);

  const value = useMemo<AuthValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      session,
      appUser,
      isAdmin: !!appUser && appUser.role === 'admin' && !appUser.disabled,
      signIn: async (email, password) => {
        if (!supabase) return 'Auth is not configured';
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        return err(error);
      },
      signUp: async (email, password, displayName) => {
        if (!supabase) return 'Auth is not configured';
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        return err(error);
      },
      signOut: async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        setAppUser(null);
      },
      requestPasswordReset: async (email) => {
        if (!supabase) return 'Auth is not configured';
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: RESET_REDIRECT });
        return err(error);
      },
      updatePassword: async (newPassword) => {
        if (!supabase) return 'Auth is not configured';
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        return err(error);
      },
      refreshAppUser: async () => fetchAppUser(session?.user.id),
    }),
    [loading, session, appUser, fetchAppUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
