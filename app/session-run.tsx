import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { BackLink, Card, Digits, Muted, Pill, Row, Screen, SectionTitle, Strong } from '@/components/UI';
import { useStore } from '@/store/MockStore';
import { useTheme } from '@/theme/ThemeContext';
import { RADII } from '@/theme/tokens';

/** The at-the-range checklist: run each drill, check it off, finish. */
export default function SessionRun() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { state, drillById } = useStore();
  const s = state.db.sessions.find((x) => x.id === id);
  const active = state.activeSess?.id === id ? state.activeSess : null;

  if (!s) return <Screen><BackLink title="All sessions" onPress={() => router.back()} /><Muted>Session not found.</Muted></Screen>;

  const n = s.drills.length;
  const doneMap = active?.done ?? {};
  const done = Object.keys(doneMap).length;
  const complete = n > 0 && done === n;
  const latest = state.db.runs.find((r) => r.sessKey && r.sessKey.startsWith(s.id + '|'));

  return (
    <Screen>
      <BackLink title="All sessions" onPress={() => router.navigate('/sessions')} />
      <SectionTitle>{s.name}</SectionTitle>
      <Card>
        <Row>
          <Strong style={{ fontSize: 14, fontWeight: '600' }}>{done} of {n} drills complete</Strong>
          <Digits style={{ fontWeight: '700' }}>{n ? Math.round((done / n) * 100) : 0}%</Digits>
        </Row>
        <View style={{ height: 6, backgroundColor: theme.surface2, borderRadius: RADII.bar, marginTop: 10, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${n ? (done / n) * 100 : 0}%`, backgroundColor: theme.accent }} />
        </View>
      </Card>
      {s.note ? <Card><Muted style={{ fontSize: 13, lineHeight: 20, marginTop: 0 }}>{s.note}</Muted></Card> : null}
      {complete && latest && (
        <Card style={{ borderColor: theme.alpha }}>
          <Row>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.alpha, fontWeight: '700' }}>Session complete</Text>
              <Muted style={{ fontSize: 11 }}>Every drill checked off — nice work.</Muted>
            </View>
            <Pill title="Session analytics ▸" onPress={() => router.push({ pathname: '/scoped', params: { type: 'sess', key: latest.sessKey!, name: `${latest.sessName} · ${latest.date}` } })} />
          </Row>
        </Card>
      )}
      {s.drills.map((did) => {
        const d = drillById(did);
        if (!d) return null;
        const isDone = !!doneMap[did];
        return (
          <View key={did} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line, borderRadius: RADII.card, marginBottom: 8 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: isDone ? theme.alpha : theme.line, backgroundColor: isDone ? theme.alpha : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {isDone ? <Text style={{ color: '#fff', fontSize: 13 }}>✓</Text> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Strong style={{ fontSize: 14, fontWeight: '600', color: isDone ? theme.muted : theme.ink, textDecorationLine: isDone ? 'line-through' : 'none' }}>{d.name}</Strong>
              <Muted style={{ fontSize: 11.5 }}>{d.disc} · {d.meta}</Muted>
            </View>
            {!isDone && <Pill title="Run ▸" onPress={() => router.push({ pathname: '/score', params: { drillId: d.id, sessId: s.id } })} />}
          </View>
        );
      })}
    </Screen>
  );
}
