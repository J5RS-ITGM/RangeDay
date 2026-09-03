import React, { useState } from 'react';
import { View } from 'react-native';
import { AddSheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { Avatar, Card, Empty, Muted, Note, NoteStrong, Pill, Row, Screen, SectionHead, Strong, VisTag } from '@/components/UI';
import { useStore } from '@/store/MockStore';

export default function Contacts() {
  const { state, canSee, addContact } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const rows = state.db.contacts.filter(canSee);

  return (
    <Screen>
      <SectionHead title="Contacts" right={<Pill title="+ Add" onPress={() => setOpen(true)} />} />
      <Note><NoteStrong>RLS:</NoteStrong> you only see contacts you created, plus your org's shared contacts. Switch accounts in Settings to watch this list change.</Note>
      {rows.length ? rows.map((c, i) => (
        <Card key={i}>
          <Row>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <Avatar initial={c.initial} />
              <View style={{ flex: 1 }}>
                <Strong style={{ fontSize: 14, fontWeight: '600' }}>{c.name}</Strong>
                <Muted>{c.sub}</Muted>
              </View>
            </View>
            <VisTag vis={c.vis} />
          </Row>
        </Card>
      )) : <Empty>No contacts visible to this account.</Empty>}
      <AddSheet
        open={open}
        onClose={() => setOpen(false)}
        schema={{ title: 'New contact', fields: [
          { key: 'name', label: 'Name', required: true },
          { key: 'sub', label: 'Role / note' },
          { key: 'vis', label: 'Visibility', type: 'select', options: ['private', 'org'] },
        ] }}
        onSubmit={(v) => { addContact({ name: v.name, sub: v.sub || 'Contact', vis: v.vis as 'private' | 'org' }); toast('Contact added'); }}
      />
    </Screen>
  );
}
