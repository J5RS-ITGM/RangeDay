/**
 * Domain types. These mirror the mockup's mock DB and are shaped to map
 * onto the Supabase schema (M1) and the local SQLite store (M2).
 */

export type Visibility = 'private' | 'org' | 'public';
export type Role = 'shooter' | 'instructor_pending' | 'instructor' | 'admin';
export type RunStatus = 'scored' | 'DQ' | 'DNF';
export type Zone = 'A' | 'C' | 'D' | 'miss';
export type Discipline =
  | 'USPSA'
  | 'USPSA Classic'
  | 'IDPA'
  | '3-Gun'
  | 'Steel'
  | 'LE Qualification'
  | 'Generic';

export const DISCIPLINES: Discipline[] = [
  'USPSA',
  'USPSA Classic',
  'IDPA',
  '3-Gun',
  'Steel',
  'LE Qualification',
  'Generic',
];

export interface Profile {
  id: string;
  name: string;
  initial: string;
  sub: string;
}

export interface Account {
  id: string;
  email: string;
  org: string;
  role: Role;
  profiles: Profile[];
}

/** Shared row shape for anything RLS filters on */
export interface Visible {
  owner: string;
  vis: Visibility;
  org: string | null;
}

export interface Contact extends Visible {
  name: string;
  sub: string;
  initial: string;
}

export interface Drill extends Visible {
  id: string;
  name: string;
  meta: string;
  disc: Discipline;
  difficulty: number;
  note?: string;
}

export interface PubDrill {
  id: string;
  srcId: string | null;
  name: string;
  disc: Discipline;
  meta: string;
  difficulty: number;
  rating: { avg: number; count: number };
  author: string;
  status: 'published' | 'pending';
}

export interface Session extends Visible {
  id: string;
  name: string;
  desc: string;
  drills: string[];
  note?: string;
}

export interface Firearm {
  label: string;
  cal: string;
  rounds: number;
  interval: number;
}

export interface Gear {
  label: string;
  sub: string;
}

export interface Post extends Visible {
  author: string;
  initial: string;
  time: string;
  title: string;
  body: string;
  likes: number;
  liked: boolean;
}

export interface Run {
  id: string;
  owner: string;
  profile: string;
  profName: string;
  name: string;
  sessKey: string | null;
  sessName: string | null;
  status: RunStatus;
  hf: number;
  pts: number;
  time: number;
  rounds: number;
  breakdown: string;
  penalties: string;
  gun: string;
  alphaCount: number;
  missCount: number;
  procs: number;
  nss: number;
  addls: number;
  date: string;
}

export interface Hit {
  zone: Zone;
  pts: number;
  /** null when added via counter chip (no target position) */
  x: number | null;
  y: number | null;
  /** true for quick-fill hits — positions are synthetic */
  prefilled?: boolean;
}
