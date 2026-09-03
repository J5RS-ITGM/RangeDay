import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useToast } from '@/components/Toast';
import { Avatar, Button, Card, Choice, Field, Muted, Note, NoteStrong, Pill, RoleTag, Row, Screen, SectionTitle, Strong, SubTitle, TwoCol } from '@/components/UI';
import { MAX_PROFILES, useStore } from '@/store/MockStore';

const DIVISIONS = ['Production', 'Carry Optics', 'Limited', 'Open', 'PCC'];

export default function ProfileScreen() {
  const { acct, prof, switchProfile, addProfile, saveProfileName } = useStore();
  const toast = useToast();
  const [newName, setNewName] = useState('');
  const [name, setName] = useState(prof.name);
  const [division, setDivision] = useState('Production');
  const [pf, setPf] = useState<'Minor' | 'Major'>('Minor');

  useEffect(() => setName(prof.name), [prof.id, prof.name]);

  return (
    <Screen>
      <SectionTitle>Profile</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 16 }}>
        <Avatar initial={prof.initial} size={64} on />
        <View style={{ flex: 1 }}>
          <Strong style={{ fontSize: 18 }}>{prof.name}</Strong>
          <Muted>{prof.sub}</Muted>
          <RoleTag role={acct.role} />
        </View>
      </View>

      <SubTitle style={{ marginTop: 0 }}>Shooter profiles on this account</SubTitle>
      <Note>
        Add a second profile to score with a friend at the range — their runs stay separate but live under your account.{' '}
        <NoteStrong>Max {MAX_PROFILES} profiles.</NoteStrong>
      </Note>
      {acct.profiles.map((p) => {
        const active = p.id === prof.id;
        return (
          <Card key={p.id}>
            <Row>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <Avatar initial={p.initial} on={active} />
                <View style={{ flex: 1 }}>
                  <Strong style={{ fontSize: 14, fontWeight: '600' }}>{p.name}</Strong>
                  <Muted>{p.sub}{active ? ' · active' : ''}</Muted>
                </View>
              </View>
              {!active && <Pill title="Use" onPress={() => { switchProfile(p.id); toast('Switched to ' + p.name); }} />}
            </Row>
          </Card>
        );
      })}
      {acct.profiles.length < MAX_PROFILES && (
        <View>
          <Field label="New profile name" placeholder="e.g. Tom (guest)" value={newName} onChangeText={setNewName} />
          <Button
            title="+ Add second profile"
            variant="ghost"
            style={{ marginTop: 0 }}
            onPress={() => {
              const err = addProfile(newName.trim());
              if (err) { toast(err); return; }
              setNewName('');
              toast('Profile added — tap the pill up top to switch');
            }}
          />
        </View>
      )}

      <SubTitle>Details — {prof.name}</SubTitle>
      <Field label="Display name" value={name} onChangeText={setName} />
      <TwoCol>
        <View style={{ flex: 1 }}>
          <Choice label="Division" options={DIVISIONS.map((d) => ({ key: d, label: d }))} value={division} onChange={setDivision} />
        </View>
      </TwoCol>
      <Choice label="Power factor" options={[{ key: 'Minor', label: 'Minor' }, { key: 'Major', label: 'Major' }]} value={pf} onChange={setPf} />
      <Button title="Save profile" onPress={() => { saveProfileName(name.trim()); toast('Profile saved'); }} />
    </Screen>
  );
}
