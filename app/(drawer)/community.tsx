import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/Toast';
import { Avatar, Button, Card, Choice, Empty, Field, Muted, Note, NoteStrong, Row, Screen, SectionTitle, Strong, VisTag } from '@/components/UI';
import { api, isDemo, PostRow } from '@/lib/api';
import { useStore } from '@/store/MockStore';
import { useTheme } from '@/theme/ThemeContext';

export default function Community() {
  return isDemo ? <DemoCommunity /> : <LiveCommunity />;
}

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function LiveCommunity() {
  const { theme } = useTheme();
  const { token, isAdmin } = useAuth();
  const toast = useToast();
  const [text, setText] = useState('');
  const [vis, setVis] = useState<'public' | 'org'>('public');
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setPosts(await api.listPosts(token));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not load the feed');
    }
    setLoaded(true);
  }, [token, toast]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    const t = text.trim();
    if (!t) { toast('Write something first'); return; }
    if (busy) return;
    setBusy(true);
    try {
      await api.createPost(token!, t, vis);
      setText('');
      toast(vis === 'org' ? 'Posted to your org' : 'Posted publicly');
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Post failed');
    }
    setBusy(false);
  };

  const like = async (p: PostRow) => {
    // optimistic
    setPosts((cur) => cur.map((x) => x.id === p.id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x));
    try { await api.likePost(token!, p.id); } catch { load(); }
  };

  const remove = async (p: PostRow) => {
    try { await api.deletePost(token!, p.id); toast('Post deleted'); load(); }
    catch (e) { toast(e instanceof Error ? e.message : 'Delete failed'); }
  };

  return (
    <Screen>
      <SectionTitle>Community</SectionTitle>
      <Note><NoteStrong>Public</NoteStrong> posts are visible to everyone on Range Day; <NoteStrong>org</NoteStrong> posts only to your organization.</Note>
      <Field label="New post" value={text} onChangeText={setText} multiline placeholder="Share a drill result, gear note, match story…" />
      <Choice options={[{ key: 'public', label: 'Public' }, { key: 'org', label: 'Org only' }]} value={vis} onChange={setVis} />
      <Button title={busy ? 'Posting…' : 'Post'} style={{ marginBottom: 14 }} onPress={submit} />

      {posts.length ? posts.map((p) => (
        <Card key={p.id}>
          <Row style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Avatar initial={p.initial} size={34} />
              <View style={{ flex: 1 }}>
                <Strong style={{ fontSize: 13, fontWeight: '600' }}>{p.author}{p.mine ? ' · you' : ''}</Strong>
                <Muted style={{ fontSize: 11 }}>{timeAgo(p.created_at)}</Muted>
              </View>
            </View>
            <VisTag vis={p.vis} />
          </Row>
          {p.title ? <Strong style={{ marginBottom: 5 }}>{p.title}</Strong> : null}
          <Text style={{ color: theme.ink, fontSize: 13.5, lineHeight: 21 }}>{p.body}</Text>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 10, alignItems: 'center' }}>
            <Pressable onPress={() => like(p)} hitSlop={8}>
              <Text style={{ color: p.liked ? theme.accent : theme.muted, fontSize: 12 }}>♥ {p.likes}</Text>
            </Pressable>
            {(p.mine || isAdmin) ? (
              <Pressable onPress={() => remove(p)} hitSlop={8}>
                <Text style={{ color: theme.muted, fontSize: 12 }}>Delete</Text>
              </Pressable>
            ) : null}
          </View>
        </Card>
      )) : loaded ? <Empty>No posts yet. Be the first to share something.</Empty> : <Empty>Loading…</Empty>}
    </Screen>
  );
}

function DemoCommunity() {
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
      <Button title="Post" style={{ marginBottom: 14 }} onPress={() => {
        const t = text.trim();
        if (!t) { toast('Write something first'); return; }
        addPost(t, vis); setText('');
        toast(vis === 'org' ? 'Posted to your org' : 'Posted publicly');
      }} />
      {rows.map(({ p, i }) => (
        <Card key={i}>
          <Row style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Avatar initial={p.initial} size={34} />
              <View style={{ flex: 1 }}>
                <Strong style={{ fontSize: 13, fontWeight: '600' }}>{p.author}</Strong>
                <Muted style={{ fontSize: 11 }}>{p.time}</Muted>
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
