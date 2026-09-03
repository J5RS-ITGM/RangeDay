import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { AddSchema, AddSheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { Card, Digits, Empty, Muted, Note, NoteStrong, Pill, Row, Screen, SectionHead, Segmented, Strong } from '@/components/UI';
import { useStore } from '@/store/MockStore';
import { useTheme } from '@/theme/ThemeContext';

type Tab = 'firearms' | 'equipment' | 'maint';

const SCHEMAS: Record<Tab, AddSchema> = {
  firearms: { title: 'New firearm', fields: [
    { key: 'label', label: 'Make / model', required: true },
    { key: 'cal', label: 'Caliber' },
    { key: 'interval', label: 'Service interval (rounds)', type: 'number', placeholder: '3000' },
  ] },
  equipment: { title: 'New equipment', fields: [{ key: 'label', label: 'Item', required: true }, { key: 'sub', label: 'Details' }] },
  maint: { title: 'Log maintenance', fields: [{ key: 'label', label: 'What was serviced', required: true }, { key: 'sub', label: 'Notes' }] },
};

export default function Armory() {
  const { theme } = useTheme();
  const { acct, state, addFirearm, addEquipment, addMaint } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('firearms');
  const [open, setOpen] = useState(false);

  const guns = state.db.firearms[acct.id] ?? [];
  const eq = state.db.equipment[acct.id] ?? [];
  const maint = state.db.maint[acct.id] ?? [];

  return (
    <Screen>
      <SectionHead title="Armory" right={<Pill title="+ Add" onPress={() => setOpen(true)} />} />
      <Note><NoteStrong>RLS:</NoteStrong> firearms and equipment are owner-only rows — no other account can query them.</Note>
      <Segmented
        options={[{ key: 'firearms', label: 'Firearms' }, { key: 'equipment', label: 'Equipment' }, { key: 'maint', label: 'Maintenance' }]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'firearms' && (guns.length ? guns.map((g, i) => {
        const due = g.rounds >= g.interval;
        return (
          <Card key={i}>
            <Row>
              <View style={{ flex: 1 }}>
                <Strong style={{ fontSize: 14, fontWeight: '600' }}>{g.label}</Strong>
                <Muted>{g.cal}{due ? <Text style={{ color: theme.miss, fontWeight: '700', fontSize: 10, letterSpacing: 0.5 }}> · SERVICE DUE</Text> : null}</Muted>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Digits>{g.rounds.toLocaleString()}</Digits>
                <Muted>rounds</Muted>
              </View>
            </Row>
          </Card>
        );
      }) : <Empty>No firearms on this account.</Empty>)}
      {tab === 'equipment' && (eq.length ? eq.map((x, i) => (
        <Card key={i}><Strong style={{ fontSize: 14, fontWeight: '600' }}>{x.label}</Strong><Muted>{x.sub}</Muted></Card>
      )) : <Empty>No equipment logged.</Empty>)}
      {tab === 'maint' && (maint.length ? maint.map((x, i) => (
        <Card key={i}><Strong style={{ fontSize: 14, fontWeight: '600' }}>{x.label}</Strong><Muted>{x.sub}</Muted></Card>
      )) : <Empty>No maintenance records.</Empty>)}

      <AddSheet
        open={open}
        onClose={() => setOpen(false)}
        schema={SCHEMAS[tab]}
        onSubmit={(v) => {
          if (tab === 'firearms') { addFirearm({ label: v.label, cal: v.cal || '—', interval: parseInt(v.interval, 10) || 3000 }); toast('Firearm added'); }
          if (tab === 'equipment') { addEquipment({ label: v.label, sub: v.sub || '' }); toast('Equipment added'); }
          if (tab === 'maint') { addMaint({ label: v.label, sub: v.sub }); toast('Maintenance logged'); }
        }}
      />
    </Screen>
  );
}
