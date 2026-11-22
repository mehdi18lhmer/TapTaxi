// Support requests saved on this device (rules in lib/support.ts).
import { createContext, use, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptySupport, restoreSupport } from './support';
import type { SupportState } from './support';

const KEY = 'taptaxi.native.support.v1';

interface SupportStore {
  support: SupportState;
  /** Applies a rule and saves it. A rule error is shown and returns false. */
  update: (fn: (s: SupportState) => SupportState) => Promise<boolean>;
}

const Context = createContext<SupportStore | null>(null);

export function SupportProvider({ children }: { children: ReactNode }) {
  const [support, setSupport] = useState<SupportState>(emptySupport);
  const ref = useRef(support);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!mounted) return;
        const restored = restoreSupport(raw);
        ref.current = restored;
        setSupport(restored);
      })
      .catch(() => {
        // Storage unavailable: start with no requests.
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const update = useCallback(async (fn: (s: SupportState) => SupportState) => {
    try {
      const next = fn(ref.current);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      ref.current = next;
      setSupport(next);
      return true;
    } catch (error) {
      Alert.alert(
        'Impossible d’envoyer',
        error instanceof Error
          ? error.message
          : 'Le stockage de cet appareil n’est pas disponible.',
      );
      return false;
    }
  }, []);

  if (!ready) return null;
  return <Context.Provider value={{ support, update }}>{children}</Context.Provider>;
}

export function useSupport() {
  const value = use(Context);
  if (!value) throw new Error('SupportProvider is required');
  return value;
}
