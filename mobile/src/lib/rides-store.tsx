// Taxi requests, rides and bookings saved on this device (rules in lib/rides.ts).
import { createContext, use, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyRides, restoreRides } from './rides';
import type { RidesState } from './rides';

const KEY = 'taptaxi.native.rides.v1';

interface RidesStore {
  rides: RidesState;
  /** Applies a rule and saves it. A rule error is shown and returns false. */
  update: (fn: (s: RidesState) => RidesState) => Promise<boolean>;
}

const Context = createContext<RidesStore | null>(null);

export function RidesProvider({ children }: { children: ReactNode }) {
  const [rides, setRides] = useState<RidesState>(() => emptyRides());
  const ref = useRef(rides);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!mounted) return;
        const restored = restoreRides(raw);
        ref.current = restored;
        setRides(restored);
      })
      .catch(() => {
        // Storage unavailable: start with the demo data.
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const update = useCallback(async (fn: (s: RidesState) => RidesState) => {
    try {
      const next = fn(ref.current);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      ref.current = next;
      setRides(next);
      return true;
    } catch (error) {
      Alert.alert(
        'Impossible de continuer',
        error instanceof Error
          ? error.message
          : 'Le stockage de cet appareil n’est pas disponible.',
      );
      return false;
    }
  }, []);

  if (!ready) return null;
  return <Context.Provider value={{ rides, update }}>{children}</Context.Provider>;
}

export function useRides() {
  const value = use(Context);
  if (!value) throw new Error('RidesProvider is required');
  return value;
}
