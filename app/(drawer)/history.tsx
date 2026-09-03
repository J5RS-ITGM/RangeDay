import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { RunCard } from '@/components/Runs';
import { Card, Digits, Empty, Muted, Note, NoteStrong, Pill, Row, Screen, SectionHead, Segmented, Strong } from '@/components/UI';
import { avg } from '@/lib/scoring';
import { sessionGroups } from '@/lib/sessions';
import { useStore } from '@/store/MockStore';

export default function History() {
  const router = useRouter();
  const { state, myRuns, toggleCompare, setHistTab } = useStore();
  const tab = state.histTab;
  const runs = myRuns();
  const groups = sessionGroups(runs);
  const cmpReady = state.cmpSel.length === 2;

  return (
    <Screen>
      <SectionHead title="Run History" right={cmpReady ? <Pill title="Compare ▸" onPress={() => router.push({ pathname: '/compare', params: { from: 'history' } })} /> : undefined} />
      <Note>Tap two cards to select them, then hit <NoteStrong>Compare</NoteStrong>. Sessions group every run you logged inside them.</Note>
      <Segmented options={[{ key: 'runs', label: 'Runs' }, { key: 'sessions', label: 'Sessions' }]} value={tab} onChange={setHistTab} />
      {tab === 'runs'
        ? (runs.length ? runs.map((r) => <RunCard key={r.id} run={r} selectable selected={state.cmpSel.includes(r.id)} onPress={() => toggleCompare(r.id)} />) : <Empty>No runs logged yet.</Empty>)
        : (groups.length ? groups.map((g) => {
            const scored = g.runs.filter((r) => r.status === 'scored');
            return (
              <Card key={g.key} onPress={() => toggleCompare(g.key)} selected={state.cmpSel.includes(g.key)}>
                <Row>
                  <View style={{ flex: 1 }}>
                    <Strong>{g.name}</Strong>
                    <Muted style={{ fontSize: 11 }}>{g.date} · {g.runs.length} run{g.runs.length > 1 ? 's' : ''}</Muted>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Digits style={{ fontWeight: '700' }}>{scored.length ? avg(scored.map((r) => r.hf)).toFixed(2) : '—'}</Digits>
                    <Pill title="Stats ▸" quiet onPress={() => router.push({ pathname: '/scoped', params: { type: 'sess', key: g.key, name: `${g.name} · ${g.date}` } })} />
                  </View>
                </Row>
              </Card>
            );
          }) : <Empty>No session runs yet — start a session and shoot it.</Empty>)}
    </Screen>
  );
}
