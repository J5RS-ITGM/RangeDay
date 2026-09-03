import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { RADII } from '@/theme/tokens';
import { Button, Choice, Field, SubTitle } from './UI';

/** Bottom sheet modal — the mockup's .modal-scrim + .modal */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.scrimWrap}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: theme.shadow }]} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingBottom: 28 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export interface FieldSpec {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'select';
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface AddSchema {
  title: string;
  fields: FieldSpec[];
}

/** Schema-driven add form — the mockup's ADD_SCHEMAS / openAdd */
export function AddSheet({
  schema, open, onClose, onSubmit,
}: { schema: AddSchema | null; open: boolean; onClose: () => void; onSubmit: (values: Record<string, string>) => string | void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schema) return;
    const init: Record<string, string> = {};
    schema.fields.forEach((f) => { init[f.key] = f.type === 'select' && f.options ? f.options[0] : ''; });
    setValues(init);
    setError(null);
  }, [schema, open]);

  if (!schema) return null;

  const submit = () => {
    for (const f of schema.fields) {
      if (f.required && !values[f.key]?.trim()) { setError(`Fill in the ${f.label.toLowerCase()}`); return; }
    }
    const err = onSubmit(values);
    if (err) { setError(err); return; }
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <SubTitle style={{ marginTop: 0 }}>{schema.title}</SubTitle>
      {schema.fields.map((f) =>
        f.type === 'select' && f.options ? (
          <Choice
            key={f.key}
            label={f.label}
            options={f.options.map((o) => ({ key: o, label: o }))}
            value={values[f.key] ?? f.options[0]}
            onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
          />
        ) : (
          <Field
            key={f.key}
            label={f.label}
            value={values[f.key] ?? ''}
            placeholder={f.placeholder}
            keyboardType={f.type === 'number' ? 'numeric' : 'default'}
            onChangeText={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
          />
        ),
      )}
      {error ? <ErrorLine text={error} /> : null}
      <Button title="Save" onPress={submit} />
      <Button title="Cancel" variant="ghost" onPress={onClose} />
    </Sheet>
  );
}

function ErrorLine({ text }: { text: string }) {
  const { theme } = useTheme();
  return <Text style={{ color: theme.miss, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>{text}</Text>;
}

const styles = StyleSheet.create({
  scrimWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '86%', borderTopLeftRadius: RADII.modalTop, borderTopRightRadius: RADII.modalTop, borderWidth: StyleSheet.hairlineWidth * 2 },
});
