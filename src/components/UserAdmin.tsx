import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/Toast';
import { Card, Choice, Empty, Field, Muted, Pill, Row, Strong, SubTitle, Segmented } from '@/components/UI';
import { AccountRequestRow, api, AppRole, AppSettings, AppUser } from '@/lib/api';
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
  const [invEmail, setInvEmail] = useState('');
  const [invName, setInvName] = useState('');
  const [invPhone, setInvPhone] = useState('');
  const [inviteSms, setInviteSms] = useState(false);
  const [invRole, setInvRole] = useState<AppRole>('shooter');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [requests, setRequests] = useState<AccountRequestRow[]>([]);
  const [phoneEdit, setPhoneEdit] = useState<{ id: string; value: string } | null>(null);
  const [tab, setTab] = useState<'users' | 'general' | 'notify'>('users');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [twSid, setTwSid] = useState('');
  const [twToken, setTwToken] = useState('');
  const [twVerify, setTwVerify] = useState('');
  const [twFrom, setTwFrom] = useState('');
  const [smHost, setSmHost] = useState('');
  const [smPort, setSmPort] = useState('587');
  const [smUser, setSmUser] = useState('');
  const [smPass, setSmPass] = useState('');
  const [smFrom, setSmFrom] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [u, r, st] = await Promise.all([
        api.adminListUsers(token),
        api.adminListRequests(token),
        api.adminGetSettings(token),
      ]);
      setUsers(u);
      setRequests(r);
      setSettings(st);
      setTwSid(st.twilio_account_sid);
      setTwVerify(st.twilio_verify_sid);
      setTwFrom(st.twilio_sms_from);
      setSmHost(st.smtp_host); setSmPort(st.smtp_port); setSmUser(st.smtp_user); setSmFrom(st.smtp_from);
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

  const createInvite = async () => {
    if (!token || busy) return;
    if (!invEmail.trim()) { toast('Enter an email for the invite'); return; }
    setBusy(true);
    try {
      const r = await api.adminCreateUser(token, { email: invEmail.trim(), display_name: invName.trim(), role: invRole, phone: invPhone.trim() });
      setInviteLink(r.invite_link);
      setInviteSms(r.sms_sent);
      setInvEmail(''); setInvName(''); setInvPhone('');
      toast(r.sms_sent ? 'Invite sent by text' : 'Account created — share the invite link');
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Invite failed');
    }
    setBusy(false);
  };

  const patchSettings = (patch: Parameters<typeof api.adminPatchSettings>[1], msg: string) =>
    run(async () => {
      const st = await api.adminPatchSettings(token!, patch);
      setSettings(st);
      setTwSid(st.twilio_account_sid);
      setTwVerify(st.twilio_verify_sid);
      setTwFrom(st.twilio_sms_from);
      setTwToken('');
      setSmHost(st.smtp_host); setSmPort(st.smtp_port); setSmUser(st.smtp_user); setSmFrom(st.smtp_from);
      setSmPass('');
    }, msg);

  return (
    <View>
      <Segmented
        options={[{ key: 'users', label: 'Users' }, { key: 'general', label: 'General' }, { key: 'notify', label: 'Email & Text' }]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'general' && settings ? (
        <Card>
          <Choice<'open' | 'closed'>
            label="Signup"
            options={[{ key: 'open', label: 'Open' }, { key: 'closed', label: 'Invite-only' }]}
            value={settings.signup_mode}
            onChange={(v) => patchSettings({ signup_mode: v }, v === 'open' ? 'Signup opened' : 'Signup closed — invite/request only')}
          />
          <Choice<'off' | 'required'>
            label="Phone verification (signup + SMS reset)"
            options={[{ key: 'off', label: 'Off' }, { key: 'required', label: 'Required' }]}
            value={settings.phone_verification}
            onChange={(v) => patchSettings({ phone_verification: v }, v === 'required' ? 'Phone verification required' : 'Phone verification off')}
          />
        </Card>
      ) : null}

      {tab === 'notify' && settings ? (
        <Card>
          <SubTitle style={{ marginTop: 0 }}>Text messages (Twilio)</SubTitle>
          <Muted style={{ fontSize: 11, marginBottom: 10 }}>
            {settings.twilio_configured
              ? '✓ Twilio connected — codes are sent by SMS.'
              : 'Twilio not configured — codes print to the API logs (testing mode). Add your Twilio Verify credentials to send real texts.'}
          </Muted>
          <Field label="Twilio Account SID" value={twSid} onChangeText={setTwSid} placeholder="AC…" autoCapitalize="none" />
          <Field
            label={settings.twilio_auth_token_set ? 'Twilio Auth Token (saved — enter to replace)' : 'Twilio Auth Token'}
            value={twToken}
            onChangeText={setTwToken}
            placeholder={settings.twilio_auth_token_set ? '••••••••' : 'Auth token'}
            secureTextEntry
            autoCapitalize="none"
          />
          <Field label="Twilio Verify Service SID" value={twVerify} onChangeText={setTwVerify} placeholder="VA…" autoCapitalize="none" />
          <Field label="SMS sender — Twilio number or Messaging Service SID (for texted invites)" value={twFrom} onChangeText={setTwFrom} placeholder="+18885551234 or MG…" autoCapitalize="none" />
          <Muted style={{ fontSize: 11, marginBottom: 10 }}>
            {settings.sms_sender_configured
              ? '✓ SMS sender set — invites with a phone number are texted automatically.'
              : 'Texted invites need a Twilio number you own (toll-free is easiest; it must pass toll-free verification before carriers deliver). Verification codes work without this.'}
          </Muted>
          <SubTitle style={{ marginTop: 16 }}>Email (SMTP)</SubTitle>
          <Muted style={{ fontSize: 11, marginBottom: 10 }}>
            {settings.email_configured
              ? '✓ Email connected — reset links and invites are emailed.'
              : 'Email not configured — links print to the API logs. Any SMTP provider works (Brevo free tier: host smtp-relay.brevo.com, port 587, your SMTP login + key).'}
          </Muted>
          <Field label="SMTP host" value={smHost} onChangeText={setSmHost} placeholder="smtp-relay.brevo.com" autoCapitalize="none" />
          <Field label="SMTP port" value={smPort} onChangeText={setSmPort} placeholder="587" keyboardType="number-pad" />
          <Field label="SMTP login" value={smUser} onChangeText={setSmUser} placeholder="you@smtp-brevo.com" autoCapitalize="none" />
          <Field
            label={settings.smtp_password_set ? 'SMTP password / key (saved — enter to replace)' : 'SMTP password / key'}
            value={smPass}
            onChangeText={setSmPass}
            placeholder={settings.smtp_password_set ? '••••••••' : 'SMTP key'}
            secureTextEntry
            autoCapitalize="none"
          />
          <Field label="From address" value={smFrom} onChangeText={setSmFrom} placeholder="noreply@jwbegroup.com" autoCapitalize="none" keyboardType="email-address" />
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pill
              title="Save messaging settings"
              onPress={() =>
                patchSettings(
                  {
                    twilio_account_sid: twSid.trim(),
                    twilio_verify_sid: twVerify.trim(),
                    twilio_sms_from: twFrom.trim(),
                    smtp_host: smHost.trim(),
                    smtp_port: smPort.trim(),
                    smtp_user: smUser.trim(),
                    smtp_from: smFrom.trim(),
                    ...(twToken.trim() ? { twilio_auth_token: twToken.trim() } : {}),
                    ...(smPass.trim() ? { smtp_password: smPass.trim() } : {}),
                  },
                  'Settings saved',
                )
              }
            />
            <Pill
              title="Clear"
              quiet
              onPress={() =>
                patchSettings(
                  { twilio_account_sid: '', twilio_auth_token: '', twilio_verify_sid: '', twilio_sms_from: '', smtp_host: '', smtp_user: '', smtp_password: '', smtp_from: '' },
                  'Messaging credentials cleared — back to log mode',
                )
              }
            />
          </View>
        </Card>
      ) : null}

      {tab === 'users' && (
      <View>
      {requests.length > 0 && (
        <View>
          <SubTitle style={{ marginTop: 0 }}>Account requests</SubTitle>
          {requests.map((r) => (
            <Card key={r.id}>
              <Row style={{ alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Strong style={{ fontSize: 14, fontWeight: '600' }}>{r.display_name || r.email}</Strong>
                  <Muted style={{ fontSize: 11 }}>{r.email}{r.phone ? ' · ' + r.phone : ''} · {new Date(r.created_at).toLocaleDateString()}</Muted>
                  {r.note ? <Muted style={{ fontSize: 12, marginTop: 4 }}>"{r.note}"</Muted> : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pill
                    title="Approve"
                    onPress={() =>
                      run(async () => {
                        const res = await api.adminApproveRequest(token!, r.id);
                        setInviteLink(res.invite_link);
                      }, 'Approved — share the invite link below')
                    }
                  />
                  <Pill title="Reject" quiet onPress={() => run(() => api.adminRejectRequest(token!, r.id), 'Request rejected')} />
                </View>
              </Row>
            </Card>
          ))}
        </View>
      )}

      <SubTitle>Invite an account</SubTitle>
      <Card>
        <Field label="Email" value={invEmail} onChangeText={setInvEmail} placeholder="them@example.com" autoCapitalize="none" keyboardType="email-address" />
        <Field label="Name (optional)" value={invName} onChangeText={setInvName} />
        <Field label="Mobile phone (optional — invite is texted when an SMS sender is set up)" value={invPhone} onChangeText={setInvPhone} placeholder="(630) 555-0123" keyboardType="phone-pad" />
        <Choice<AppRole> label="Role" options={ROLES} value={invRole} onChange={setInvRole} />
        <Pill title={busy ? 'Working…' : 'Create invite'} onPress={createInvite} style={{ alignSelf: 'flex-start' }} />
        {inviteLink ? (
          <View style={{ marginTop: 12 }}>
            {inviteSms ? (
              <Muted style={{ fontSize: 11, marginBottom: 4 }}>✓ Texted to their phone. Link below as backup:</Muted>
            ) : (
              <Muted style={{ fontSize: 11, marginBottom: 4 }}>
                One-time link, expires in 24 hours — they open it and set their own password. It's also emailed if SMTP is configured (otherwise it appears in the API logs).
              </Muted>
            )}
            <Text selectable style={{ fontSize: 12, color: theme.accent, fontWeight: '700' }}>{inviteLink}</Text>
          </View>
        ) : null}
      </Card>

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
                  <Muted style={{ fontSize: 11 }}>
                    {u.phone ? `📱 ${u.phone}` : 'No phone on file — SMS reset unavailable'}
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
              {phoneEdit?.id === u.id ? (
                <View style={{ marginTop: 10 }}>
                  <Field
                    label="Mobile phone"
                    value={phoneEdit.value}
                    onChangeText={(v) => setPhoneEdit({ id: u.id, value: v })}
                    placeholder="(630) 555-0123 — leave empty to clear"
                    keyboardType="phone-pad"
                  />
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Pill
                      title="Save phone"
                      onPress={() => {
                        const v = phoneEdit.value;
                        setPhoneEdit(null);
                        run(() => api.adminPatchUser(token!, u.id, { phone: v }), v.trim() ? 'Phone updated' : 'Phone cleared');
                      }}
                    />
                    <Pill title="Cancel" quiet onPress={() => setPhoneEdit(null)} />
                  </View>
                </View>
              ) : (
                <View style={{ marginTop: 8 }}>
                  <Pill
                    title={u.phone ? 'Edit phone' : 'Add phone'}
                    quiet
                    style={{ alignSelf: 'flex-start' }}
                    onPress={() => setPhoneEdit({ id: u.id, value: u.phone })}
                  />
                </View>
              )}
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
      )}
    </View>
  );
}
