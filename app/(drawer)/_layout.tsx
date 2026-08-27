import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DrawerContent } from '@/components/DrawerContent';
import { useTheme } from '@/theme/ThemeContext';
import { FONTS } from '@/theme/tokens';

function BrandTitle() {
  const { theme } = useTheme();
  return (
    <Text
      style={{
        fontFamily: FONTS.displayBold,
        fontSize: 20,
        letterSpacing: 2,
        color: theme.ink,
      }}
    >
      RANGE<Text style={{ color: theme.accent }}>·</Text>DAY
    </Text>
  );
}

/** Placeholder for the shooter-profile switcher pill (lands in M1) */
function ProfilePill() {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.pill,
        { borderColor: theme.line, backgroundColor: theme.surface2 },
      ]}
    >
      <View style={[styles.pillAvatar, { backgroundColor: theme.accent }]}>
        <Text style={styles.pillAvatarText}>M</Text>
      </View>
      <Text style={[styles.pillName, { color: theme.ink }]}>Mike</Text>
    </View>
  );
}

export default function DrawerLayout() {
  const { theme } = useTheme();
  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.surface,
          borderBottomColor: theme.line,
          borderBottomWidth: StyleSheet.hairlineWidth * 2,
        },
        headerTintColor: theme.accent,
        headerTitleAlign: 'left',
        headerTitle: () => <BrandTitle />,
        headerRight: () => (
          <View style={{ marginRight: 16 }}>
            <ProfilePill />
          </View>
        ),
        drawerStyle: { backgroundColor: theme.surface, width: 280 },
        drawerType: 'front',
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
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 4,
    paddingLeft: 5,
    paddingRight: 11,
  },
  pillAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillAvatarText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  pillName: { fontSize: 12, fontWeight: '700' },
});
