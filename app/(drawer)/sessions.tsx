import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { AddSheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { Card, Muted, Note, NoteStrong, Pill, Row, Screen, SectionHead, Strong, VisTag } from '@/components/UI';
import { useStore } from '@/store/MockStore';
import { useTheme } from '@/theme/ThemeContext';
import { RADII } from '@/theme/tokens';

export default function Sessions() {
  const router = useRouter();
  const { theme } = useTheme();
  const { state, canSee, startSession, addSession } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const rows = state.db.sessions.filter(canSee);
  const active = state.activeSess;

  return (
    <Screen>
      <SectionHead title="Range Sessions" right={<Pill title="+ Add" onPress={() => setOpen(true)} />} />
      <Note>
        A session is a <NoteStrong>pre-loaded drill plan</NoteStrong>. Build it at home, then at the range just hit <NoteStrong>Start</NoteStrong> — the drills queue up automatically. Editing a built-in session saves your own copy.
      </Note>
      {rows.map((s) => {
        const n = s.drills.length;
        const started = active?.id === s.id;
        const done = started ? Object.keys(active!.done).length : 0;
        return (
          <Card key={s.id}>
            <Row>
              <View style={{ flex: 1 }}>
                <Strong>{s.name}</Strong>
                <Muted>{s.desc} · {n} drills</Muted>
              </View>
              <VisTag vis={s.vis} />
            </Row>
            {started && (
              <View style={{ height: 6, backgroundColor: theme.surface2, borderRadius: RADII.bar, marginTop: 10, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${n ? Math.round((done / n) * 100) : 0}%`, backgroundColor: theme.accent }} />
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Pill title={started ? 'Resume ▸' : 'Start ▸'} onPress={() => { startSession(s.id); router.push({ pathname: '/session-run', params: { id: s.id } }); }} />
              <Pill title="Edit" quiet onPress={() => router.push({ pathname: '/session-edit', params: { id: s.id } })} />
            </View>
          </Card>
        );
      })}
      <AddSheet
        open={open}
        onClose={() => setOpen(false)}
        schema={{ title: 'New session', fields: [{ key: 'name', label: 'Session name', required: true }, { key: 'desc', label: 'Description' }] }}
        onSubmit={(v) => {
          const id = addSession(v.name, v.desc);
          toast('Now pick the drills');
          setTimeout(() => router.push({ pathname: '/session-edit', params: { id } }), 50);
        }}
      />
    </Screen>
  );
}
