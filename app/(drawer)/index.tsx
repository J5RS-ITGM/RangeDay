import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChecklistIcon, ShieldIcon, TargetIcon } from '@/components/Icons';
import { RunCard } from '@/components/Runs';
import { Empty, Hint, Pill, Row, Screen, SectionTitle, StatGrid, SubTitle } from '@/components/UI';
import { useStore } from '@/store/MockStore';
import { useTheme } from '@/theme/ThemeContext';
import { FONTS, RADII, SPACING } from '@/theme/tokens';

function Quick({ label, Icon, onPress }: { label: string; Icon: typeof TargetIcon; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', borderRadius: RADII.card,
        borderWidth: 1, borderColor: theme.line, backgroundColor: pressed ? theme.surface2 : theme.surface,
      })}
    >
      <Icon color={theme.ink} size={24} />
      <Text style={{ fontFamily: FONTS.display, fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', color: theme.ink, marginTop: 7 }}>{label}</Text>
    </Pressable>
  );
}

export default function Home() {
  const router = useRouter();
  const { prof, myRuns, state, toggleCompare, setHistTab } = useStore();
  const mine = myRuns();
  const scored = mine.filter((r) => r.status === 'scored');
  const hits = mine.reduce((s, r) => s + r.rounds, 0);
  const alphas = mine.reduce((s, r) => s + (r.alphaCount || 0), 0);
  const cmpReady = state.cmpSel.length === 2 && state.histTab === 'runs';

  return (
    <Screen>
      <SectionTitle>Dashboard</SectionTitle>
      <StatGrid
        stats={[
          { value: String(mine.length), label: 'Runs logged' },
          { value: scored.length ? Math.max(...scored.map((r) => r.hf)).toFixed(2) : '—', label: 'Best hit factor' },
          { value: String(hits), label: 'Rounds fired' },
          { value: hits ? Math.round((alphas / hits) * 100) + '%' : '0%', label: 'Alpha rate' },
        ]}
      />
      <SubTitle style={{ marginTop: 0 }}>Quick actions</SubTitle>
      <View style={{ flexDirection: 'row', gap: SPACING.gap, marginBottom: 6 }}>
        <Quick label="Start session" Icon={ChecklistIcon} onPress={() => router.navigate('/sessions')} />
        <Quick label="Score a run" Icon={TargetIcon} onPress={() => router.navigate('/drills')} />
        <Quick label="Armory" Icon={ShieldIcon} onPress={() => router.navigate('/armory')} />
      </View>
      <Row>
        <SubTitle>Recent runs</SubTitle>
        {cmpReady ? <Pill title="Compare ▸" onPress={() => router.push({ pathname: '/compare', params: { from: 'home' } })} /> : null}
      </Row>
      <Hint style={{ marginTop: 0 }}>Tap two runs to compare them.</Hint>
      {mine.length ? (
        mine.slice(0, 5).map((r) => (
          <RunCard
            key={r.id}
            run={r}
            selectable
            selected={state.cmpSel.includes(r.id)}
            onPress={() => { setHistTab('runs'); toggleCompare(r.id); }}
          />
        ))
      ) : (
        <Empty>No runs for {prof.name} yet — start a session or score a drill.</Empty>
      )}
    </Screen>
  );
}
