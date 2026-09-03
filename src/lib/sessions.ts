import { Run } from '@/store/types';

export interface SessionGroup { key: string; name: string; date: string; runs: Run[] }

/** Group a profile's runs by session instance (sessKey = sessionId|date) */
export function sessionGroups(runs: Run[]): SessionGroup[] {
  const groups: Record<string, SessionGroup> = {};
  runs.forEach((r) => {
    if (!r.sessKey) return;
    (groups[r.sessKey] = groups[r.sessKey] || { key: r.sessKey, name: r.sessName ?? 'Session', date: r.date, runs: [] }).runs.push(r);
  });
  return Object.values(groups);
}
