import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/Toast';
import { Card, Choice, Empty, Muted, Pill, Row, Strong, SubTitle } from '@/components/UI';
import { AppRole, AppUser, supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeContext';

const ROLES: { key: AppRole; label: string }[] = [
  { key: 'shooter', label: 'Shooter' },
  { key: 'instructor_pending', label: 'Instr. pending' },
  { key: 'instructor', label: 'Instructor' },
  { key: 'admin', label: 'Admin' },
];

/**
 * Full-control user management. Every mutation goes through RLS +
 * the guard trigger: non-admin calls fail server-side no matter what
 * this UI renders, and an admin cannot strip their own admin role.
 */
export function UserAdmin() {
  const { theme } = useTheme();
  const toast = useToast();
  const { session, isAdmin } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) setUsers(data as AppUser[]);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const patch = async (id: string, changes: Partial<Pick<AppUser, 'role' | 'disabled'>>, okMsg: string) => {
    if (!supabase) return;
    setBusy(id);
    const { error } = await supabase.from('app_users').update(changes).eq('id', id);
    setBusy(null);
    if (error) { toast(error.message); return; }
    toast(okMsg);
    load();
  };

  if (!isAdmin) return null;

  return (
    <View>
      <SubTitle>Accounts</SubTitle>
      {!loaded ? (
        <Muted>Loading accounts…</Muted>
      ) : users.length === 0 ? (
        <Empty>No accounts yet.</Empty>
      ) : (
        users.map((u) => {
          const self = u.id === session?.user.id;
          return (
            <Card key={u.id} style={u.disabled ? { opacity: 0.55 } : undefined}>
              <Row>
                <View style={{ flex: 1 }}>
                  <Strong style={{ fontSize: 14, fontWeight: '600' }}>
                    {u.display_name || u.email}
                    {self ? <Text style={{ color: theme.accent }}>  (you)</Text> : null}
                    {u.disabled ? <Text style={{ color: theme.miss }}>  · DISABLED</Text> : null}
                  </Strong>
                  <Muted style={{ fontSize: 11 }}>{u.email} · joined {new Date(u.created_at).toLocaleDateString()}</Muted>
                </View>
                {!self && (
                  <Pill
                    title={u.disabled ? 'Enable' : 'Disable'}
                    quiet={!u.disabled}
                    onPress={() =>
                      busy
                        ? undefined
                        : patch(u.id, { disabled: !u.disabled }, u.disabled ? 'Account enabled' : 'Account disabled')
                    }
                  />
                )}
              </Row>
              <View style={{ marginTop: 10 }}>
                <Choice<AppRole>
                  options={ROLES}
                  value={u.role}
                  onChange={(role) => {
                    if (busy) return;
                    if (self && u.role === 'admin' && role !== 'admin') {
                      toast('You cannot remove your own admin role');
                      return;
                    }
                    patch(u.id, { role }, `${u.display_name || u.email} → ${role}`);
                  }}
                />
              </View>
            </Card>
          );
        })
      )}
      <Muted style={{ fontSize: 11, lineHeight: 16 }}>
        Deleting accounts and forcing password resets require the service role and stay in the Supabase dashboard for now; a server-side admin function can bring them in-app later. Disabled accounts keep their data but lose admin/instructor powers immediately.
      </Muted>
    </View>
  );
}
