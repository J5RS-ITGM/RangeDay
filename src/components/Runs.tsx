import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { FONTS, RADII, READOUT } from '@/theme/tokens';
import { Run } from '@/store/types';
import { avg } from '@/lib/scoring';
import { Card, Digits, Muted, Row, StatGrid, Strong } from './UI';

/** Compact run summary, optionally selectable for compare */
export function RunCard({ run, selectable, selected, onPress }: { run: Run; selectable?: boolean; selected?: boolean; onPress?: () => void }) {
  const { theme } = useTheme();
  const badge =
    run.status === 'DQ' ? <Text style={{ color: theme.miss, fontWeight: '700' }}>DQ</Text>
    : run.status === 'DNF' ? <Text style={{ color: theme.charlie, fontWeight: '700' }}>DNF</Text>
    : <Digits style={{ fontWeight: '700' }}>{run.hf.toFixed(2)} HF</Digits>;
  return (
    <Card onPress={selectable ? onPress : undefined} selected={selected}>
      <Row>
        <Strong style={{ fontSize: 14, fontWeight: '600' }}>{run.name}</Strong>
        {badge}
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 5 }}>
        <Muted style={{ marginTop: 0 }}>{run.time ? run.time.toFixed(2) + 's' : '—'}</Muted>
        <Muted style={{ marginTop: 0 }}>{run.breakdown}</Muted>
        {run.penalties ? <Text style={{ color: theme.miss, fontSize: 12, fontWeight: '700' }}>{run.penalties}</Text> : null}
        {run.sessName ? <Muted style={{ marginTop: 0 }}>{run.sessName}</Muted> : null}
        <Muted style={{ marginTop: 0 }}>{run.gun}</Muted>
        <Muted style={{ marginTop: 0 }}>{run.date}</Muted>
      </View>
    </Card>
  );
}

/** Labeled HF bar chart: value on top, date below, newest highlighted */
export function HfChart({ scoredNewestFirst, caption }: { scoredNewestFirst: Run[]; caption?: string }) {
  const { theme } = useTheme();
  const trend = scoredNewestFirst.slice(0, 8).reverse();
  if (trend.length < 2) return null;
  const maxHF = Math.max(...trend.map((r) => r.hf), 0.01);
  const mean = avg(trend.map((r) => r.hf));
  return (
    <View>
      <View style={[styles.bars, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        {trend.map((r, i) => {
          const last = i === trend.length - 1;
          return (
            <View key={r.id} style={styles.bcol}>
              <Text style={{ fontFamily: FONTS.digits, fontSize: 10, color: last ? theme.accent : theme.muted }}>{r.hf.toFixed(1)}</Text>
              <View style={styles.bstage}>
                <View
                  style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: `${Math.max(4, Math.round((r.hf / maxHF) * 100))}%`,
                    backgroundColor: theme.accent, opacity: last ? 1 : 0.55,
                    borderTopLeftRadius: RADII.bar, borderTopRightRadius: RADII.bar,
                  }}
                />
              </View>
              <Text style={{ fontFamily: FONTS.display, fontSize: 9, letterSpacing: 0.6, color: theme.muted }}>
                {(r.date || '').split(' ')[1] || r.date}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={{ fontFamily: FONTS.display, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: theme.muted, marginTop: 6, marginBottom: 16, marginHorizontal: 2 }}>
        {caption || 'Hit factor'} · last {trend.length} scored runs · avg {mean.toFixed(2)}
      </Text>
    </View>
  );
}

/** Stat grid + HF chart for a set of runs (drill scope or session scope) */
export function StatsBlock({ runs }: { runs: Run[] }) {
  const scored = runs.filter((r) => r.status === 'scored');
  const hfs = scored.map((r) => r.hf);
  const hits = runs.reduce((s, r) => s + r.rounds, 0);
  const alphaPct = hits ? Math.round((runs.reduce((s, r) => s + (r.alphaCount || 0), 0) / hits) * 100) : 0;
  return (
    <View>
      <StatGrid
        stats={[
          { value: String(runs.length), label: 'Runs' },
          { value: hfs.length ? avg(hfs).toFixed(2) : '—', label: 'Avg HF' },
          { value: hfs.length ? Math.max(...hfs).toFixed(2) : '—', label: 'Best HF' },
          { value: `${alphaPct}%`, label: 'Alpha rate' },
        ]}
      />
      <HfChart scoredNewestFirst={scored} />
    </View>
  );
}

/**
 * The hit-factor readout is a shot timer: always a dark LED panel,
 * even in the light theme. Signature element of the scoring screen.
 */
export function Readout({ hf, pts, rounds, voidTag }: { hf: number; pts: number; rounds: number; voidTag?: string }) {
  const isVoid = !!voidTag;
  return (
    <View style={[styles.readout, isVoid && { opacity: 0.75 }]}>
      <Text style={[styles.hf, isVoid && { color: READOUT.voidDigits, textShadowColor: 'transparent' }]}>{hf.toFixed(2)}</Text>
      <Text style={styles.hfLabel}>HIT FACTOR</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 12 }}>
        <Text style={styles.sub}>Points <Text style={styles.subVal}>{pts}</Text></Text>
        <Text style={styles.sub}>Rounds <Text style={styles.subVal}>{rounds}</Text></Text>
      </View>
      {isVoid ? <Text style={styles.voidTag}>{voidTag}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'stretch', gap: 6, height: 158, paddingTop: 12, paddingHorizontal: 12, paddingBottom: 8, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: RADII.card },
  bcol: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4 },
  bstage: { flex: 1, width: '100%', position: 'relative' },
  readout: {
    backgroundColor: READOUT.bg, borderColor: READOUT.line, borderWidth: 1, borderRadius: RADII.card,
    padding: 16, marginTop: 4, marginBottom: 16, alignItems: 'center',
  },
  hf: { fontFamily: FONTS.digits, fontSize: 46, lineHeight: 50, color: READOUT.digits, textShadowColor: 'rgba(255,176,59,0.4)', textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } },
  hfLabel: { fontFamily: FONTS.display, fontSize: 12, letterSpacing: 3, color: READOUT.label, marginTop: 4 },
  sub: { fontFamily: FONTS.digits, fontSize: 12, color: READOUT.sub },
  subVal: { color: READOUT.digits },
  voidTag: { marginTop: 8, fontFamily: FONTS.display, fontSize: 11, letterSpacing: 2, color: READOUT.voidTag },
});
