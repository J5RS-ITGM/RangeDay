import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from '@react-navigation/drawer';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { useStore } from '@/store/MockStore';
import { useTheme } from '@/theme/ThemeContext';
import { FONTS } from '@/theme/tokens';
import {
  AdminIcon,
  BarsIcon,
  ChatIcon,
  ChecklistIcon,
  ClockIcon,
  ContactsIcon,
  HomeIcon,
  IconProps,
  ProfileIcon,
  SettingsIcon,
  ShieldIcon,
  TargetIcon,
} from './Icons';

interface NavEntry {
  route: string;
  label: string;
  Icon: (p: IconProps) => React.ReactElement;
  /** Only rendered for admin accounts once auth lands (M1/M5) */
  adminOnly?: boolean;
}

const NAV: NavEntry[] = [
  { route: 'index', label: 'Home', Icon: HomeIcon },
  { route: 'profile', label: 'Profile', Icon: ProfileIcon },
  { route: 'contacts', label: 'Contacts', Icon: ContactsIcon },
  { route: 'armory', label: 'Armory', Icon: ShieldIcon },
  { route: 'sessions', label: 'Sessions', Icon: ChecklistIcon },
  { route: 'drills', label: 'Drills', Icon: TargetIcon },
  { route: 'analytics', label: 'Analytics', Icon: BarsIcon },
  { route: 'history', label: 'History', Icon: ClockIcon },
  { route: 'community', label: 'Community', Icon: ChatIcon },
  { route: 'admin', label: 'Admin', Icon: AdminIcon, adminOnly: true },
  { route: 'settings', label: 'Settings', Icon: SettingsIcon },
];

export function DrawerContent(props: DrawerContentComponentProps) {
  const { theme } = useTheme();
  // Rendering convenience only — real enforcement is Supabase RLS.
  const { acct } = useStore();
  const { configured, isAdmin } = useAuth();
  const IS_ADMIN = configured ? isAdmin : acct.role === 'admin';
  const activeRoute = props.state.routes[props.state.index]?.name;

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: 24 }}
      >
        <View style={styles.brandWrap}>
          <Text
            style={[
              styles.brand,
              { color: theme.ink, fontFamily: FONTS.displayBold },
            ]}
          >
            RANGE<Text style={{ color: theme.accent }}>·</Text>DAY
          </Text>
          <Text style={[styles.brandSub, { color: theme.muted }]}>
            TRAINING COMPANION
          </Text>
        </View>

        {NAV.filter((n) => !n.adminOnly || IS_ADMIN).map((n) => {
          const active = activeRoute === n.route;
          const color = active ? theme.accent : theme.muted;
          return (
            <Pressable
              key={n.route}
              onPress={() => props.navigation.navigate(n.route)}
              style={({ pressed }) => [
                styles.item,
                {
                  borderLeftColor: active ? theme.accent : 'transparent',
                  backgroundColor: active
                    ? theme.surface2
                    : pressed
                      ? theme.surface2
                      : 'transparent',
                },
              ]}
            >
              <n.Icon color={color} />
              <Text
                style={[
                  styles.itemLabel,
                  { color, fontFamily: FONTS.display },
                ]}
              >
                {n.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </DrawerContentScrollView>

      <View style={[styles.foot, { borderTopColor: theme.line }]}>
        <Text style={[styles.footText, { color: theme.muted }]}>
          v0.2 · RLS simulated client-side.\n Real enforcement lives in Supabase policies.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brandWrap: { paddingHorizontal: 20, paddingBottom: 18 },
  brand: { fontSize: 22, letterSpacing: 2 },
  brandSub: { fontSize: 10, letterSpacing: 2.5, marginTop: 2 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderLeftWidth: 3,
  },
  itemLabel: { fontSize: 17, letterSpacing: 0.8 },
  foot: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    padding: 16,
    paddingHorizontal: 20,
  },
  footText: { fontSize: 11, lineHeight: 16 },
});
