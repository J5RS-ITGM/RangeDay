import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { BackLink, Card, Empty, Screen, SectionTitle } from '@/components/UI';
import { avg } from '@/lib/scoring';
import { sessionGroups } from '@/lib/sessions';
import { useStore } from '@/store/MockStore';
import { useTheme } from '@/theme/ThemeContext';
import { FONTS } from '@/theme/tokens';

type Cell = number | string;

export default function Compare() {
  const router = useRouter();
  const { theme } = useTheme();
  const { state, myRuns } = useStore();
  const sel = state.cmpSel;

  const CmpRow = ({ lab, a, b, better, head }: { lab: string; a: Cell; b: Cell; better?: 'hi' | 'lo'; head?: boolean }) => {
    let aw = false, bw = false;
    if (better && typeof a === 'number' && typeof b === 'number' && a !== b) {
      aw = better === 'hi' ? a > b : a < b; bw = !aw;
    }
    const f = (v: Cell) => (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : v);
    const numStyle = (w: boolean) => ({ fontFamily: head ? FONTS.display : FONTS.digits, fontSize: 13, color: w ? theme.alpha : theme.ink, fontWeight: w ? ('700' as const) : ('400' as const) });
    return (
      <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: theme.line, alignItems: 'flex-start' }}>
        <Text style={{ flex: 1.1, color: theme.muted, fontSize: 12, fontFamily: head ? FONTS.display : undefined }}>{lab}</Text>
        <Text style={[{ flex: 1 }, numStyle(aw)]}>{f(a)}</Text>
        <Text style={[{ flex: 1 }, numStyle(bw)]}>{f(b)}</Text>
      </View>
    );
  };

  let body: React.ReactNode = <Empty>Select two runs or two sessions in History first.</Empty>;

  if (sel.length === 2) {
    if (state.histTab === 'runs') {
      const all = myRuns();
      const A = all.find((r) => r.id === sel[0]), B = all.find((r) => r.id === sel[1]);
      if (A && B) {
        body = (
          <Card>
            <CmpRow head lab="" a={`${A.name}\n${A.date}`} b={`${B.name}\n${B.date}`} />
            <CmpRow lab="Hit factor" a={A.status === 'scored' ? A.hf : A.status} b={B.status === 'scored' ? B.hf : B.status} better="hi" />
            <CmpRow lab="Time (s)" a={A.time} b={B.time} better="lo" />
            <CmpRow lab="Points" a={A.pts} b={B.pts} better="hi" />
            <CmpRow lab="Hits" a={A.breakdown} b={B.breakdown} />
            <CmpRow lab="Penalties" a={A.penalties || '—'} b={B.penalties || '—'} />
            <CmpRow lab="Firearm" a={A.gun} b={B.gun} />
          </Card>
        );
      }
    } else {
      const gs = sessionGroups(myRuns());
      const A = gs.find((g) => g.key === sel[0]), B = gs.find((g) => g.key === sel[1]);
      if (A && B) {
        const st = (g: typeof A) => {
          const sc = g.runs.filter((r) => r.status === 'scored');
          const hits = g.runs.reduce((s, r) => s + r.rounds, 0);
          return {
            n: g.runs.length,
            avg: sc.length ? avg(sc.map((r) => r.hf)) : 0,
            best: sc.length ? Math.max(...sc.map((r) => r.hf)) : 0,
            t: sc.length ? avg(sc.map((r) => r.time)) : 0,
            al: hits ? Math.round((g.runs.reduce((s, r) => s + (r.alphaCount || 0), 0) / hits) * 100) : 0,
            pen: g.runs.reduce((s, r) => s + (r.missCount || 0) + (r.procs || 0) + (r.nss || 0) + (r.addls || 0), 0),
          };
        };
        const a = st(A), b = st(B);
        body = (
          <Card>
            <CmpRow head lab="" a={`${A.name}\n${A.date}`} b={`${B.name}\n${B.date}`} />
            <CmpRow lab="Runs" a={a.n} b={b.n} />
            <CmpRow lab="Avg HF" a={a.avg} b={b.avg} better="hi" />
            <CmpRow lab="Best HF" a={a.best} b={b.best} better="hi" />
            <CmpRow lab="Avg time (s)" a={a.t} b={b.t} better="lo" />
            <CmpRow lab="Alpha %" a={a.al} b={b.al} better="hi" />
            <CmpRow lab="Penalties" a={a.pen} b={b.pen} better="lo" />
          </Card>
        );
      }
    }
  }

  return (
    <Screen>
      <BackLink title="Back" onPress={() => router.back()} />
      <SectionTitle>Compare</SectionTitle>
      {body}
    </Screen>
  );
}
