import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { FONTS, RADII, SPACING } from '@/theme/tokens';
import { Visibility } from '@/store/types';

type Kids = { children?: React.ReactNode; style?: StyleProp<ViewStyle> };
type TextKids = { children?: React.ReactNode; style?: StyleProp<TextStyle> };

const hair = StyleSheet.hairlineWidth * 2;

/** Scrollable screen container with themed background */
export function Screen({ children, style }: Kids) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={[{ padding: SPACING.screen, paddingBottom: insets.bottom + 40 }, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

/** h2 — condensed display face */
export function SectionTitle({ children, style }: TextKids) {
  const { theme } = useTheme();
  return (
    <Text style={[{ fontFamily: FONTS.display, fontSize: 22, letterSpacing: 1.2, color: theme.ink, marginBottom: 14 }, style]}>
      {children}
    </Text>
  );
}

/** Section header row: title on the left, an action (e.g. "+ Add") on the right */
export function SectionHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <SectionTitle style={{ marginBottom: 0 }}>{title}</SectionTitle>
      {right}
    </View>
  );
}

/** h3 — uppercase condensed sub-heading */
export function SubTitle({ children, style }: TextKids) {
  const { theme } = useTheme();
  return (
    <Text
      style={[
        { fontFamily: FONTS.display, fontSize: 17, letterSpacing: 0.8, textTransform: 'uppercase', color: theme.ink, marginTop: 18, marginBottom: 10 },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Card({ children, style, onPress, selected }: Kids & { onPress?: () => void; selected?: boolean }) {
  const { theme } = useTheme();
  const base: ViewStyle = {
    backgroundColor: theme.surface,
    borderColor: selected ? theme.accent : theme.line,
    borderWidth: selected ? 1.5 : hair,
    borderRadius: RADII.card,
    padding: SPACING.cardPad,
    marginBottom: SPACING.gap,
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

/** Card header row: content left, badge/actions right */
export function Row({ children, style }: Kids) {
  return (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, style]}>
      {children}
    </View>
  );
}

export function Body({ children, style }: TextKids) {
  const { theme } = useTheme();
  return <Text style={[{ color: theme.ink, fontSize: 14 }, style]}>{children}</Text>;
}

export function Muted({ children, style }: TextKids) {
  const { theme } = useTheme();
  return <Text style={[{ color: theme.muted, fontSize: 12, marginTop: 3 }, style]}>{children}</Text>;
}

export function Strong({ children, style }: TextKids) {
  const { theme } = useTheme();
  return <Text style={[{ color: theme.ink, fontSize: 15, fontWeight: '700' }, style]}>{children}</Text>;
}

export function Digits({ children, style }: TextKids) {
  const { theme } = useTheme();
  return <Text style={[{ fontFamily: FONTS.digits, color: theme.accent, fontSize: 13 }, style]}>{children}</Text>;
}

export function Hint({ children, style }: TextKids) {
  const { theme } = useTheme();
  return <Text style={[{ color: theme.muted, fontSize: 12.5, lineHeight: 19, marginBottom: 14 }, style]}>{children}</Text>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <Text style={{ textAlign: 'center', color: theme.muted, paddingVertical: 40, paddingHorizontal: 20, fontSize: 14, lineHeight: 21 }}>
      {children}
    </Text>
  );
}

/** Dashed explanatory note — the mockup's .rls-note */
export function Note({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.surface, borderColor: theme.line, borderWidth: 1, borderStyle: 'dashed',
        borderRadius: RADII.card, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 14,
      }}
    >
      <Text style={{ color: theme.muted, fontSize: 11, lineHeight: 17 }}>{children}</Text>
    </View>
  );
}

export function NoteStrong({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return <Text style={{ color: theme.accent, fontWeight: '700' }}>{children}</Text>;
}

/** Dashboard stat tile: mono digits over an uppercase label */
export function Stat({ value, label }: { value: string; label: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.surface, borderColor: theme.line, borderWidth: hair, borderRadius: RADII.card, padding: SPACING.cardPad }}>
      <Text style={{ fontFamily: FONTS.digits, fontSize: 27, lineHeight: 30, color: theme.accent }}>{value}</Text>
      <Text style={{ fontFamily: FONTS.display, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: theme.muted, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

export function StatGrid({ stats }: { stats: { value: string; label: string }[] }) {
  const rows: typeof stats[] = [];
  for (let i = 0; i < stats.length; i += 2) rows.push(stats.slice(i, i + 2));
  return (
    <View style={{ gap: SPACING.gap, marginBottom: 16 }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: SPACING.gap }}>
          {r.map((s) => <Stat key={s.label} {...s} />)}
        </View>
      ))}
    </View>
  );
}

/** Primary / ghost full-width button */
export function Button({
  title, onPress, variant = 'primary', style,
}: { title: string; onPress: () => void; variant?: 'primary' | 'ghost'; style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingVertical: 14, borderRadius: RADII.control, alignItems: 'center',
          backgroundColor: primary ? theme.accent : theme.surface2,
          borderWidth: primary ? 0 : hair, borderColor: theme.line,
          marginTop: primary ? 0 : 8, opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: FONTS.displayBold, fontSize: 17, letterSpacing: 1.2, textTransform: 'uppercase', color: primary ? '#fff' : theme.muted }}>
        {title}
      </Text>
    </Pressable>
  );
}

/** Small outlined action — the mockup's .pill-btn */
export function Pill({
  title, onPress, quiet, style,
}: { title: string; onPress: () => void; quiet?: boolean; style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        {
          paddingVertical: 8, paddingHorizontal: 14, borderRadius: RADII.pill, borderWidth: 1,
          borderColor: quiet ? theme.line : theme.accentDim,
          backgroundColor: pressed ? theme.surface2 : 'transparent',
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: FONTS.displayBold, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase', color: quiet ? theme.muted : theme.accent }}>
        {title}
      </Text>
    </Pressable>
  );
}

/** Text link style back button */
export function BackLink({ title, onPress }: { title: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ paddingBottom: 14, alignSelf: 'flex-start' }}>
      <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600' }}>← {title}</Text>
    </Pressable>
  );
}

/** Labeled input — the mockup's .field */
export function Field({
  label, containerStyle, ...input
}: TextInputProps & { label: string; containerStyle?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  return (
    <View style={[{ marginBottom: 13 }, containerStyle]}>
      <Text style={{ fontFamily: FONTS.display, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: theme.muted, marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={theme.muted}
        {...input}
        style={[
          {
            padding: 12, borderRadius: RADII.control, borderWidth: hair, borderColor: theme.line,
            backgroundColor: theme.surface2, color: theme.ink, fontSize: 15,
          },
          input.multiline && { minHeight: 64, textAlignVertical: 'top' },
          input.style,
        ]}
      />
    </View>
  );
}

/** Segmented control — the mockup's .seg */
export function Segmented<T extends string>({
  options, value, onChange,
}: { options: { key: T; label: string }[]; value: T; onChange: (k: T) => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: theme.surface2, borderRadius: RADII.control, padding: 3, marginBottom: 14, borderWidth: hair, borderColor: theme.line }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={{ flex: 1, paddingVertical: 9, borderRadius: RADII.control, backgroundColor: on ? theme.surface : 'transparent', alignItems: 'center' }}
          >
            <Text style={{ fontFamily: FONTS.display, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase', color: on ? theme.accent : theme.muted }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Choice chips used in place of <select> */
export function Choice<T extends string>({
  label, options, value, onChange,
}: { label?: string; options: { key: T; label: string }[]; value: T; onChange: (k: T) => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: 13 }}>
      {label && (
        <Text style={{ fontFamily: FONTS.display, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: theme.muted, marginBottom: 6 }}>
          {label}
        </Text>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {options.map((o) => {
          const on = o.key === value;
          return (
            <Pressable
              key={o.key}
              onPress={() => onChange(o.key)}
              style={{
                paddingVertical: 8, paddingHorizontal: 12, borderRadius: RADII.control, borderWidth: 1,
                borderColor: on ? theme.accent : theme.line, backgroundColor: on ? theme.surface : theme.surface2,
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: on ? theme.accent : theme.muted }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Visibility badge — private / org / public */
export function VisTag({ vis }: { vis: Visibility }) {
  const { theme } = useTheme();
  const color = vis === 'public' ? theme.alpha : vis === 'org' ? theme.accent : theme.muted;
  return (
    <View
      style={{
        paddingVertical: 3, paddingHorizontal: 7, borderRadius: 12,
        backgroundColor: vis === 'private' ? theme.surface2 : color + '29',
        borderWidth: vis === 'private' ? hair : 0, borderColor: theme.line,
      }}
    >
      <Text style={{ fontFamily: FONTS.digits, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color }}>{vis}</Text>
    </View>
  );
}

/** Role tag — shooter / instructor / pending / admin */
export function RoleTag({ role }: { role: 'shooter' | 'instructor' | 'instructor_pending' | 'admin' }) {
  const { theme } = useTheme();
  const map = {
    shooter: { label: 'Shooter', color: theme.accent },
    instructor: { label: '★ Instructor', color: theme.alpha },
    instructor_pending: { label: 'Instructor — pending approval', color: theme.charlie },
    admin: { label: 'Admin', color: theme.delta },
  }[role];
  return (
    <View style={{ alignSelf: 'flex-start', borderWidth: 1, borderColor: map.color, borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8, marginTop: 6 }}>
      <Text style={{ fontFamily: FONTS.digits, fontSize: 11, color: map.color }}>{map.label}</Text>
    </View>
  );
}

/** Circular initial avatar */
export function Avatar({ initial, size = 42, on }: { initial: string; size?: number; on?: boolean }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: on ? theme.accent : theme.surface2, borderWidth: on ? 0 : 2, borderColor: theme.line,
      }}
    >
      <Text style={{ color: on ? '#fff' : theme.muted, fontWeight: '800', fontSize: size * 0.4 }}>{initial}</Text>
    </View>
  );
}

/** Difficulty pips ◆◆◆◇◇ */
export function DiffPips({ n }: { n: number }) {
  const { theme } = useTheme();
  const k = Math.max(1, Math.min(5, n || 1));
  return (
    <Text style={{ fontSize: 10, letterSpacing: 2 }}>
      <Text style={{ color: theme.accent }}>{'◆'.repeat(k)}</Text>
      <Text style={{ color: theme.line }}>{'◆'.repeat(5 - k)}</Text>
    </Text>
  );
}

/** Row of two fields side by side */
export function TwoCol({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 10 }}>{children}</View>;
}

/** Toggle switch — the mockup's .toggle */
export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!on)}
      style={{ width: 48, height: 28, borderRadius: 20, backgroundColor: on ? theme.accent : theme.surface2, borderWidth: 1, borderColor: on ? theme.accent : theme.line, justifyContent: 'center' }}
    >
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: on ? '#fff' : theme.muted, marginLeft: on ? 23 : 3 }} />
    </Pressable>
  );
}

export function SettingRow({ label, sub, right, last }: { label: string; sub?: string; right?: React.ReactNode; last?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: last ? 0 : hair, borderBottomColor: theme.line, gap: 10 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.ink, fontSize: 14, fontWeight: '600' }}>{label}</Text>
        {sub ? <Text style={{ color: theme.muted, fontSize: 11.5, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}
