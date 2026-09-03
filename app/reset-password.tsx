import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { Button, Field, Hint, Screen, SectionTitle } from '@/components/UI';
import { useToast } from '@/components/Toast';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Landing page for the email reset link:
 * https://range.jwbegroup.com/reset-password?token=...
 * The token is single-use and expires 30 minutes after it was requested.
 */
export default function ResetPassword() {
  const router = useRouter();
  const { theme } = useTheme();
  const toast = useToast();
  const { resetPassword } = useAuth();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!token) return;
    if (pw1.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (pw1 !== pw2) { setError('Passwords do not match'); return; }
    setBusy(true);
    const e = await resetPassword(token, pw1);
    setBusy(false);
    if (e) { setError(e); return; }
    toast('Password updated — sign in with it now');
    router.replace('/login');
  };

  return (
    <Screen style={{ paddingTop: 40 }}>
      <SectionTitle>Set a new password</SectionTitle>
      {!token ? (
        <Hint style={{ color: theme.charlie }}>
          This page needs to be opened from the reset link in your email. Request a link from the sign-in screen if you need one.
        </Hint>
      ) : (
        <>
          <Field label="New password" value={pw1} onChangeText={setPw1} placeholder="At least 8 characters" secureTextEntry autoComplete="new-password" />
          <Field label="Confirm new password" value={pw2} onChangeText={setPw2} secureTextEntry autoComplete="new-password" />
          {error ? <Text style={{ color: theme.miss, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>{error}</Text> : null}
          <Button title={busy ? 'Saving…' : 'Save new password'} onPress={busy ? () => {} : submit} />
        </>
      )}
      <Button title="Back to sign in" variant="ghost" onPress={() => router.replace('/login')} />
    </Screen>
  );
}
