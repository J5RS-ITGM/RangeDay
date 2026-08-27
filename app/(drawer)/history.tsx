import React from 'react';
import { ComingSoon, Screen, SectionTitle } from '@/components/UI';

export default function History() {
  return (
    <Screen>
      <SectionTitle>Run History</SectionTitle>
      <ComingSoon milestone="M2 — Core loop" note="Every saved run, grouped by session, with tap-to-compare." />
    </Screen>
  );
}
