import React from 'react';
import { ComingSoon, Screen, SectionTitle } from '@/components/UI';

export default function Admin() {
  return (
    <Screen>
      <SectionTitle>Moderation</SectionTitle>
      <ComingSoon milestone="M5 — Community & moderation" note="Drill submission review and instructor application approval, for admin accounts only." />
    </Screen>
  );
}
