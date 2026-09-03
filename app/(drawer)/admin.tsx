import React from 'react';
import { View } from 'react-native';
import { useToast } from '@/components/Toast';
import { Card, DiffPips, Empty, Muted, Note, NoteStrong, Pill, Row, Screen, SectionTitle, Strong, SubTitle } from '@/components/UI';
import { useStore } from '@/store/MockStore';

export default function Admin() {
  const { state, acct, approveDrill, rejectDrill, approveInstructor } = useStore();
  const toast = useToast();

  if (acct.role !== 'admin') {
    return <Screen><SectionTitle>Moderation</SectionTitle><Empty>Admin access required.</Empty></Screen>;
  }
  const pend = state.db.pubDrills.filter((p) => p.status === 'pending');
  const apps = state.db.accounts.filter((a) => a.role === 'instructor_pending');

  return (
    <Screen>
      <SectionTitle>Moderation</SectionTitle>
      <Note><NoteStrong>Admin only.</NoteStrong> Instructor uploads publish freely; shooter submissions land here for review. Instructor applications also need sign-off.</Note>
      <SubTitle style={{ marginTop: 0 }}>Drill submissions</SubTitle>
      {pend.length ? pend.map((p) => (
        <Card key={p.id}>
          <Row style={{ alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Strong>{p.name}</Strong>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 5, alignItems: 'center' }}>
                <Muted style={{ marginTop: 0 }}>{p.disc}</Muted><Muted style={{ marginTop: 0 }}>{p.meta}</Muted><DiffPips n={p.difficulty} />
              </View>
              <Muted style={{ fontSize: 11 }}>submitted by {p.author}</Muted>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pill title="Approve" onPress={() => { approveDrill(p.id); toast('Published: ' + p.name); }} />
              <Pill title="Reject" quiet onPress={() => { rejectDrill(p.id); toast('Rejected: ' + p.name); }} />
            </View>
          </Row>
        </Card>
      )) : <Empty>No drills waiting for review.</Empty>}
      <SubTitle>Instructor applications</SubTitle>
      {apps.length ? apps.map((a) => (
        <Card key={a.id}>
          <Row>
            <View style={{ flex: 1 }}>
              <Strong style={{ fontSize: 14, fontWeight: '600' }}>{a.profiles[0].name}</Strong>
              <Muted style={{ fontSize: 11 }}>{a.email}</Muted>
            </View>
            <Pill title="Approve" onPress={() => { approveInstructor(a.id); toast(a.profiles[0].name + ' is now an instructor'); }} />
          </Row>
        </Card>
      )) : <Empty>No pending applications.</Empty>}
    </Screen>
  );
}
