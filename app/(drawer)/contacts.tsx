import React from 'react';
import { ComingSoon, Screen, SectionTitle } from '@/components/UI';

export default function Contacts() {
  return (
    <Screen>
      <SectionTitle>Contacts</SectionTitle>
      <ComingSoon milestone="M1 — Auth & profiles" note="Private and org-shared contacts, filtered by Row Level Security on the server." />
    </Screen>
  );
}
