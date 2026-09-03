import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useToast } from '@/components/Toast';
import { Avatar, Button, Card, Choice, Field, Muted, Note, NoteStrong, Row, Screen, SectionTitle, Strong, VisTag } from '@/components/UI';
import { useStore } from '@/store/MockStore';
import { useTheme } from '@/theme/ThemeContext';

export default function Community() {
  const { theme } = useTheme();
  const { state, canSee, likePost, addPost } = useStore();
  const toast = useToast();
  const [text, setText] = useState('');
  const [vis, setVis] = useState<'public' | 'org'>('public');
  const rows = state.db.posts.map((p, i) => ({ p, i })).filter(({ p }) => canSee(p));

  return (
    <Screen>
      <SectionTitle>Community</SectionTitle>
      <Note><NoteStrong>RLS:</NoteStrong> public posts are visible to everyone; org posts only to that org's members.</Note>
      <Field label="New post" value={text} onChangeText={setText} multiline placeholder="Share a drill result, gear note, match story…" />
      <Choice options={[{ key: 'public', label: 'Public' }, { key: 'org', label: 'Org only' }]} value={vis} onChange={setVis} />
      <Button
        title="Post"
        style={{ marginBottom: 14 }}
        onPress={() => {
          const t = text.trim();
          if (!t) { toast('Write something first'); return; }
          addPost(t, vis); setText('');
          toast(vis === 'org' ? 'Posted to your org' : 'Posted publicly');
        }}
      />
      {rows.map(({ p, i }) => (
        <Card key={i}>
          <Row style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Avatar initial={p.initial} size={34} />
              <View style={{ flex: 1 }}>
                <Strong style={{ fontSize: 13, fontWeight: '600' }}>{p.author}</Strong>
                <Muted style={{ fontSize: 11, marginTop: 0 }}>{p.time}</Muted>
              </View>
            </View>
            <VisTag vis={p.vis} />
          </Row>
          <Strong style={{ marginBottom: 5 }}>{p.title}</Strong>
          <Text style={{ color: theme.ink, fontSize: 13.5, lineHeight: 21 }}>{p.body}</Text>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
            <Pressable onPress={() => likePost(i)} hitSlop={8}>
              <Text style={{ color: p.liked ? theme.accent : theme.muted, fontSize: 12 }}>♥ {p.likes}</Text>
            </Pressable>
            <Pressable onPress={() => toast('Comments land in M5')} hitSlop={8}>
              <Text style={{ color: theme.muted, fontSize: 12 }}>Reply</Text>
            </Pressable>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
