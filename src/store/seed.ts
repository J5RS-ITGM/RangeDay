import {
  Account,
  Contact,
  Drill,
  Firearm,
  Gear,
  Post,
  PubDrill,
  Run,
  Session,
} from './types';

/**
 * Seeded test data — identical to the v0.3 mockup so Home, Analytics,
 * History and Compare are populated on first launch. Replaced by real
 * Supabase rows in M1 and the local SQLite store in M2.
 */

export const SEED_ACCOUNTS: Account[] = [
  {
    id: 'a1',
    email: 'mike@example.com',
    org: 'org_falcon',
    role: 'shooter',
    profiles: [
      { id: 'p1', name: 'Mike R.', initial: 'M', sub: 'USPSA #A-10482 · Production' },
      { id: 'p2', name: 'Jess (guest)', initial: 'J', sub: 'Guest shooter' },
    ],
  },
  {
    id: 'a2',
    email: 'dana@example.com',
    org: 'org_metro',
    role: 'instructor',
    profiles: [{ id: 'p3', name: 'Dana K.', initial: 'D', sub: 'Metro PD · Firearms Unit' }],
  },
  {
    id: 'a3',
    email: 'riley@rangeday.app',
    org: 'org_falcon',
    role: 'admin',
    profiles: [{ id: 'p9', name: 'Riley (Admin)', initial: 'R', sub: 'Range Day moderation' }],
  },
];

export const SEED_CONTACTS: Contact[] = [
  { owner: 'a1', vis: 'private', org: null, name: 'Ray Alvarez', sub: 'RO · Falcon Ridge', initial: 'R' },
  { owner: 'a1', vis: 'org', org: 'org_falcon', name: 'Falcon Ridge Match Desk', sub: 'Club scheduling', initial: 'F' },
  { owner: 'a2', vis: 'private', org: null, name: 'Sgt. Wills', sub: 'Metro PD Range Master', initial: 'W' },
  { owner: 'a2', vis: 'org', org: 'org_metro', name: 'Metro Armorer', sub: 'Dept. equipment', initial: 'A' },
];

export const SEED_DRILLS: Drill[] = [
  { id: 'd1', owner: 'a1', vis: 'private', org: null, name: 'Draw to First Shot', meta: '1 rd · par 1.5s · 3–10 yd', disc: 'Generic', difficulty: 1 },
  { id: 'd2', owner: 'sys', vis: 'public', org: null, name: 'El Presidente', meta: '12 rds · 3 targets · turn & draw', disc: 'USPSA Classic', difficulty: 3 },
  { id: 'd3', owner: 'sys', vis: 'public', org: null, name: 'Bill Drill', meta: '6 rds · 7 yd · one target', disc: 'USPSA', difficulty: 2 },
  { id: 'd4', owner: 'a1', vis: 'org', org: 'org_falcon', name: 'Falcon Ridge Stage 3', meta: '18 rds · club match stage', disc: 'USPSA', difficulty: 3 },
  { id: 'd5', owner: 'a2', vis: 'org', org: 'org_metro', name: 'Metro Qual Course B', meta: '24 rds · duty holster · 25 yd', disc: 'LE Qualification', difficulty: 4 },
  { id: 'd6', owner: 'sys', vis: 'public', org: null, name: 'Dot Torture', meta: '50 rds · 3 yd · precision', disc: 'Generic', difficulty: 2 },
];

export const SEED_PUB_DRILLS: PubDrill[] = [
  { id: 'cd1', srcId: null, name: 'Blake Drill', disc: 'USPSA', meta: '12 rds · 3 targets · pure transitions', difficulty: 3, rating: { avg: 4.8, count: 340 }, author: 'A. Torres ★', status: 'published' },
  { id: 'cd2', srcId: null, name: '1-Reload-1', disc: 'USPSA', meta: '2 rds + reload · 7 yd', difficulty: 2, rating: { avg: 4.6, count: 212 }, author: 'D. Keller ★', status: 'published' },
  { id: 'cd3', srcId: null, name: 'Cold Start Standard', disc: 'LE Qualification', meta: '10 rds · duty gear · cold', difficulty: 4, rating: { avg: 4.2, count: 88 }, author: 'Metro Training ★', status: 'published' },
  { id: 'cd4', srcId: null, name: 'Half & Half', disc: 'Generic', meta: '10 rds · 5 slow 5 fast · 10 yd', difficulty: 1, rating: { avg: 3.9, count: 54 }, author: 'S. Park', status: 'pending' },
];

export const SEED_SESSIONS: Session[] = [
  { id: 's1', owner: 'sys', vis: 'public', org: null, name: 'Fundamentals Day', desc: 'Warm-up plan: draw, splits, transitions', drills: ['d1', 'd3', 'd2'] },
  { id: 's2', owner: 'sys', vis: 'public', org: null, name: 'Accuracy Block', desc: 'Slow-fire precision work', drills: ['d6', 'd1'] },
  { id: 's3', owner: 'a1', vis: 'private', org: null, name: 'Match Prep — Saturday', desc: 'Falcon Ridge club match tune-up', drills: ['d2', 'd4'] },
  { id: 's4', owner: 'a2', vis: 'org', org: 'org_metro', name: 'Metro Qual Block', desc: 'Quarterly qualification prep', drills: ['d5', 'd3'] },
];

export const SEED_FIREARMS: Record<string, Firearm[]> = {
  a1: [
    { label: 'Glock 34', cal: '9mm', rounds: 1240, interval: 3000 },
    { label: 'CZ Shadow 2', cal: '9mm', rounds: 3810, interval: 3000 },
    { label: 'STI DVC', cal: '.40 S&W', rounds: 720, interval: 2500 },
  ],
  a2: [
    { label: 'Glock 17 (Duty)', cal: '9mm', rounds: 5230, interval: 5000 },
    { label: 'Remington 870', cal: '12ga', rounds: 410, interval: 1000 },
  ],
};

export const SEED_EQUIPMENT: Record<string, Gear[]> = {
  a1: [
    { label: 'Safariland ALS Holster', sub: 'Kydex · OWB' },
    { label: 'Holosun 507C', sub: 'Optic · 2 MOA dot' },
  ],
  a2: [{ label: 'Duty Belt Rig', sub: 'Level III retention' }],
};

export const SEED_MAINT: Record<string, Gear[]> = {
  a1: [
    { label: 'CZ Shadow 2 — recoil spring', sub: 'Replaced at 3,500 rds · Jul 12' },
    { label: 'Glock 34 — full clean', sub: 'Cleaned · Aug 2' },
  ],
  a2: [{ label: 'G17 — armorer inspection', sub: 'Passed · Jun 30' }],
};

export const SEED_POSTS: Post[] = [
  { owner: 'sys', vis: 'public', org: null, author: 'Alex T.', initial: 'A', time: '2h ago', title: 'Finally broke a 6.0 HF on Bill Drill', likes: 14, liked: false, body: 'Sub-2.0 with all alphas at 7 yards. The difference was prepping the trigger during the press-out instead of after the dot settled.' },
  { owner: 'a1', vis: 'org', org: 'org_falcon', author: 'Mike R.', initial: 'M', time: '1d ago', title: 'Falcon Ridge match this Saturday', likes: 6, liked: false, body: 'Six stages, round count ~140. Setup crew meets at 6:30am — coffee provided.' },
  { owner: 'sys', vis: 'public', org: null, author: 'Priya N.', initial: 'P', time: '3d ago', title: 'Dry fire routine that actually stuck', likes: 31, liked: false, body: '15 minutes: 5 min draws, 5 min reloads, 5 min transitions on scaled targets. Consistency beat volume for me.' },
  { owner: 'a2', vis: 'org', org: 'org_metro', author: 'Dana K.', initial: 'D', time: '4d ago', title: 'Q3 qual schedule posted', likes: 3, liked: false, body: 'Night qual added this cycle. Bring duty light. Remedial slots Thursday mornings.' },
];

const base = { owner: 'a1', profile: 'p1', profName: 'Mike R.', status: 'scored' as const, penalties: '', procs: 0, nss: 0, addls: 0, missCount: 0 };

export const SEED_RUNS: Run[] = [
  { ...base, id: 'run1', name: 'Bill Drill', sessKey: null, sessName: null, hf: 15.15, pts: 30, time: 1.98, rounds: 6, breakdown: '6A 0C 0D 0M', gun: 'CZ Shadow 2', alphaCount: 6, date: 'Aug 26' },
  { ...base, id: 'run2', name: 'Bill Drill', sessKey: null, sessName: null, hf: 13.33, pts: 28, time: 2.1, rounds: 6, breakdown: '5A 1C 0D 0M', gun: 'CZ Shadow 2', alphaCount: 5, date: 'Aug 26' },
  { ...base, id: 'run3', name: 'Draw to First Shot', sessKey: 's1|Aug 24', sessName: 'Fundamentals Day', hf: 3.52, pts: 5, time: 1.42, rounds: 1, breakdown: '1A 0C 0D 0M', gun: 'Glock 34', alphaCount: 1, date: 'Aug 24' },
  { ...base, id: 'run4', name: 'Bill Drill', sessKey: 's1|Aug 24', sessName: 'Fundamentals Day', hf: 13.39, pts: 30, time: 2.24, rounds: 6, breakdown: '6A 0C 0D 0M', gun: 'Glock 34', alphaCount: 6, date: 'Aug 24' },
  { ...base, id: 'run5', name: 'El Presidente', sessKey: 's1|Aug 24', sessName: 'Fundamentals Day', hf: 8.18, pts: 56, time: 6.85, rounds: 12, breakdown: '10A 2C 0D 0M', gun: 'Glock 34', alphaCount: 10, date: 'Aug 24' },
  { ...base, id: 'run6', name: 'Draw to First Shot', sessKey: 's1|Aug 20', sessName: 'Fundamentals Day', hf: 2.29, pts: 3, time: 1.31, rounds: 1, breakdown: '0A 1C 0D 0M', gun: 'Glock 34', alphaCount: 0, date: 'Aug 20' },
  { ...base, id: 'run7', name: 'Bill Drill', sessKey: 's1|Aug 20', sessName: 'Fundamentals Day', hf: 10.61, pts: 26, time: 2.45, rounds: 6, breakdown: '4A 2C 0D 0M', gun: 'Glock 34', alphaCount: 4, date: 'Aug 20' },
  { ...base, id: 'run8', name: 'El Presidente', sessKey: 's1|Aug 20', sessName: 'Fundamentals Day', hf: 6.76, pts: 50, time: 7.4, rounds: 12, breakdown: '8A 3C 1D 0M', gun: 'Glock 34', alphaCount: 8, date: 'Aug 20' },
  { ...base, id: 'run9', name: 'Falcon Ridge Stage 3', sessKey: null, sessName: null, hf: 6.99, pts: 86, time: 12.3, rounds: 18, breakdown: '16A 2C 0D 0M', gun: 'STI DVC', alphaCount: 16, date: 'Aug 18' },
  { ...base, id: 'run10', profile: 'p2', profName: 'Jess (guest)', name: 'Bill Drill', sessKey: null, sessName: null, hf: 8.53, pts: 22, time: 2.58, rounds: 6, breakdown: '2A 3C 1D 0M', gun: 'Glock 34', alphaCount: 2, date: 'Aug 24' },
  { ...base, id: 'run11', owner: 'a2', profile: 'p3', profName: 'Dana K.', name: 'Metro Qual Course B', sessKey: null, sessName: null, hf: 7.62, pts: 106, time: 13.9, rounds: 24, breakdown: '19A 4C 1D 0M', gun: 'Glock 17 (Duty)', alphaCount: 19, date: 'Aug 22' },
];
