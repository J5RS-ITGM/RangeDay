import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Sheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { Button, Card, Field, Pill, RoleTag, Screen, SectionTitle, SettingRow, SubTitle, Toggle } from '@/components/UI';
import { useStore } from '@/store/MockStore';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeContext';
import { ACCENTS, AccentName, FONTS, RADII, THEMES, ThemeName } from '@/theme/tokens';
import { ShieldIcon, TargetIcon } from '@/components/Icons';

const THEME_ORDER: ThemeName[] = ['light', 'moderate', 'dark'];
const THEME_LABELS: Record<ThemeName, string> = { light: 'Light', moderate: 'Moderate', dark: 'Dark' };
const ACCENT_ORDER = Object.keys(ACCENTS) as AccentName[];

export default function Settings() {
  const { theme, setThemeName, setAccentName } = useTheme();
  const { acct, applyInstructor, switchAccount } = useStore();
  const { configured, appUser, signOut } = useAuth();
  const toast = useToast();
  const [timerSounds, setTimerSounds] = useState(true);
  const [roundAlerts, setRoundAlerts] = useState(true);
  const [signup, setSignup] = useState(false);
  const [signupRole, setSignupRole] = useState<'shooter' | 'instructor'>('shooter');

  const roleSub = {
    admin: 'Administrator — full moderation access',
    instructor: 'Instructor — approved',
    instructor_pending: 'Instructor application under review',
    shooter: 'Shooter',
  }[acct.role];

  return (
    <Screen>
      <SectionTitle>Settings</SectionTitle>

      <SubTitle style={{ marginTop: 0 }}>Theme</SubTitle>
      <View style={styles.row}>
        {THEME_ORDER.map((name) => {
          const selected = theme.name === name;
          return (
            <Pressable key={name} onPress={() => setThemeName(name)} style={[styles.themeOpt, { borderColor: selected ? theme.accent : theme.line, backgroundColor: theme.surface }]}>
              <View style={[styles.swatch, { backgroundColor: THEMES[name].bg, borderColor: theme.line }]} />
              <Text style={{ color: theme.ink, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{THEME_LABELS[name]}</Text>
            </Pressable>
          );
        })}
      </View>

      <SubTitle>Accent color</SubTitle>
      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        {ACCENT_ORDER.map((name) => (
          <Pressable
            key={name}
            onPress={() => setAccentName(name)}
            accessibilityLabel={`Accent: ${name}`}
            style={[styles.accentDot, { backgroundColor: ACCENTS[name].accent, borderColor: theme.accentName === name ? theme.ink : 'transparent' }]}
          />
        ))}
      </View>

      <SubTitle>Role</SubTitle>
      <Card>
        <SettingRow
          label="Account role"
          sub={roleSub}
          right={acct.role === 'shooter'
            ? <Pill title="Apply for instructor" onPress={() => { applyInstructor(); toast('Application sent — an org admin must approve'); }} />
            : <RoleTag role={acct.role} />}
        />
        <SettingRow label="Preview signup flow" sub="See the role selection new users get" right={<Pill title="Open" onPress={() => setSignup(true)} />} last />
      </Card>

      <SubTitle>Preferences</SubTitle>
      <Card>
        <SettingRow label="Shot timer sounds" sub="Beep on start signal in timed drills" right={<Toggle on={timerSounds} onChange={setTimerSounds} />} />
        <SettingRow label="Round count alerts" sub="Warn when a firearm passes its service interval" right={<Toggle on={roundAlerts} onChange={setRoundAlerts} />} last />
      </Card>

      <SubTitle>Account</SubTitle>
      <Card>
        <SettingRow
          label="Signed in as"
          sub={configured ? `${appUser?.email ?? '—'}${appUser ? ` · ${appUser.role}` : ''}` : acct.email + ' (demo)'}
          right={<Pill title="Sign out" quiet onPress={() => { if (configured) { signOut(); } else { toast('Demo mode — set Supabase env vars to enable real auth'); } }} />}
          last={configured}
        />
        {!configured && (
          <SettingRow
            label="Demo: switch account"
            sub="Cycle Mike → Dana → Riley (admin) to see RLS & roles"
            right={<Pill title="Switch" onPress={() => { const a = switchAccount(); toast('Now signed in as ' + a.email + ' — RLS re-filtered'); }} />}
            last
          />
        )}
      </Card>

      <Text style={{ fontFamily: FONTS.digits, fontSize: 11, color: theme.muted, marginTop: 18 }}>Range Day · v0.2.0 · mock data, RLS simulated client-side</Text>

      {/* Signup preview */}
      <Sheet open={signup} onClose={() => setSignup(false)}>
        <SubTitle style={{ marginTop: 0 }}>Create your account</SubTitle>
        <Field label="Name" placeholder="Your name" />
        <Field label="Email" placeholder="you@example.com" keyboardType="email-address" />
        <Text style={{ fontFamily: FONTS.display, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: theme.muted, marginBottom: 6 }}>Role</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          {([
            { key: 'shooter', name: 'Shooter', sub: 'Track drills, score runs, join a club', Icon: TargetIcon },
            { key: 'instructor', name: 'Instructor', sub: 'Build sessions & drills for an org', Icon: ShieldIcon },
          ] as const).map((r) => {
            const on = signupRole === r.key;
            return (
              <Pressable key={r.key} onPress={() => setSignupRole(r.key)} style={{ flex: 1, borderWidth: 2, borderColor: on ? theme.accent : theme.line, borderRadius: RADII.card, padding: 14, backgroundColor: theme.surface2, alignItems: 'center' }}>
                <r.Icon color={on ? theme.accent : theme.muted} size={26} />
                <Text style={{ color: theme.ink, fontWeight: '700', fontSize: 14, marginTop: 6 }}>{r.name}</Text>
                <Text style={{ color: theme.muted, fontSize: 10.5, textAlign: 'center', marginTop: 4, lineHeight: 15 }}>{r.sub}</Text>
              </Pressable>
            );
          })}
        </View>
        {signupRole === 'instructor' && (
          <View style={{ backgroundColor: theme.charlie + '1F', borderColor: theme.charlie, borderWidth: 1, borderRadius: RADII.card, padding: 12, marginBottom: 12 }}>
            <Text style={{ color: theme.charlie, fontSize: 12, lineHeight: 18 }}>
              ⚠ Instructor accounts require <Text style={{ fontWeight: '700' }}>approval by an org admin</Text> before instructor tools unlock. You'll sign up as a shooter and be upgraded once approved.
            </Text>
          </View>
        )}
        <Button title="Create account" onPress={() => { setSignup(false); toast(signupRole === 'instructor' ? 'Account created — instructor pending approval' : 'Account created — welcome!'); }} />
        <Button title="Cancel" variant="ghost" onPress={() => setSignup(false)} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  themeOpt: { flex: 1, borderWidth: 2, borderRadius: RADII.card, padding: 10 },
  swatch: { height: 34, borderRadius: RADII.control, borderWidth: StyleSheet.hairlineWidth, marginBottom: 8 },
  accentDot: { width: 44, height: 44, borderRadius: 22, borderWidth: 3 },
});
