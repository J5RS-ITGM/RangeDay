import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { api, isDemo } from '@/lib/api';

/**
 * Tracks how many incoming contact requests are pending, so the drawer
 * (Contacts badge) and menu button (red dot) can show an indicator from
 * anywhere. Refreshed on auth changes and when Contacts calls refresh().
 */
const Ctx = createContext<{ pending: number; refresh: () => void }>({ pending: 0, refresh: () => {} });

export function PendingProvider({ children }: { children: React.ReactNode }) {
  const { configured, token } = useAuth();
  const [pending, setPending] = useState(0);

  const refresh = useCallback(async () => {
    if (isDemo || !configured || !token) { setPending(0); return; }
    try {
      const r = await api.listContacts(token);
      setPending(r.incoming.length);
    } catch {
      /* ignore */
    }
  }, [configured, token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <Ctx.Provider value={{ pending, refresh }}>{children}</Ctx.Provider>;
}

export const usePending = () => useContext(Ctx);
