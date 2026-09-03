import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { AddSheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { Card, Choice, DiffPips, Empty, Muted, Note, NoteStrong, Pill, Row, Screen, SectionHead, Segmented, Strong, VisTag } from '@/components/UI';
import { useStore } from '@/store/MockStore';
import { DISCIPLINES, Discipline, Drill, PubDrill } from '@/store/types';
import { useTheme } from '@/theme/ThemeContext';
import { FONTS, RADII } from '@/theme/tokens';

type Sort = 'name' | 'diff' | 'rating';
type Disc = 'all' | Discipline;

function applyCtrls<T extends { name: string; meta?: string; disc: string; difficulty?: number; rating?: { avg: number } }>(list: T[], q: string, disc: Disc, sort: Sort): T[] {
  const ql = q.trim().toLowerCase();
  const out = list.filter((d) => (!ql || d.name.toLowerCase().includes(ql) || (d.meta || '').toLowerCase().includes(ql)) && (disc === 'all' || d.disc === disc));
  if (sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'diff') out.sort((a, b) => (b.difficulty || 0) - (a.difficulty || 0));
  if (sort === 'rating') out.sort((a, b) => (b.rating?.avg || 0) - (a.rating?.avg || 0));
  return out;
}

export default function Drills() {
  const router = useRouter();
  const { theme } = useTheme();
  const { state, acct, canSee, pubStatusFor, publishDrill, loadCommunityDrill, addDrill } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<'lib' | 'community'>('lib');
  const [q, setQ] = useState('');
  const [disc, setDisc] = useState<Disc>('all');
  const [sort, setSort] = useState<Sort>('name');
  const [open, setOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const lib = useMemo(() => applyCtrls(state.db.drills.filter(canSee), q, disc, sort), [state.db.drills, canSee, q, disc, sort]);
  const community = useMemo(() => applyCtrls(state.db.pubDrills.filter((p) => p.status === 'published'), q, disc, sort), [state.db.pubDrills, q, disc, sort]);

  const libCard = (d: Drill) => {
    const mine = d.owner === acct.id;
    const st = mine ? pubStatusFor(d.id) : null;
    return (
      <Card key={d.id}>
        <Row style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Strong>{d.name}</Strong>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 5, alignItems: 'center' }}>
              <Muted style={{ marginTop: 0 }}>{d.disc}</Muted><Muted style={{ marginTop: 0 }}>{d.meta}</Muted><DiffPips n={d.difficulty} />
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            <VisTag vis={d.vis} />
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {mine && (st
                ? <View style={{ borderWidth: 1, borderColor: st === 'pending' ? theme.charlie : theme.alpha, borderRadius: RADII.pill, paddingVertical: 3, paddingHorizontal: 7, justifyContent: 'center' }}>
                    <Text style={{ fontFamily: FONTS.digits, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: st === 'pending' ? theme.charlie : theme.alpha }}>{st === 'pending' ? 'In review' : 'Published'}</Text>
                  </View>
                : <Pill title="Publish" quiet onPress={() => { const r = publishDrill(d.id); toast(r === 'published' ? 'Published to the community' : 'Submitted — an admin will review'); }} />)}
              <Pill title="Run ▸" onPress={() => router.push({ pathname: '/score', params: { drillId: d.id } })} />
            </View>
          </View>
        </Row>
      </Card>
    );
  };

  const pubCard = (p: PubDrill) => (
    <Card key={p.id}>
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Strong>{p.name}</Strong>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 5 }}>
            <Muted style={{ marginTop: 0 }}>{p.disc}</Muted><Muted style={{ marginTop: 0 }}>{p.meta}</Muted>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4, alignItems: 'center' }}>
            <Text style={{ fontFamily: FONTS.digits, fontSize: 12, color: theme.charlie }}>★ {p.rating.avg.toFixed(1)} ({p.rating.count})</Text>
            <DiffPips n={p.difficulty} />
            <Muted style={{ marginTop: 0, fontSize: 11 }}>by {p.author}</Muted>
          </View>
        </View>
        <Pill title="Load" onPress={() => { loadCommunityDrill(p.id); toast('Added to your library'); setTab('lib'); }} />
      </Row>
    </Card>
  );

  return (
    <Screen>
      <SectionHead title="Drills & Stages" right={<Pill title="+ Add" onPress={() => setOpen(true)} />} />
      <Note><NoteStrong>RLS:</NoteStrong> your library shows <NoteStrong>public</NoteStrong> drills, <NoteStrong>your own</NoteStrong>, and your <NoteStrong>org's</NoteStrong>. Community drills are published by instructors — shooter submissions go through review first.</Note>
      <Segmented options={[{ key: 'lib', label: 'My Library' }, { key: 'community', label: 'Community' }]} value={tab} onChange={setTab} />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search drills…"
          placeholderTextColor={theme.muted}
          style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: RADII.control, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface2, color: theme.ink, fontSize: 14 }}
        />
        <Pill title={showFilters ? 'Hide' : 'Filter'} quiet onPress={() => setShowFilters((v) => !v)} />
      </View>
      {showFilters && (
        <View>
          <Choice label="Type" options={[{ key: 'all', label: 'All types' }, ...DISCIPLINES.map((d) => ({ key: d, label: d }))]} value={disc} onChange={setDisc} />
          <Choice label="Sort" options={[{ key: 'name', label: 'A–Z' }, { key: 'diff', label: 'Difficulty' }, { key: 'rating', label: 'Rating' }]} value={sort} onChange={setSort} />
        </View>
      )}
      {tab === 'lib'
        ? (lib.length ? lib.map(libCard) : <Empty>No drills match. Clear the search or add one.</Empty>)
        : (community.length ? community.map(pubCard) : <Empty>No community drills match your filters.</Empty>)}
      <AddSheet
        open={open}
        onClose={() => setOpen(false)}
        schema={{ title: 'New drill', fields: [
          { key: 'name', label: 'Drill name', required: true },
          { key: 'disc', label: 'Discipline / trains', type: 'select', options: DISCIPLINES },
          { key: 'meta', label: 'Round count / distance / par', placeholder: '6 rds · 7 yd · par 2.0s' },
          { key: 'difficulty', label: 'Difficulty (1–5)', type: 'select', options: ['1', '2', '3', '4', '5'] },
          { key: 'vis', label: 'Visibility', type: 'select', options: ['private', 'org'] },
        ] }}
        onSubmit={(v) => {
          addDrill({ name: v.name, disc: v.disc as Discipline, meta: v.meta || '—', difficulty: parseInt(v.difficulty, 10) || 2, vis: v.vis as 'private' | 'org' });
          toast('Drill added to your library');
        }}
      />
    </Screen>
  );
}
