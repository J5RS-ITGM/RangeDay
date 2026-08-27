import React from 'react';
import { ComingSoon, Screen, SectionTitle } from '@/components/UI';

export default function Armory() {
  return (
    <Screen>
      <SectionTitle>Armory</SectionTitle>
      <ComingSoon milestone="M4 — Armory" note="Firearms, equipment, and maintenance logs with automatic round-count tracking and service-interval alerts." />
    </Screen>
  );
}
