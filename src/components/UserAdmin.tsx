import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/Toast';
import { Card, Choice, Empty, Muted, Pill, Row, Strong, SubTitle } from '@/components/UI';
import { api, AppRole, AppUser } from '@/lib/api';
import { useTheme } from '@/theme/ThemeContext';

const ROLES: { key: AppRole; label: string }[] = [
  { key: 'shooter', label: 'Shooter' },
  { key: 'instructor_pending', label: 'Instr. pending' },
  { key: 'instructor', label: 'Instructor' },
  { key: 'admin', label: 'Admin' },
];

/**
 * Full-control account management against the FastAPI backend. The UI is
 * not the enforcement: every call is re-checked server-side (admin-only
 * endpoints, self-demotion/self-disable/self-delete guards).
 */
export function UserAdmin() {
  const { theme } = useTheme();
  const toast = useToast();
  const { token, appUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setUsers(await api.adminListUsers(token));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to load accounts');
    }
    setLoaded(true);
  }, [token, toast]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    if (!token || busy) return;
    setBusy(true);
    try {
      await fn();
      toast(okMsg);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Request failed');
    }
    setBusy(false);
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
          const self = u.id === appUser?.id;
          return (
            <Card key={u.id} style={u.disabled ? { opacity: 0.55 } : undefined}>
              <Row>
                <View style={{ flex: 1 }}>
                  <Strong style={{ fontSize: 14, fontWeight: '600' }}>
                    {u.display_name || u.email}
                    {self ? <Text style={{ color: theme.accent }}>  (you)</Text> : null}
                    {u.disabled ? <Text style={{ color: theme.miss }}>  · DISABLED</Text> : null}
                  </Strong>
                  <Muted style={{ fontSize: 11 }}>
                    {u.email} · joined {new Date(u.created_at).toLocaleDateString()}
                  </Muted>
                </View>
                {!self && (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Pill
                      title={u.disabled ? 'Enable' : 'Disable'}
                      quiet={!u.disabled}
                      onPress={() =>
                        run(
                          () => api.adminPatchUser(token!, u.id, { disabled: !u.disabled }),
                          u.disabled ? 'Account enabled' : 'Account disabled',
                        )
                      }
                    />
                    {confirmDelete === u.id ? (
                      <Pill
                        title="Confirm delete"
                        onPress={() => {
                          setConfirmDelete(null);
                          run(() => api.adminDeleteUser(token!, u.id), 'Account deleted');
                        }}
                      />
                    ) : (
                      <Pill title="Delete" quiet onPress={() => setConfirmDelete(u.id)} />
                    )}
                  </View>
                )}
              </Row>
              <View style={{ marginTop: 10 }}>
                <Choice<AppRole>
                  options={ROLES}
                  value={u.role}
                  onChange={(role) => {
                    if (self && u.role === 'admin' && role !== 'admin') {
                      toast('You cannot remove your own admin role');
                      return;
                    }
                    run(() => api.adminPatchUser(token!, u.id, { role }), `${u.display_name || u.email} → ${role}`);
                  }}
                />
              </View>
            </Card>
          );
        })
      )}
      <Muted style={{ fontSize: 11, lineHeight: 16 }}>
        Disable removes access immediately but keeps the account and its data. Delete is permanent. You cannot disable, delete, or demote yourself — the server enforces all three.
      </Muted>
    </View>
  );
}
