import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { PhoneVerify } from '@/components/PhoneVerify';
import { useToast } from '@/components/Toast';
import { BackLink, Button, Field, Hint, Screen, SectionTitle, Segmented } from '@/components/UI';
import { api } from '@/lib/api';
import { useTheme } from '@/theme/ThemeContext';

export default function ForgotPassword() {
  const router = useRouter();
  const { theme } = useTheme();
  const toast = useToast();
  const { requestPasswordReset } = useAuth();
  const [method, setMethod] = useState<'email' | 'sms'>('email');

  // email path
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  // sms path: verify phone → set new password right here
  const [smsToken, setSmsToken] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendEmail = async () => {
    setError(null);
    if (!email.trim()) { setError('Enter your account email'); return; }
    setBusy(true);
    const e = await requestPasswordReset(email);
    setBusy(false);
    if (e) { setError(e); return; }
    setSent(true);
  };

  const smsReset = async () => {
    setError(null);
    if (pw1.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (pw1 !== pw2) { setError('Passwords do not match'); return; }
    setBusy(true);
    try {
      await api.resetByPhone(smsToken, pw1);
      toast('Password updated — sign in with it now');
      router.replace('/login');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed');
    }
    setBusy(false);
  };

  return (
    <Screen style={{ paddingTop: 40 }}>
      <BackLink title="Back to sign in" onPress={() => router.back()} />
      <SectionTitle>Reset your password</SectionTitle>
      <Segmented
        options={[{ key: 'email', label: 'Email link' }, { key: 'sms', label: 'Text me a code' }]}
        value={method}
        onChange={(m) => { setMethod(m); setError(null); }}
      />

      {method === 'email' ? (
        sent ? (
          <Hint>
            If an account exists for that address, a reset link is on its way. Open it on this device — it brings you back here to set a new password. The link expires after a short time.
          </Hint>
        ) : (
          <>
            <Hint>Enter your account email and we will send a reset link.</Hint>
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
            {error ? <Text style={{ color: theme.miss, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>{error}</Text> : null}
            <Button title={busy ? 'Sending…' : 'Send reset link'} onPress={busy ? () => {} : sendEmail} />
          </>
        )
      ) : (
        <>
          <Hint>Verify the mobile number on your account, then set a new password.</Hint>
          <PhoneVerify onVerified={(_p, t) => setSmsToken(t)} />
          {smsToken ? (
            <>
              <Field label="New password" value={pw1} onChangeText={setPw1} placeholder="At least 8 characters" secureTextEntry autoComplete="new-password" />
              <Field label="Confirm new password" value={pw2} onChangeText={setPw2} secureTextEntry autoComplete="new-password" />
              {error ? <Text style={{ color: theme.miss, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>{error}</Text> : null}
              <Button title={busy ? 'Saving…' : 'Save new password'} onPress={busy ? () => {} : smsReset} />
            </>
          ) : error ? (
            <Text style={{ color: theme.miss, fontSize: 13, fontWeight: '600' }}>{error}</Text>
          ) : null}
        </>
      )}
    </Screen>
  );
}
