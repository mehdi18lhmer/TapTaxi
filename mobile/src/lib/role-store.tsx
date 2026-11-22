// Remembers the chosen role (driver or passenger) on this device.
// Kept apart from the demo ledger (store.tsx): it is a device preference, not account data.
import { createContext, use, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isRole } from './roles';
import type { Role } from './roles';

const KEY = 'taptaxi.native.role';

interface RoleStore {
  role: Role | null;
  /** null forgets the role, which brings back the choice screen. */
  setRole: (role: Role | null) => void;
}

const Context = createContext<RoleStore | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        if (mounted && isRole(saved)) setRoleState(saved);
      })
      .catch(() => {
        // Storage unavailable: ask again, nothing is lost.
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const setRole = useCallback((next: Role | null) => {
    setRoleState(next);
    const write = next ? AsyncStorage.setItem(KEY, next) : AsyncStorage.removeItem(KEY);
    write.catch(() => {
      // Not persisted: the choice still applies for this session.
    });
  }, []);

  // Render nothing until the saved role is known, so no screen flashes for the wrong role.
  if (!ready) return null;
  return <Context.Provider value={{ role, setRole }}>{children}</Context.Provider>;
}

export function useRole() {
  const value = use(Context);
  if (!value) throw new Error('RoleProvider is required');
  return value;
}
