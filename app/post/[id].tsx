import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { ImageAttach, PickedImage } from '@/components/ImageAttach';
import { useToast } from '@/components/Toast';
import { Avatar, BackLink, Button, Card, Field, Muted, Row, Screen, Strong, VisTag } from '@/components/UI';
import { api, CommentRow, PostRow } from '@/lib/api';
import { timeAgo } from '@/lib/time';
import { useTheme } from '@/theme/ThemeContext';

export default function PostDetail() {
  const { theme } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, isAdmin } = useAuth();
  const [post, setPost] = useState<PostRow | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [text, setText] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const [posts, cs] = await Promise.all([api.listPosts(token), api.listComments(token, id)]);
      setPost(posts.find((p) => p.id === id) ?? null);
      setComments(cs);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not load the post');
    }
    setLoading(false);
  }, [token, id, toast]);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    const t = text.trim();
    if (!t && images.length === 0) { toast('Write something or add a photo'); return; }
    if (busy) return;
    setBusy(true);
    try {
      let name = '';
      if (images[0]) { name = (await api.uploadMedia(token!, images[0].uri, images[0].name, images[0].mime)).name; }
      await api.addComment(token!, id!, t, name);
      setText(''); setImages([]);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Comment failed');
    }
    setBusy(false);
  };

  const removePost = async () => {
    try { await api.deletePost(token!, id!); toast('Post deleted'); router.back(); }
    catch (e) { toast(e instanceof Error ? e.message : 'Delete failed'); }
  };
  const removeComment = async (cid: string) => {
    try { await api.deleteComment(token!, cid); load(); }
    catch (e) { toast(e instanceof Error ? e.message : 'Delete failed'); }
  };

  if (loading) return <Screen style={{ paddingTop: 40 }}><ActivityIndicator color={theme.accent} /></Screen>;
  if (!post) return <Screen style={{ paddingTop: 40 }}><BackLink title="Back" onPress={() => router.back()} /><Muted>Post not found.</Muted></Screen>;

  return (
    <Screen style={{ paddingTop: 20 }}>
      <BackLink title="Back to community" onPress={() => router.back()} />
      <Card>
        <Row style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Avatar initial={post.initial} size={38} />
            <View style={{ flex: 1 }}>
              <Strong style={{ fontSize: 14, fontWeight: '700' }}>{post.author}{post.mine ? ' · you' : ''}</Strong>
              <Muted style={{ fontSize: 11 }}>{timeAgo(post.created_at)}</Muted>
            </View>
          </View>
          <VisTag vis={post.vis} />
        </Row>
        {post.title ? <Strong style={{ fontSize: 16, marginBottom: 6 }}>{post.title}</Strong> : null}
        <Text style={{ color: theme.ink, fontSize: 14.5, lineHeight: 22 }}>{post.body}</Text>
        {post.image_urls.map((u) => (
          <Image key={u} source={{ uri: u }} style={{ width: '100%', height: 240, borderRadius: 10, marginTop: 10, backgroundColor: theme.surface2 }} resizeMode="cover" />
        ))}
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 12, alignItems: 'center' }}>
          <Text style={{ color: post.liked ? theme.accent : theme.muted, fontSize: 13 }}>♥ {post.likes}</Text>
          <Text style={{ color: theme.muted, fontSize: 13 }}>💬 {comments.length}</Text>
          {post.can_delete ? (
            <Pressable onPress={removePost} hitSlop={8} style={{ marginLeft: 'auto' }}>
              <Text style={{ color: theme.miss, fontSize: 13, fontWeight: '600' }}>{isAdmin && !post.mine ? 'Remove (mod)' : 'Delete'}</Text>
            </Pressable>
          ) : null}
        </View>
      </Card>

      <Strong style={{ marginTop: 18, marginBottom: 10 }}>Comments</Strong>
      {comments.length === 0 ? <Muted style={{ marginBottom: 12 }}>No comments yet. Start the conversation.</Muted> : null}
      {comments.map((c) => (
        <Card key={c.id}>
          <Row style={{ marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Avatar initial={c.initial} size={28} />
              <View style={{ flex: 1 }}>
                <Strong style={{ fontSize: 12.5, fontWeight: '600' }}>{c.author}{c.mine ? ' · you' : ''}</Strong>
                <Muted style={{ fontSize: 10.5 }}>{timeAgo(c.created_at)}</Muted>
              </View>
            </View>
            {c.can_delete ? (
              <Pressable onPress={() => removeComment(c.id)} hitSlop={8}>
                <Text style={{ color: theme.muted, fontSize: 11 }}>{isAdmin && !c.mine ? 'Remove' : 'Delete'}</Text>
              </Pressable>
            ) : null}
          </Row>
          {c.body ? <Text style={{ color: theme.ink, fontSize: 13.5, lineHeight: 20 }}>{c.body}</Text> : null}
          {c.image_url ? <Image source={{ uri: c.image_url }} style={{ width: '100%', height: 200, borderRadius: 8, marginTop: 8, backgroundColor: theme.surface2 }} resizeMode="cover" /> : null}
        </Card>
      ))}

      <View style={{ marginTop: 8 }}>
        <Field label="Add a comment" value={text} onChangeText={setText} multiline placeholder="Reply…" />
        <ImageAttach images={images} onChange={setImages} max={1} />
        <Button title={busy ? 'Posting…' : 'Comment'} onPress={send} />
      </View>
    </Screen>
  );
}
