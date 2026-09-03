import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DrawerContent } from '@/components/DrawerContent';
import { useToast } from '@/components/Toast';
import { useStore } from '@/store/MockStore';
import { useTheme } from '@/theme/ThemeContext';
import { FONTS } from '@/theme/tokens';

function BrandTitle() {
  const { theme } = useTheme();
  return (
    <Text style={{ fontFamily: FONTS.displayBold, fontSize: 20, letterSpacing: 2, color: theme.ink }}>
      RANGE<Text style={{ color: theme.accent }}>·</Text>DAY
    </Text>
  );
}

/** Shooter-profile switcher pill: tap to cycle profiles on this account */
function ProfilePill() {
  const { theme } = useTheme();
  const { acct, prof, switchProfile } = useStore();
  const toast = useToast();
  return (
    <Pressable
      onPress={() => {
        if (acct.profiles.length < 2) { toast('Only one profile — add another in Profile'); return; }
        const next = switchProfile();
        if (next) toast('Now scoring as ' + next.name);
      }}
      style={[styles.pill, { borderColor: theme.line, backgroundColor: theme.surface2 }]}
    >
      <View style={[styles.pillAvatar, { backgroundColor: theme.accent }]}>
        <Text style={styles.pillAvatarText}>{prof.initial}</Text>
      </View>
      <Text style={[styles.pillName, { color: theme.ink }]}>{prof.name.split(' ')[0]}</Text>
    </Pressable>
  );
}

export default function DrawerLayout() {
  const { theme } = useTheme();
  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface, borderBottomColor: theme.line, borderBottomWidth: StyleSheet.hairlineWidth * 2 },
        headerTintColor: theme.accent,
        headerTitleAlign: 'left',
        headerTitle: () => <BrandTitle />,
        headerRight: () => <View style={{ marginRight: 16 }}><ProfilePill /></View>,
        drawerStyle: { backgroundColor: theme.surface, width: 280 },
        drawerType: 'front',
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Drawer.Screen name="index" options={{ title: 'Home' }} />
      <Drawer.Screen name="profile" options={{ title: 'Profile' }} />
      <Drawer.Screen name="contacts" options={{ title: 'Contacts' }} />
      <Drawer.Screen name="armory" options={{ title: 'Armory' }} />
      <Drawer.Screen name="sessions" options={{ title: 'Sessions' }} />
      <Drawer.Screen name="drills" options={{ title: 'Drills' }} />
      <Drawer.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Drawer.Screen name="history" options={{ title: 'History' }} />
      <Drawer.Screen name="community" options={{ title: 'Community' }} />
      <Drawer.Screen name="admin" options={{ title: 'Admin' }} />
      <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 20, paddingVertical: 4, paddingLeft: 5, paddingRight: 11 },
  pillAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pillAvatarText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  pillName: { fontSize: 12, fontWeight: '700' },
});
