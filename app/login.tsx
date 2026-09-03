import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { Button, Field, Hint, Screen, SectionTitle } from '@/components/UI';
import { useToast } from '@/components/Toast';
import { useTheme } from '@/theme/ThemeContext';
import { FONTS, RADII } from '@/theme/tokens';

export default function Login() {
  const router = useRouter();
  const { theme } = useTheme();
  const toast = useToast();
  const { configured, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) { setError('Enter your email and password'); return; }
    if (mode === 'signup' && password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setBusy(true);
    const e = mode === 'signin' ? await signIn(email, password) : await signUp(email, password, name || email.split('@')[0]);
    setBusy(false);
    if (e) { setError(e); return; }
    if (mode === 'signup') toast('Account created — check your email if confirmation is required');
    router.replace('/');
  };

  return (
    <Screen style={{ paddingTop: 60 }}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ fontFamily: FONTS.displayBold, fontSize: 32, letterSpacing: 3, color: theme.ink }}>
          RANGE<Text style={{ color: theme.accent }}>·</Text>DAY
        </Text>
        <Text style={{ fontFamily: FONTS.display, fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: theme.muted, marginTop: 2 }}>
          Training Companion
        </Text>
      </View>

      <SectionTitle>{mode === 'signin' ? 'Sign in' : 'Create your account'}</SectionTitle>

      {!configured && (
        <Hint style={{ color: theme.charlie }}>
          Demo build (EXPO_PUBLIC_DEMO=1) — auth is bypassed and data is mock. Production builds are locked behind sign-in.
        </Hint>
      )}

      {mode === 'signup' && <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />}
      <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label="Password" value={password} onChangeText={setPassword} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} secureTextEntry autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />

      {error ? <Text style={{ color: theme.miss, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>{error}</Text> : null}

      {configured ? (
        <Button title={busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'} onPress={busy ? () => {} : submit} />
      ) : (
        <Button title="Continue in demo mode" onPress={() => router.replace('/')} />
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
        <Pressable onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }} hitSlop={8}>
          <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600' }}>
            {mode === 'signin' ? 'Create an account' : 'Have an account? Sign in'}
          </Text>
        </Pressable>
        {mode === 'signin' && configured && (
          <Pressable onPress={() => router.push('/forgot-password')} hitSlop={8}>
            <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '600' }}>Forgot password?</Text>
          </Pressable>
        )}
      </View>

      <View style={{ marginTop: 40, padding: 12, borderRadius: RADII.card, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.line }}>
        <Text style={{ color: theme.muted, fontSize: 11, lineHeight: 17 }}>
          Access is account-based. Data visibility is enforced by row-level security on the server, not by this screen.
        </Text>
      </View>
    </Screen>
  );
}
