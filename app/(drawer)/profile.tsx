import React from 'react';
import { ComingSoon, Screen, SectionTitle } from '@/components/UI';

export default function Profile() {
  return (
    <Screen>
      <SectionTitle>Profile</SectionTitle>
      <ComingSoon milestone="M1 — Auth & profiles" note="Account details, the two-profiles-per-account model, and the shooter switcher arrive with Supabase Auth." />
    </Screen>
  );
}
