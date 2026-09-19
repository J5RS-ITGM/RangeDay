import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { usePending } from '@/contacts/PendingContext';
import { useToast } from '@/components/Toast';
import { BackLink, Button, Hint, Screen, SectionTitle } from '@/components/UI';
import { api } from '@/lib/api';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Landing page for the "Review & accept" link in a connection-request
 * email. Needs a signed-in session; if absent, sends them to log in and
 * returns here. Once signed in, shows Accept/Decline for that request.
 */
export default function AcceptContact() {
  const router = useRouter();
  const { theme } = useTheme();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { configured, token, loading } = useAuth();
  const { refresh } = usePending();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const redirected = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (configured && !token && !redirected.current) {
      redirected.current = true;
      router.replace({ pathname: '/login', params: { next: `/accept-contact?id=${id}` } });
    }
  }, [loading, configured, token, id, router]);

  const act = async (accept: boolean) => {
    if (!token || !id || busy) return;
    setBusy(true);
    try {
      if (accept) await api.acceptContact(token, id);
      else await api.removeContact(token, id);
      await refresh();
      setDone(accept ? 'Connected! You can now find them in Contacts.' : 'Request declined.');
    } catch (e) {
      setDone(e instanceof Error ? e.message : 'Could not complete that.');
    }
    setBusy(false);
  };

  if (loading || (configured && !token)) {
    return <Screen style={{ paddingTop: 60, alignItems: 'center' }}><ActivityIndicator color={theme.accent} /></Screen>;
  }

  return (
    <Screen style={{ paddingTop: 40 }}>
      <BackLink title="Go to app" onPress={() => router.replace('/contacts')} />
      <SectionTitle>Connection request</SectionTitle>
      {done ? (
        <>
          <Hint>{done}</Hint>
          <Button title="Open Contacts" onPress={() => router.replace('/contacts')} />
        </>
      ) : (
        <>
          <Hint>Someone wants to connect with you on Range Day. Accept to connect both ways, or decline.</Hint>
          <Button title={busy ? 'Working…' : 'Accept'} onPress={() => act(true)} />
          <View style={{ height: 8 }} />
          <Text onPress={() => act(false)} style={{ color: theme.muted, textAlign: 'center', fontSize: 14, fontWeight: '600', paddingVertical: 8 }}>
            Decline
          </Text>
        </>
      )}
    </Screen>
  );
}
