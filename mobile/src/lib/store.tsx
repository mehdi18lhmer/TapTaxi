import { createContext, use, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSeed, restoreState } from './model';
import type { AppState } from './model';
import { colors } from '@/theme';
// Demo state persisted on this device only. Separate key from the web app's storage.
const KEY = 'taptaxi.native.demo.v3';
type Store = {
  state: AppState;
  mutate: (fn: (s: AppState) => AppState) => Promise<boolean>;
  busy: boolean;
  notify: (message: string) => void;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(createSeed);
  const ref = useRef(state);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!mounted) return;
        const next = restoreState(raw);
        ref.current = next;
        setState(next);
      })
      .catch(() => {
        if (mounted)
          Alert.alert(
            'Stockage indisponible',
            'La démo a démarré avec les données d’exemple. Les modifications nécessitent un stockage disponible.',
          );
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const notify = useCallback((message: string) => Alert.alert('TapTaxi', message), []);
  const mutate = useCallback(async (fn: (s: AppState) => AppState) => {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    try {
      const next = fn(ref.current);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      ref.current = next;
      setState(next);
      return true;
    } catch (error) {
      Alert.alert(
        'Impossible de continuer',
        error instanceof Error
          ? error.message
          : 'Le stockage de cet appareil n’est pas disponible. Réessayez.',
      );
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }, []);
  if (!ready)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.red} />
      </View>
    );
  return <Context.Provider value={{ state, mutate, busy, notify }}>{children}</Context.Provider>;
}
export function useStore() {
  const value = use(Context);
  if (!value) throw Error('StoreProvider is required');
  return value;
}
