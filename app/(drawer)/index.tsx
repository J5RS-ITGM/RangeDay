import React from 'react';
import { View } from 'react-native';
import { ComingSoon, Screen, SectionTitle, Stat, SubTitle } from '@/components/UI';
import { SPACING } from '@/theme/tokens';

export default function Home() {
  // TODO(M2): wire to local SQLite run store for the active profile.
  return (
    <Screen>
      <SectionTitle>Dashboard</SectionTitle>
      <View style={{ gap: SPACING.gap }}>
        <View style={{ flexDirection: 'row', gap: SPACING.gap }}>
          <Stat value="0" label="Runs logged" />
          <Stat value="—" label="Best hit factor" />
        </View>
        <View style={{ flexDirection: 'row', gap: SPACING.gap }}>
          <Stat value="0" label="Rounds fired" />
          <Stat value="0%" label="Alpha rate" />
        </View>
      </View>
      <SubTitle>Recent runs</SubTitle>
      <ComingSoon
        milestone="M2 — Core loop"
        note="Run cards, quick actions, and tap-to-compare land with the scoring screen and local run store."
      />
    </Screen>
  );
}
