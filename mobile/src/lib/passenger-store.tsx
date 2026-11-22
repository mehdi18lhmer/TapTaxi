// Passenger account and saved cards on this device (see lib/passenger.ts for the rules).
import { createContext, use, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyPassenger, restorePassenger } from './passenger';
import type { PassengerState } from './passenger';

const KEY = 'taptaxi.native.passenger.v1';

interface PassengerStore {
  passenger: PassengerState;
  /** Applies a rule from lib/passenger.ts and saves it. Errors are shown and return false. */
  update: (fn: (s: PassengerState) => PassengerState) => Promise<boolean>;
}

const Context = createContext<PassengerStore | null>(null);

export function PassengerProvider({ children }: { children: ReactNode }) {
  const [passenger, setPassenger] = useState<PassengerState>(emptyPassenger);
  const ref = useRef(passenger);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!mounted) return;
        const restored = restorePassenger(raw);
        ref.current = restored;
        setPassenger(restored);
      })
      .catch(() => {
        // Storage unavailable: start logged out.
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const update = useCallback(async (fn: (s: PassengerState) => PassengerState) => {
    try {
      const next = fn(ref.current);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      ref.current = next;
      setPassenger(next);
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
  return <Context.Provider value={{ passenger, update }}>{children}</Context.Provider>;
}

export function usePassenger() {
  const value = use(Context);
  if (!value) throw new Error('PassengerProvider is required');
  return value;
}
