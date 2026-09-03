import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/auth/AuthContext';
import { isDemo } from '@/lib/api';
import {
  SEED_ACCOUNTS,
  SEED_CONTACTS,
  SEED_DRILLS,
  SEED_EQUIPMENT,
  SEED_FIREARMS,
  SEED_MAINT,
  SEED_POSTS,
  SEED_PUB_DRILLS,
  SEED_RUNS,
  SEED_SESSIONS,
} from './seed';
import {
  Account,
  Contact,
  Drill,
  Firearm,
  Gear,
  Post,
  Profile,
  PubDrill,
  Run,
  Session,
  Visible,
} from './types';

/**
 * ACCOUNTS & PROFILES
 * One login (account) can hold up to 2 shooter profiles, so you can
 * score with a friend. RLS keys off the ACCOUNT (auth.uid); profiles
 * partition runs *within* it.
 *
 * This store is a faithful in-memory port of the mockup. Visibility
 * filtering here is a rehearsal only — production visibility comes from
 * Postgres RLS (M1), and persistence from SQLite + sync (M2).
 */

export interface ActiveSession {
  id: string;
  done: Record<string, true>;
}

interface DB {
  accounts: Account[];
  contacts: Contact[];
  drills: Drill[];
  pubDrills: PubDrill[];
  sessions: Session[];
  firearms: Record<string, Firearm[]>;
  equipment: Record<string, Gear[]>;
  maint: Record<string, Gear[]>;
  posts: Post[];
  runs: Run[];
}

interface StoreState {
  db: DB;
  acctId: string;
  profId: string;
  activeSess: ActiveSession | null;
  /** Compare selection (run ids or session keys) */
  cmpSel: string[];
  histTab: 'runs' | 'sessions';
  /** Remembered quick-fill defaults per drill */
  qfDefaults: Record<string, { n: number; zone: 'A' | 'C' | 'D' }>;
  runStreak: number;
  lastSavedDrill: string | null;
}

export const MAX_PROFILES = 2;

/** Demo mode: the full seeded dataset from the mockup. */
const demoInitialState: StoreState = {
  db: {
    accounts: SEED_ACCOUNTS,
    contacts: SEED_CONTACTS,
    drills: SEED_DRILLS,
    pubDrills: SEED_PUB_DRILLS,
    sessions: SEED_SESSIONS,
    firearms: SEED_FIREARMS,
    equipment: SEED_EQUIPMENT,
    maint: SEED_MAINT,
    posts: SEED_POSTS,
    runs: SEED_RUNS,
  },
  acctId: 'a1',
  profId: 'p1',
  activeSess: null,
  cmpSel: [],
  histTab: 'runs',
  qfDefaults: {},
  runStreak: 0,
  lastSavedDrill: null,
};

/**
 * Real accounts start clean: no test runs, contacts, posts, firearms,
 * or fake profiles. Built-in public drills and sessions stay — they're
 * product content (the starter library), not test data.
 */
function cleanInitialState(): StoreState {
  return {
    db: {
      accounts: [
        {
          id: 'me',
          email: '',
          org: 'org_default',
          role: 'shooter',
          profiles: [{ id: 'me-p1', name: 'Shooter', initial: 'S', sub: '' }],
        },
      ],
      contacts: [],
      drills: SEED_DRILLS.filter((d) => d.owner === 'sys' && d.vis === 'public'),
      pubDrills: [],
      sessions: SEED_SESSIONS.filter((s) => s.owner === 'sys' && s.vis === 'public'),
      firearms: {},
      equipment: {},
      maint: {},
      posts: [],
      runs: [],
    },
    acctId: 'me',
    profId: 'me-p1',
    activeSess: null,
    cmpSel: [],
    histTab: 'runs',
    qfDefaults: {},
    runStreak: 0,
    lastSavedDrill: null,
  };
}

export const todayLabel = () =>
  new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const uid = (p: string) => p + Date.now().toString(36) + Math.floor(Math.random() * 999);

type Updater = (s: StoreState) => StoreState;

interface StoreValue {
  state: StoreState;
  acct: Account;
  prof: Profile;
  canSee: (row: Visible) => boolean;
  myRuns: () => Run[];
  drillById: (id: string) => Drill | undefined;
  guns: () => Firearm[];

  // identity
  switchAccount: () => Account;
  switchProfile: (id?: string) => Profile | null;
  addProfile: (name: string) => string | null;
  saveProfileName: (name: string) => void;
  applyInstructor: () => void;
  approveInstructor: (acctId: string) => void;

  // contacts / armory
  addContact: (c: Omit<Contact, 'owner' | 'org' | 'initial'>) => void;
  addFirearm: (f: Omit<Firearm, 'rounds'>) => void;
  addEquipment: (g: Gear) => void;
  addMaint: (g: Gear) => void;

  // drills
  addDrill: (d: Pick<Drill, 'name' | 'meta' | 'disc' | 'difficulty' | 'vis'>) => void;
  loadCommunityDrill: (pubId: string) => void;
  publishDrill: (drillId: string) => 'published' | 'pending';
  approveDrill: (pubId: string) => void;
  rejectDrill: (pubId: string) => void;
  pubStatusFor: (drillId: string) => PubDrill['status'] | null;
  setDrillNote: (drillId: string, note: string) => void;

  // sessions
  addSession: (name: string, desc: string) => string;
  saveSession: (srcId: string, name: string, drills: string[], note: string) => 'copy' | 'update';
  startSession: (id: string) => void;
  markSessionDrillDone: (drillId: string) => void;

  // runs
  saveRun: (r: Omit<Run, 'id' | 'owner' | 'profile' | 'profName' | 'date'>, roundsFired: number, gunIndex: number) => Run;
  setQfDefault: (drillId: string, n: number, zone: 'A' | 'C' | 'D') => void;

  // history / compare
  toggleCompare: (key: string) => void;
  setHistTab: (t: 'runs' | 'sessions') => void;
  clearCompare: () => void;

  // community
  likePost: (index: number) => void;
  addPost: (text: string, vis: 'public' | 'org') => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { configured, appUser } = useAuth();
  const [state, setState] = useState<StoreState>(() => (isDemo ? demoInitialState : cleanInitialState()));
  const update = useCallback((fn: Updater) => setState(fn), []);

  // Real auth: mirror the signed-in account's identity/role into the local
  // store so drills publish under the right name and role logic matches.
  // (Local data persistence per account lands with the M2 sync work.)
  useEffect(() => {
    if (!configured || !appUser) return;
    setState((s) => ({
      ...s,
      db: {
        ...s.db,
        accounts: s.db.accounts.map((a) =>
          a.id === 'me'
            ? {
                ...a,
                email: appUser.email,
                role: appUser.role,
                profiles: a.profiles.map((p, i) =>
                  i === 0 && (p.name === 'Shooter' || p.sub === '')
                    ? { ...p, name: appUser.display_name || appUser.email.split('@')[0], initial: (appUser.display_name || appUser.email)[0].toUpperCase(), sub: appUser.email }
                    : p,
                ),
              }
            : a,
        ),
      },
    }));
  }, [configured, appUser]);

  const acct = state.db.accounts.find((a) => a.id === state.acctId)!;
  const prof = acct.profiles.find((p) => p.id === state.profId) ?? acct.profiles[0];

  const canSee = useCallback(
    (row: Visible) => {
      if (row.owner === acct.id) return true;
      if (row.vis === 'public') return true;
      if (row.vis === 'org' && row.org === acct.org) return true;
      return false;
    },
    [acct.id, acct.org],
  );

  const value = useMemo<StoreValue>(() => {
    const db = state.db;
    const patchDb = (p: Partial<DB>) => update((s) => ({ ...s, db: { ...s.db, ...p } }));
    const patchAccount = (id: string, p: Partial<Account>) =>
      update((s) => ({
        ...s,
        db: { ...s.db, accounts: s.db.accounts.map((a) => (a.id === id ? { ...a, ...p } : a)) },
      }));

    return {
      state,
      acct,
      prof,
      canSee,
      myRuns: () => db.runs.filter((r) => r.owner === acct.id && r.profile === prof.id),
      drillById: (id) => db.drills.find((d) => d.id === id),
      guns: () => db.firearms[acct.id] ?? [],

      switchAccount: () => {
        const i = db.accounts.findIndex((a) => a.id === acct.id);
        const next = db.accounts[(i + 1) % db.accounts.length];
        update((s) => ({ ...s, acctId: next.id, profId: next.profiles[0].id, cmpSel: [], activeSess: null }));
        return next;
      },
      switchProfile: (id) => {
        if (id) {
          const p = acct.profiles.find((x) => x.id === id);
          if (!p) return null;
          update((s) => ({ ...s, profId: id, cmpSel: [] }));
          return p;
        }
        if (acct.profiles.length < 2) return null;
        const i = acct.profiles.findIndex((p) => p.id === prof.id);
        const next = acct.profiles[(i + 1) % acct.profiles.length];
        update((s) => ({ ...s, profId: next.id, cmpSel: [] }));
        return next;
      },
      addProfile: (name) => {
        if (!name.trim()) return 'Give the profile a name';
        if (acct.profiles.length >= MAX_PROFILES) return `Max ${MAX_PROFILES} profiles per account`;
        const p: Profile = { id: uid('p'), name, initial: name[0].toUpperCase(), sub: 'Guest shooter' };
        patchAccount(acct.id, { profiles: [...acct.profiles, p] });
        return null;
      },
      saveProfileName: (name) => {
        if (!name.trim()) return;
        patchAccount(acct.id, {
          profiles: acct.profiles.map((p) =>
            p.id === prof.id ? { ...p, name, initial: name[0].toUpperCase() } : p,
          ),
        });
      },
      applyInstructor: () => patchAccount(acct.id, { role: 'instructor_pending' }),
      approveInstructor: (id) => patchAccount(id, { role: 'instructor' }),

      addContact: (c) =>
        patchDb({
          contacts: [
            ...db.contacts,
            { ...c, owner: acct.id, org: c.vis === 'org' ? acct.org : null, initial: c.name[0].toUpperCase() },
          ],
        }),
      addFirearm: (f) =>
        patchDb({ firearms: { ...db.firearms, [acct.id]: [...(db.firearms[acct.id] ?? []), { ...f, rounds: 0 }] } }),
      addEquipment: (g) =>
        patchDb({ equipment: { ...db.equipment, [acct.id]: [...(db.equipment[acct.id] ?? []), g] } }),
      addMaint: (g) =>
        patchDb({
          maint: {
            ...db.maint,
            [acct.id]: [...(db.maint[acct.id] ?? []), { ...g, sub: `${g.sub || 'Logged'} · ${todayLabel()}` }],
          },
        }),

      addDrill: (d) =>
        patchDb({
          drills: [
            ...db.drills,
            { ...d, id: uid('d'), owner: acct.id, org: d.vis === 'org' ? acct.org : null },
          ],
        }),
      loadCommunityDrill: (pubId) => {
        const p = db.pubDrills.find((x) => x.id === pubId);
        if (!p) return;
        patchDb({
          drills: [
            ...db.drills,
            { id: uid('d'), owner: acct.id, vis: 'private', org: null, name: p.name, meta: p.meta, disc: p.disc, difficulty: p.difficulty },
          ],
        });
      },
      publishDrill: (drillId) => {
        const d = db.drills.find((x) => x.id === drillId);
        const instant = acct.role === 'instructor' || acct.role === 'admin';
        const status = instant ? 'published' : 'pending';
        if (d) {
          patchDb({
            pubDrills: [
              {
                id: uid('cd'), srcId: d.id, name: d.name, disc: d.disc, meta: d.meta,
                difficulty: d.difficulty || 2, rating: { avg: 0, count: 0 },
                author: prof.name + (instant ? ' ★' : ''), status,
              },
              ...db.pubDrills,
            ],
          });
        }
        return status;
      },
      approveDrill: (pubId) =>
        patchDb({ pubDrills: db.pubDrills.map((p) => (p.id === pubId ? { ...p, status: 'published' } : p)) }),
      rejectDrill: (pubId) => patchDb({ pubDrills: db.pubDrills.filter((p) => p.id !== pubId) }),
      pubStatusFor: (drillId) => db.pubDrills.find((p) => p.srcId === drillId)?.status ?? null,
      setDrillNote: (drillId, note) =>
        patchDb({ drills: db.drills.map((d) => (d.id === drillId ? { ...d, note } : d)) }),

      addSession: (name, desc) => {
        const id = uid('s');
        patchDb({
          sessions: [...db.sessions, { id, owner: acct.id, vis: 'private', org: null, name, desc: desc || 'Custom plan', drills: [] }],
        });
        return id;
      },
      saveSession: (srcId, name, drills, note) => {
        const src = db.sessions.find((s) => s.id === srcId);
        if (!src) return 'update';
        if (src.owner !== acct.id) {
          patchDb({
            sessions: [...db.sessions, { id: uid('s'), owner: acct.id, vis: 'private', org: null, name, desc: 'Custom plan', note, drills }],
          });
          return 'copy';
        }
        patchDb({ sessions: db.sessions.map((s) => (s.id === srcId ? { ...s, name, drills, note } : s)) });
        return 'update';
      },
      startSession: (id) =>
        update((s) => ({
          ...s,
          activeSess: s.activeSess?.id === id ? s.activeSess : { id, done: {} },
        })),
      markSessionDrillDone: (drillId) =>
        update((s) =>
          s.activeSess ? { ...s, activeSess: { ...s.activeSess, done: { ...s.activeSess.done, [drillId]: true } } } : s,
        ),

      saveRun: (r, roundsFired, gunIndex) => {
        const run: Run = { ...r, id: uid('run'), owner: acct.id, profile: prof.id, profName: prof.name, date: todayLabel() };
        update((s) => {
          const guns = s.db.firearms[acct.id] ?? [];
          const newGuns = guns.map((g, i) => (i === gunIndex ? { ...g, rounds: g.rounds + roundsFired } : g));
          const drillKey = r.name;
          return {
            ...s,
            db: { ...s.db, runs: [run, ...s.db.runs], firearms: { ...s.db.firearms, [acct.id]: newGuns } },
            runStreak: s.lastSavedDrill === drillKey ? s.runStreak + 1 : 1,
            lastSavedDrill: drillKey,
          };
        });
        return run;
      },
      setQfDefault: (drillId, n, zone) =>
        update((s) => ({ ...s, qfDefaults: { ...s.qfDefaults, [drillId]: { n, zone } } })),

      toggleCompare: (key) =>
        update((s) => {
          let sel = s.cmpSel.includes(key) ? s.cmpSel.filter((k) => k !== key) : [...s.cmpSel, key];
          if (sel.length > 2) sel = sel.slice(1);
          return { ...s, cmpSel: sel };
        }),
      setHistTab: (t) => update((s) => (s.histTab === t ? s : { ...s, histTab: t, cmpSel: [] })),
      clearCompare: () => update((s) => ({ ...s, cmpSel: [] })),

      likePost: (index) =>
        patchDb({
          posts: db.posts.map((p, i) =>
            i === index ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p,
          ),
        }),
      addPost: (text, vis) =>
        patchDb({
          posts: [
            {
              owner: acct.id, vis, org: vis === 'org' ? acct.org : null, author: prof.name, initial: prof.initial,
              time: 'now', title: text.length > 48 ? text.slice(0, 48) + '…' : text, body: text, likes: 0, liked: false,
            },
            ...db.posts,
          ],
        }),
    };
  }, [state, acct, prof, canSee, update]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
