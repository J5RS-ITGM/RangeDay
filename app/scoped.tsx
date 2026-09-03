import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { RunCard, StatsBlock } from '@/components/Runs';
import { BackLink, Empty, Screen, SectionTitle, SubTitle } from '@/components/UI';
import { useStore } from '@/store/MockStore';

/** Scoped stats: every run of one drill, or every run inside one session instance */
export default function Scoped() {
  const router = useRouter();
  const { type, key, name } = useLocalSearchParams<{ type: 'drill' | 'sess'; key?: string; name: string }>();
  const { myRuns } = useStore();
  const all = myRuns();
  const runs = type === 'drill' ? all.filter((r) => r.name === name) : all.filter((r) => r.sessKey === key);

  return (
    <Screen>
      <BackLink title="Back" onPress={() => router.back()} />
      <SectionTitle>{name}</SectionTitle>
      {runs.length ? (
        <>
          <StatsBlock runs={runs} />
          <SubTitle>Runs</SubTitle>
          {runs.map((r) => <RunCard key={r.id} run={r} />)}
        </>
      ) : <Empty>No runs recorded for this yet.</Empty>}
    </Screen>
  );
}
