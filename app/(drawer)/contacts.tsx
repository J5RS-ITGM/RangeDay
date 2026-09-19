import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { usePending } from '@/contacts/PendingContext';
import { AddSheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { Avatar, Card, Empty, Field, Muted, Note, NoteStrong, Pill, Row, Screen, SectionHead, Strong, SubTitle, VisTag } from '@/components/UI';
import { api, ContactRow, isDemo } from '@/lib/api';
import { useStore } from '@/store/MockStore';

/** Real mode: contacts are links to other Range Day accounts, added by
 * email or phone, confirmed by the other person. Demo mode keeps the
 * mockup's static list. */
export default function Contacts() {
  return isDemo ? <DemoContacts /> : <LiveContacts />;
}

function LiveContacts() {
  const { token } = useAuth();
  const { refresh: refreshPending } = usePending();
  const toast = useToast();
  const [ident, setIdent] = useState('');
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [incoming, setIncoming] = useState<ContactRow[]>([]);
  const [outgoing, setOutgoing] = useState<ContactRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.listContacts(token);
      setContacts(r.contacts);
      setIncoming(r.incoming);
      setOutgoing(r.outgoing);
      refreshPending();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not load contacts');
    }
    setLoaded(true);
  }, [token, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      toast(msg);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'That did not work');
    }
    setBusy(false);
  };

  const sendRequest = () => {
    const v = ident.trim();
    if (!v) { toast('Enter an email or phone number'); return; }
    run(async () => { await api.addContact(token!, v); setIdent(''); }, 'Request sent');
  };

  const person = (c: ContactRow, actions: React.ReactNode, sub?: string) => (
    <Card key={c.id}>
      <Row>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <Avatar initial={(c.user.display_name || c.user.email)[0].toUpperCase()} />
          <View style={{ flex: 1 }}>
            <Strong style={{ fontSize: 14, fontWeight: '600' }}>{c.user.display_name}</Strong>
            <Muted style={{ fontSize: 11 }}>{sub ?? c.user.email}</Muted>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>{actions}</View>
      </Row>
    </Card>
  );

  return (
    <Screen>
      <SectionHead title="Contacts" />
      <Note>
        <NoteStrong>Linked accounts.</NoteStrong> Add someone by the email or phone number on their Range Day account — they confirm, and you're connected both ways. Run comparisons and shared sessions between contacts are coming with per-account data.
      </Note>

      <Field label="Add a contact — email or phone" value={ident} onChangeText={setIdent} placeholder="them@example.com or (630) 555-0123" autoCapitalize="none" />
      <Pill title={busy ? 'Working…' : 'Send request'} onPress={sendRequest} style={{ alignSelf: 'flex-start', marginBottom: 16 }} />

      {incoming.length > 0 && (
        <View>
          <SubTitle>Requests for you</SubTitle>
          {incoming.map((c) =>
            person(
              c,
              <>
                <Pill title="Accept" onPress={() => run(() => api.acceptContact(token!, c.id), 'You are now connected')} />
                <Pill title="Decline" quiet onPress={() => run(() => api.removeContact(token!, c.id), 'Request declined')} />
              </>,
              `${c.user.email} · wants to connect`,
            ),
          )}
        </View>
      )}

      <SubTitle>Your contacts</SubTitle>
      {contacts.length
        ? contacts.map((c) =>
            person(
              c,
              confirmRemove === c.id ? (
                <>
                  <Pill title="Confirm" onPress={() => { setConfirmRemove(null); run(() => api.removeContact(token!, c.id), 'Contact removed'); }} />
                  <Pill title="Keep" quiet onPress={() => setConfirmRemove(null)} />
                </>
              ) : (
                <Pill title="Remove" quiet onPress={() => setConfirmRemove(c.id)} />
              ),
              c.user.phone ? `${c.user.email} · ${c.user.phone}` : c.user.email,
            ),
          )
        : loaded
          ? <Empty>No contacts yet — send a request above.</Empty>
          : <Empty>Loading…</Empty>}

      {outgoing.length > 0 && (
        <View>
          <SubTitle>Waiting on them</SubTitle>
          {outgoing.map((c) =>
            person(
              c,
              <Pill title="Cancel" quiet onPress={() => run(() => api.removeContact(token!, c.id), 'Request cancelled')} />,
              `${c.user.email} · request pending`,
            ),
          )}
        </View>
      )}
    </Screen>
  );
}

function DemoContacts() {
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
