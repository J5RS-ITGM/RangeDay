import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Readout } from '@/components/Runs';
import { Sheet } from '@/components/Sheet';
import { Target } from '@/components/Target';
import { useToast } from '@/components/Toast';
import { BackLink, Button, Choice, Field, Hint, Muted, Pill, Screen, SectionTitle } from '@/components/UI';
import {
  ZONE_PTS, breakdownString, countZones, hitFactor, parseRoundCount, quickFill, scoringRounds, totalPoints,
} from '@/lib/scoring';
import { useStore } from '@/store/MockStore';
import { Hit, Run, Zone } from '@/store/types';
import { useTheme } from '@/theme/ThemeContext';
import { FONTS, RADII } from '@/theme/tokens';

type FillZone = 'A' | 'C' | 'D';
const ZONE_LABEL: Record<Zone, string> = { A: 'ALPHA', C: 'CHARLIE', D: 'DELTA', miss: 'MISS' };

/** Counter chip: tap to add a hit of that zone; small − removes the most recent */
function Chip({ zone, count, onInc, onDec }: { zone: Zone; count: number; onInc: () => void; onDec: () => void }) {
  const { theme } = useTheme();
  const color = { A: theme.alpha, C: theme.charlie, D: theme.delta, miss: theme.miss }[zone];
  return (
    <Pressable
      onPress={onInc}
      style={({ pressed }) => ({
        flex: 1, alignItems: 'center', backgroundColor: theme.surface2, borderRadius: RADII.control,
        paddingTop: 13, paddingBottom: 10, paddingHorizontal: 4, borderWidth: 1, borderColor: pressed ? theme.accent : theme.line,
      })}
    >
      <Pressable onPress={onDec} hitSlop={8} style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, backgroundColor: theme.surface, borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 16 }}>−</Text>
      </Pressable>
      <Text style={{ fontFamily: FONTS.digits, fontSize: 20, lineHeight: 22, color }}>{count}</Text>
      <Text style={{ fontSize: 10, letterSpacing: 1, color: theme.muted }}>{ZONE_LABEL[zone]}</Text>
    </Pressable>
  );
}

export default function Score() {
  const router = useRouter();
  const { theme } = useTheme();
  const toast = useToast();
  const { drillId, sessId } = useLocalSearchParams<{ drillId?: string; sessId?: string }>();
  const { state, prof, drillById, guns, saveRun, setDrillNote, setQfDefault, markSessionDrillDone } = useStore();

  const drill = drillId ? drillById(drillId) : undefined;
  const inSess = !!sessId && state.activeSess?.id === sessId;
  const session = inSess ? state.db.sessions.find((s) => s.id === sessId) : undefined;
  const gunList = guns();

  const [hits, setHits] = useState<Hit[]>([]);
  const [time, setTime] = useState('');
  const [gunIdx, setGunIdx] = useState(0);
  const [note, setNote] = useState(drill?.note ?? '');
  const [qfN, setQfN] = useState('');
  const [qfZone, setQfZone] = useState<FillZone>('A');
  const [done, setDone] = useState<Run | null>(null);

  // Quick-fill defaults: remembered per drill, else parsed from "N rds" meta
  useEffect(() => {
    const saved = drill ? state.qfDefaults[drill.id] : undefined;
    const parsed = parseRoundCount(drill?.meta);
    setQfN(String(saved ? saved.n : parsed ?? 6));
    setQfZone(saved ? saved.zone : 'A');
    setNote(drill?.note ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drill?.id]);

  const counts = useMemo(() => countZones(hits), [hits]);
  const pts = totalPoints(hits);
  const rounds = scoringRounds(hits);
  const t = parseFloat(time) || 0;
  const hf = hitFactor(pts, t);

  const addHit = useCallback((zone: Zone, x: number | null, y: number | null) => {
    setHits((h) => [...h, { zone, pts: ZONE_PTS[zone], x, y }]);
  }, []);

  /** − removes the most recent hit of that zone, preferring counter-added hits so target markers survive */
  const decZone = useCallback((zone: Zone) => {
    setHits((h) => {
      let idx = -1;
      for (let i = h.length - 1; i >= 0; i--) if (h[i].zone === zone && h[i].x === null) { idx = i; break; }
      if (idx < 0) for (let i = h.length - 1; i >= 0; i--) if (h[i].zone === zone) { idx = i; break; }
      if (idx < 0) return h;
      return h.filter((_, i) => i !== idx);
    });
  }, []);

  const doFill = () => {
    const n = Math.max(1, Math.min(32, parseInt(qfN, 10) || 6));
    if (drill) setQfDefault(drill.id, n, qfZone);
    setHits(quickFill(n, qfZone)); // fill replaces the current target state
    toast(`${n} ${qfZone === 'A' ? 'Alphas' : qfZone === 'C' ? 'Charlies' : 'Deltas'} filled — correct any strays`);
  };

  const reset = () => { setHits([]); setTime(''); };

  const save = () => {
    if (!hits.length) { toast('Add some hits first'); return; }
    if (t <= 0) { toast('Enter a time'); return; }
    if (drill) setDrillNote(drill.id, note.trim()); // notes belong to the drill, not the run
    const gun = gunList[gunIdx] ?? gunList[0];
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const run = saveRun(
      {
        name: drill?.name ?? 'Freestyle',
        sessKey: inSess && session ? `${session.id}|${dateStr}` : null,
        sessName: session?.name ?? null,
        status: 'scored',
        hf, pts: Math.max(pts, 0), time: t, rounds,
        breakdown: breakdownString(counts), penalties: '',
        gun: gun?.label ?? '—', alphaCount: counts.A, missCount: counts.miss,
        procs: 0, nss: 0, addls: 0,
      },
      rounds,
      gunIdx,
    );
    toast(`Run saved · ${hf.toFixed(2)} HF`);
    reset();
    setDone(run);
  };

  // Run-complete modal actions
  const streak = state.runStreak;
  const remaining = session && drill ? session.drills.filter((d) => !state.activeSess?.done[d] && d !== drill.id).length : 0;

  const goNext = () => {
    setDone(null);
    if (!session || !drill) return;
    markSessionDrillDone(drill.id);
    const nxt = session.drills.find((d) => !state.activeSess?.done[d] && d !== drill.id);
    if (nxt) router.replace({ pathname: '/score', params: { drillId: nxt, sessId: session.id } });
    else { toast('Session complete'); router.replace({ pathname: '/session-run', params: { id: session.id } }); }
  };

  const gunOptions = gunList.map((g, i) => ({ key: String(i), label: `${g.label} · ${g.cal}` }));

  return (
    <Screen>
      <BackLink title="Back" onPress={() => router.back()} />
      <SectionTitle>{drill?.name ?? 'Score a Stage'}</SectionTitle>
      <Hint>
        Scoring as <Text style={{ color: theme.ink, fontWeight: '700' }}>{prof.name}</Text> — tap where each round landed; the zone scores itself. Prefer counters? Tap{' '}
        <Text style={{ color: theme.ink, fontWeight: '700' }}>Alpha / Charlie / Delta / Miss</Text> below to count hits without the target (− to remove). Or{' '}
        <Text style={{ color: theme.ink, fontWeight: '700' }}>Fill</Text> your expected hits and correct the strays.
      </Hint>

      <Target hits={hits} onHit={(z, x, y) => addHit(z, x, y)} onRemove={(i) => setHits((h) => h.filter((_, k) => k !== i))} />

      {/* Quick fill */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, alignItems: 'stretch' }}>
        <TextInput
          value={qfN}
          onChangeText={setQfN}
          keyboardType="number-pad"
          style={{ width: 76, padding: 11, borderRadius: RADII.control, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface2, color: theme.ink, fontFamily: FONTS.digits, fontSize: 16, textAlign: 'center' }}
        />
        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
          {(['A', 'C', 'D'] as FillZone[]).map((z) => (
            <Pressable
              key={z}
              onPress={() => setQfZone(z)}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: RADII.control, borderWidth: 1, borderColor: qfZone === z ? theme.accent : theme.line, backgroundColor: theme.surface2 }}
            >
              <Text style={{ fontFamily: FONTS.display, fontSize: 13, letterSpacing: 1, color: qfZone === z ? theme.accent : theme.muted }}>{ZONE_LABEL[z]}</Text>
            </Pressable>
          ))}
        </View>
        <Pill title="Fill" onPress={doFill} style={{ justifyContent: 'center', paddingHorizontal: 22 }} />
      </View>

      {/* Counter chips */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
        {(['A', 'C', 'D', 'miss'] as Zone[]).map((z) => (
          <Chip key={z} zone={z} count={counts[z]} onInc={() => addHit(z, null, null)} onDec={() => decZone(z)} />
        ))}
      </View>

      <Field label="Time (sec)" value={time} onChangeText={setTime} keyboardType="decimal-pad" placeholder="0.00" />
      {gunOptions.length ? <Choice label="Firearm" options={gunOptions} value={String(gunIdx)} onChange={(k) => setGunIdx(parseInt(k, 10))} /> : <Muted>No firearms on this account — add one in Armory.</Muted>}
      <Field label="Drill notes" value={note} onChangeText={setNote} multiline placeholder="What to work on, setup details, cues… (use the keyboard mic to dictate)" />

      <Readout hf={hf} pts={pts} rounds={rounds} />

      <Button title="Save Run" onPress={save} />
      <Button title="Clear Target" variant="ghost" onPress={reset} />

      {/* Run-complete modal — keeps the drill loaded so "run it again" is one tap */}
      <Sheet open={!!done} onClose={() => setDone(null)}>
        {done && (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: FONTS.digits, fontSize: 46, lineHeight: 50, color: theme.accent }}>{done.hf.toFixed(2)} HF</Text>
            <Muted style={{ fontSize: 13, marginBottom: 20, marginTop: 8 }}>{done.name}{session ? ` · ${session.name}` : ''}</Muted>
            <View style={{ alignSelf: 'stretch' }}>
              {inSess && session ? (
                remaining ? (
                  <>
                    <Button title="Next drill ▸" onPress={goNext} />
                    <Button title="Shoot this drill again" variant="ghost" onPress={() => setDone(null)} />
                  </>
                ) : (
                  <>
                    <Button title="Finish session ✓" onPress={goNext} />
                    <Button
                      title="Finish + session analytics ▸"
                      variant="ghost"
                      onPress={() => {
                        setDone(null);
                        if (drill) markSessionDrillDone(drill.id);
                        router.replace({ pathname: '/scoped', params: { type: 'sess', key: done.sessKey ?? '', name: `${done.sessName} · ${done.date}` } });
                      }}
                    />
                    <Button title="Shoot this drill again" variant="ghost" onPress={() => setDone(null)} />
                  </>
                )
              ) : (
                <>
                  <Button title="Run it again" onPress={() => setDone(null)} />
                  {streak >= 2 && drill && (
                    <Button title={`Drill analytics (${streak} runs) ▸`} variant="ghost" onPress={() => { setDone(null); router.push({ pathname: '/scoped', params: { type: 'drill', name: drill.name } }); }} />
                  )}
                  <Button title="Done" variant="ghost" onPress={() => { setDone(null); router.navigate('/'); }} />
                </>
              )}
            </View>
          </View>
        )}
      </Sheet>
    </Screen>
  );
}
