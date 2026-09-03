import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { BackLink, Button, Field, Hint, Screen, SectionTitle } from '@/components/UI';
import { useTheme } from '@/theme/ThemeContext';

export default function ForgotPassword() {
  const router = useRouter();
  const { theme } = useTheme();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim()) { setError('Enter your account email'); return; }
    setBusy(true);
    const e = await requestPasswordReset(email);
    setBusy(false);
    if (e) { setError(e); return; }
    setSent(true);
  };

  return (
    <Screen style={{ paddingTop: 40 }}>
      <BackLink title="Back to sign in" onPress={() => router.back()} />
      <SectionTitle>Reset your password</SectionTitle>
      {sent ? (
        <Hint>
          If an account exists for that address, a reset link is on its way. Open it on this device — it brings you back here to set a new password. The link expires after a short time.
        </Hint>
      ) : (
        <>
          <Hint>Enter your account email and we'll send a reset link.</Hint>
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          {error ? <Text style={{ color: theme.miss, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>{error}</Text> : null}
          <Button title={busy ? 'Sending…' : 'Send reset link'} onPress={busy ? () => {} : submit} />
        </>
      )}
    </Screen>
  );
}
