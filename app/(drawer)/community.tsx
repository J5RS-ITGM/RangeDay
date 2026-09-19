import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { ImageAttach, PickedImage } from '@/components/ImageAttach';
import { useToast } from '@/components/Toast';
import { Avatar, Button, Card, Choice, Empty, Field, Muted, Note, NoteStrong, Row, Screen, SectionTitle, Strong, VisTag } from '@/components/UI';
import { api, isDemo, PostRow } from '@/lib/api';
import { useStore } from '@/store/MockStore';
import { timeAgo } from '@/lib/time';
import { useTheme } from '@/theme/ThemeContext';

export default function Community() {
  return isDemo ? <DemoCommunity /> : <LiveCommunity />;
}

function LiveCommunity() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [text, setText] = useState('');
  const [vis, setVis] = useState<'public' | 'org'>('public');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try { setPosts(await api.listPosts(token)); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not load the feed'); }
    setLoaded(true);
  }, [token, toast]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    const t = text.trim();
    if (!t && images.length === 0) { toast('Write something or add a photo'); return; }
    if (busy) return;
    setBusy(true);
    try {
      const names: string[] = [];
      for (const img of images) {
        const up = await api.uploadMedia(token!, img.uri, img.name, img.mime);
        names.push(up.name);
      }
      await api.createPost(token!, t || '(photo)', vis, names);
      setText(''); setImages([]);
      toast(vis === 'org' ? 'Posted to your org' : 'Posted publicly');
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Post failed');
    }
    setBusy(false);
  };

  const like = async (p: PostRow) => {
    setPosts((cur) => cur.map((x) => x.id === p.id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x));
    try { await api.likePost(token!, p.id); } catch { load(); }
  };

  return (
    <Screen>
      <SectionTitle>Community</SectionTitle>
      <Note><NoteStrong>Public</NoteStrong> posts are visible to everyone; <NoteStrong>org</NoteStrong> posts only to your organization. Tap a post to open it and comment.</Note>
      <Field label="New post" value={text} onChangeText={setText} multiline placeholder="Share a drill result, gear note, match story…" />
      <ImageAttach images={images} onChange={setImages} />
      <Choice options={[{ key: 'public', label: 'Public' }, { key: 'org', label: 'Org only' }]} value={vis} onChange={setVis} />
      <Button title={busy ? 'Posting…' : 'Post'} style={{ marginBottom: 14 }} onPress={submit} />

      {posts.length ? posts.map((p) => (
        <Pressable key={p.id} onPress={() => router.push(`/post/${p.id}`)}>
          <Card>
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
            <Text style={{ color: theme.ink, fontSize: 13.5, lineHeight: 21 }} numberOfLines={4}>{p.body}</Text>
            {p.image_urls.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {p.image_urls.map((u) => (
                    <Image key={u} source={{ uri: u }} style={{ width: 130, height: 130, borderRadius: 8, backgroundColor: theme.surface2 }} />
                  ))}
                </View>
              </ScrollView>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 10, alignItems: 'center' }}>
              <Pressable onPress={() => like(p)} hitSlop={8}>
                <Text style={{ color: p.liked ? theme.accent : theme.muted, fontSize: 12 }}>♥ {p.likes}</Text>
              </Pressable>
              <Text style={{ color: theme.muted, fontSize: 12 }}>💬 {p.comment_count}</Text>
            </View>
          </Card>
        </Pressable>
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
        const t = text.trim(); if (!t) { toast('Write something first'); return; }
        addPost(t, vis); setText(''); toast(vis === 'org' ? 'Posted to your org' : 'Posted publicly');
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
          </View>
        </Card>
      ))}
    </Screen>
  );
}
