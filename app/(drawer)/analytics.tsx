import React from 'react';
import { View } from 'react-native';
import { HfChart } from '@/components/Runs';
import { Card, Digits, Empty, Muted, Row, Screen, SectionTitle, StatGrid, Strong, SubTitle } from '@/components/UI';
import { avg } from '@/lib/scoring';
import { useStore } from '@/store/MockStore';

export default function Analytics() {
  const { prof, myRuns } = useStore();
  const mine = myRuns();
  const scored = mine.filter((r) => r.status === 'scored');

  if (!mine.length) {
    return <Screen><SectionTitle>Analytics</SectionTitle><Empty>No data yet for {prof.name}.{'\n'}Run some drills and the numbers show up here.</Empty></Screen>;
  }

  const hfs = scored.map((r) => r.hf);
  const hits = mine.reduce((s, r) => s + r.rounds, 0);
  const alphaPct = hits ? Math.round((mine.reduce((s, r) => s + (r.alphaCount || 0), 0) / hits) * 100) : 0;

  const byDrill: Record<string, { n: number; best: number; times: number[] }> = {};
  scored.forEach((r) => {
    const d = (byDrill[r.name] = byDrill[r.name] || { n: 0, best: 0, times: [] });
    d.n++; d.times.push(r.time); d.best = Math.max(d.best, r.hf);
  });

  return (
    <Screen>
      <SectionTitle>Analytics</SectionTitle>
      <StatGrid stats={[
        { value: avg(hfs).toFixed(2), label: 'Avg hit factor' },
        { value: (hfs.length ? Math.max(...hfs) : 0).toFixed(2), label: 'Best hit factor' },
        { value: avg(scored.map((r) => r.time)).toFixed(2) + 's', label: 'Avg run time' },
        { value: alphaPct + '%', label: 'Alpha rate' },
      ]} />
      <HfChart scoredNewestFirst={scored} />
      <SubTitle style={{ marginTop: 0 }}>By drill</SubTitle>
      {Object.entries(byDrill).sort((a, b) => b[1].n - a[1].n).map(([name, d]) => (
        <Card key={name}>
          <Row>
            <View style={{ flex: 1 }}>
              <Strong style={{ fontSize: 14, fontWeight: '600' }}>{name}</Strong>
              <Muted>{d.n} run{d.n > 1 ? 's' : ''} · avg {avg(d.times).toFixed(2)}s</Muted>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Digits>{d.best.toFixed(2)}</Digits>
              <Muted>best HF</Muted>
            </View>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
