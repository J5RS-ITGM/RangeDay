import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Field, Pill } from '@/components/UI';
import { api } from '@/lib/api';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Two-step phone verification: send code → check code → hand the
 * verification token up. Backend enforces everything; this is just UI.
 */
export function PhoneVerify({ onVerified }: { onVerified: (phone: string, token: string) => void }) {
  const { theme } = useTheme();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'code' | 'done'>('phone');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const send = async () => {
    setError(null);
    setBusy(true);
    try {
      const r = await api.verifyStart(phone);
      setSentTo(r.phone);
      setStage('code');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the code');
    }
    setBusy(false);
  };

  const check = async () => {
    setError(null);
    setBusy(true);
    try {
      const r = await api.verifyCheck(sentTo, code.trim());
      setStage('done');
      onVerified(sentTo, r.verification_token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    }
    setBusy(false);
  };

  if (stage === 'done') {
    return (
      <Text style={{ color: theme.alpha, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>
        ✓ Phone verified — {sentTo}
      </Text>
    );
  }

  return (
    <View>
      {stage === 'phone' ? (
        <View>
          <Field label="Mobile phone" value={phone} onChangeText={setPhone} placeholder="(630) 555-0123" keyboardType="phone-pad" autoComplete="tel" />
          <Pill title={busy ? 'Sending…' : 'Text me a code'} onPress={busy ? () => {} : send} style={{ alignSelf: 'flex-start', marginBottom: 12 }} />
        </View>
      ) : (
        <View>
          <Field label={`Code sent to ${sentTo}`} value={code} onChangeText={setCode} placeholder="6-digit code" keyboardType="number-pad" autoComplete="one-time-code" />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <Pill title={busy ? 'Checking…' : 'Verify'} onPress={busy ? () => {} : check} />
            <Pill title="Resend" quiet onPress={busy ? () => {} : send} />
            <Pill title="Change number" quiet onPress={() => { setStage('phone'); setCode(''); }} />
          </View>
        </View>
      )}
      {error ? <Text style={{ color: theme.miss, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>{error}</Text> : null}
    </View>
  );
}
