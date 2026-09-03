import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

/**
 * Supabase client. Credentials come from EXPO_PUBLIC_* env vars, which
 * Expo inlines at build time (locally from .env, in Docker via build args).
 * The anon key is safe to ship — all authority lives in RLS policies.
 *
 * When the env vars are absent the app runs in demo mode (mock store,
 * no auth gate) so the deployment never bricks; setting them is what
 * locks the app down.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;

export type AppRole = 'shooter' | 'instructor_pending' | 'instructor' | 'admin';

export interface AppUser {
  id: string;
  email: string;
  display_name: string;
  role: AppRole;
  disabled: boolean;
  created_at: string;
}
