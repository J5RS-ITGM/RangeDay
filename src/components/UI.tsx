import React from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { FONTS, RADII, SPACING } from '@/theme/tokens';

/** Scrollable screen container with themed background */
export function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={[
        { padding: SPACING.screen, paddingBottom: insets.bottom + 32 },
        style,
      ]}
    >
      {children}
    </ScrollView>
  );
}

/** h2 equivalent — condensed display face */
export function SectionTitle({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const { theme } = useTheme();
  return (
    <Text
      style={[
        {
          fontFamily: FONTS.display,
          fontSize: 22,
          letterSpacing: 1.2,
          color: theme.ink,
          marginBottom: 14,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** h3 equivalent — uppercase condensed sub-heading */
export function SubTitle({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const { theme } = useTheme();
  return (
    <Text
      style={[
        {
          fontFamily: FONTS.display,
          fontSize: 17,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: theme.ink,
          marginTop: 18,
          marginBottom: 10,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderColor: theme.line,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderRadius: RADII.card,
          padding: SPACING.cardPad,
          marginBottom: SPACING.gap,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Dashboard stat tile: mono digits over an uppercase label */
export function Stat({ value, label }: { value: string; label: string }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.surface,
        borderColor: theme.line,
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderRadius: RADII.card,
        padding: SPACING.cardPad,
      }}
    >
      <Text
        style={{
          fontFamily: FONTS.digits,
          fontSize: 27,
          lineHeight: 30,
          color: theme.accent,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: FONTS.display,
          fontSize: 12,
          letterSpacing: 1.6,
          textTransform: 'uppercase',
          color: theme.muted,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/** Placeholder body for screens that land in later milestones */
export function ComingSoon({ milestone, note }: { milestone: string; note: string }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
      }}
    >
      <Text
        style={{
          fontFamily: FONTS.display,
          fontSize: 14,
          letterSpacing: 1.6,
          textTransform: 'uppercase',
          color: theme.accent,
          marginBottom: 8,
        }}
      >
        {milestone}
      </Text>
      <Text
        style={{
          color: theme.muted,
          fontSize: 14,
          textAlign: 'center',
          lineHeight: 21,
        }}
      >
        {note}
      </Text>
    </View>
  );
}
