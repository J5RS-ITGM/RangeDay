import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Screen, SectionTitle, SubTitle } from '@/components/UI';
import { useTheme } from '@/theme/ThemeContext';
import {
  ACCENTS,
  AccentName,
  FONTS,
  RADII,
  THEMES,
  ThemeName,
} from '@/theme/tokens';

const THEME_ORDER: ThemeName[] = ['light', 'moderate', 'dark'];
const THEME_LABELS: Record<ThemeName, string> = {
  light: 'Light',
  moderate: 'Moderate',
  dark: 'Dark',
};
const ACCENT_ORDER = Object.keys(ACCENTS) as AccentName[];

export default function Settings() {
  const { theme, setThemeName, setAccentName } = useTheme();

  return (
    <Screen>
      <SectionTitle>Settings</SectionTitle>

      <SubTitle style={{ marginTop: 0 }}>Theme</SubTitle>
      <View style={styles.row}>
        {THEME_ORDER.map((name) => {
          const selected = theme.name === name;
          return (
            <Pressable
              key={name}
              onPress={() => setThemeName(name)}
              style={[
                styles.themeOpt,
                {
                  borderColor: selected ? theme.accent : theme.line,
                  backgroundColor: theme.surface,
                },
              ]}
            >
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: THEMES[name].bg,
                    borderColor: theme.line,
                  },
                ]}
              />
              <Text
                style={{
                  color: theme.ink,
                  fontSize: 12,
                  fontWeight: '600',
                  textAlign: 'center',
                }}
              >
                {THEME_LABELS[name]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SubTitle>Accent color</SubTitle>
      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        {ACCENT_ORDER.map((name) => {
          const selected = theme.accentName === name;
          return (
            <Pressable
              key={name}
              onPress={() => setAccentName(name)}
              accessibilityLabel={`Accent: ${name}`}
              style={[
                styles.accentDot,
                {
                  backgroundColor: ACCENTS[name].accent,
                  borderColor: selected ? theme.ink : 'transparent',
                },
              ]}
            />
          );
        })}
      </View>

      <SubTitle>Account</SubTitle>
      <Card>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sLabel, { color: theme.ink }]}>
              Signed in as
            </Text>
            <Text style={[styles.sSub, { color: theme.muted }]}>
              Sign-in arrives in M1 (Supabase Auth: email + Apple/Google)
            </Text>
          </View>
        </View>
      </Card>

      <Text
        style={{
          fontFamily: FONTS.digits,
          fontSize: 11,
          color: theme.muted,
          marginTop: 18,
        }}
      >
        Range Day · v0.1.0 scaffold
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  themeOpt: {
    flex: 1,
    borderWidth: 2,
    borderRadius: RADII.card,
    padding: 10,
  },
  swatch: {
    height: 34,
    borderRadius: RADII.control,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  accentDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 10,
  },
  sLabel: { fontSize: 14, fontWeight: '600' },
  sSub: { fontSize: 11.5, marginTop: 2 },
});
