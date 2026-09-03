import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text } from 'react-native';
import { BackLink, Button, Field, Hint, Screen, SectionTitle } from '@/components/UI';
import { api } from '@/lib/api';
import { useTheme } from '@/theme/ThemeContext';

/** Public: ask an admin for an account (used when registration is invite-only). */
export default function RequestAccount() {
  const router = useRouter();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim()) { setError('Enter your email'); return; }
    setBusy(true);
    try {
      await api.requestAccount(email, name, note);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    }
    setBusy(false);
  };

  return (
    <Screen style={{ paddingTop: 40 }}>
      <BackLink title="Back to sign in" onPress={() => router.back()} />
      <SectionTitle>Request an account</SectionTitle>
      {sent ? (
        <Hint>
          Request sent. An admin will review it — if approved, you'll receive a link to set your password. You can close this page.
        </Hint>
      ) : (
        <>
          <Hint>Registration is invite-only. Tell us who you are and an admin will review your request.</Hint>
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
          <Field label="Note (optional)" value={note} onChangeText={setNote} multiline placeholder="Club, referral, why you'd like access…" />
          {error ? <Text style={{ color: theme.miss, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>{error}</Text> : null}
          <Button title={busy ? 'Sending…' : 'Send request'} onPress={busy ? () => {} : submit} />
        </>
      )}
    </Screen>
  );
}
