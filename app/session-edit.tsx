import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useToast } from '@/components/Toast';
import { BackLink, Button, Field, Hint, Muted, Screen, SectionTitle, Strong, SubTitle } from '@/components/UI';
import { useStore } from '@/store/MockStore';
import { useTheme } from '@/theme/ThemeContext';
import { RADII } from '@/theme/tokens';

/** Editing a built-in (or org) session makes your own private copy. */
export default function SessionEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { state, acct, canSee, saveSession } = useStore();
  const toast = useToast();

  const src = state.db.sessions.find((s) => s.id === id);
  const isCopy = !!src && src.owner !== acct.id;
  const [name, setName] = useState(src ? (isCopy ? src.name + ' (my copy)' : src.name) : '');
  const [note, setNote] = useState(src?.note ?? '');
  const [drills, setDrills] = useState<string[]>(src ? [...src.drills] : []);

  const visible = useMemo(() => state.db.drills.filter(canSee), [state.db.drills, canSee]);
  if (!src) return <Screen><BackLink title="Back to sessions" onPress={() => router.back()} /><Muted>Session not found.</Muted></Screen>;

  const inSess = visible.filter((d) => drills.includes(d.id));
  const outSess = visible.filter((d) => !drills.includes(d.id));
  const toggle = (did: string) => setDrills((cur) => (cur.includes(did) ? cur.filter((x) => x !== did) : [...cur, did]));

  const row = (d: (typeof visible)[number], included: boolean) => (
    <Pressable
      key={d.id}
      onPress={() => toggle(d.id)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line, borderRadius: RADII.card, marginBottom: 8 }}
    >
      <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: included ? theme.accent : theme.line, backgroundColor: included ? theme.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {included ? <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Strong style={{ fontSize: 14, fontWeight: '600' }}>{d.name}</Strong>
        <Muted style={{ fontSize: 11.5 }}>{d.disc} · {d.meta}</Muted>
      </View>
    </Pressable>
  );

  return (
    <Screen>
      <BackLink title="Back to sessions" onPress={() => router.back()} />
      <SectionTitle>{isCopy ? 'Customize Session' : 'Edit Session'}</SectionTitle>
      <Field label="Session name" value={name} onChangeText={setName} />
      <Field label="Session notes" value={note} onChangeText={setNote} multiline placeholder="Goals for this session, gear to bring…" />
      <SubTitle>Drills in this session</SubTitle>
      <Hint>Tap to add or remove. Order shown is run order. Use the keyboard mic to dictate notes.</Hint>
      {inSess.map((d) => row(d, true))}
      {outSess.map((d) => row(d, false))}
      <Button
        title="Save session"
        onPress={() => {
          if (!drills.length) { toast('Add at least one drill'); return; }
          const result = saveSession(src.id, name.trim() || src.name, drills, note.trim());
          toast(result === 'copy' ? 'Saved as your own session' : 'Session updated');
          router.back();
        }}
      />
    </Screen>
  );
}
