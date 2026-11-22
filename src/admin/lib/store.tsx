// Admin state: one persisted AdminState, generated payments, the signed-in agent and toasts.
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { AdminState, Payment } from "./types";
import { createAdminSeed, generatePayments } from "./seed";

const STATE_KEY = "taptaxi.admin.v1";
const AGENT_KEY = "taptaxi.admin.agent";
export const AGENTS = ["Salma B.", "Yassine K.", "Amina R."];

interface Toast {
  id: number;
  message: string;
  tone: "success" | "error";
}

interface AdminStore {
  state: AdminState;
  payments: Payment[];
  /** Captured once per load so every page computes "now" the same way. */
  now: number;
  agent: string;
  setAgent: (name: string) => void;
  /** Applies a state change; errors thrown by the rule become an error toast. */
  act: (fn: (s: AdminState) => AdminState, success?: string) => boolean;
  toast: (message: string, tone?: Toast["tone"]) => void;
  reset: () => void;
  toasts: Toast[];
}

const Context = createContext<AdminStore | null>(null);

function load(now: number): AdminState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    const parsed = raw ? (JSON.parse(raw) as AdminState) : null;
    if (parsed?.version === 1 && Array.isArray(parsed.drivers)) return parsed;
  } catch {
    // Corrupt or unavailable storage: start from the demo data.
  }
  return createAdminSeed(now);
}

function save(state: AdminState) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or full storage: the session keeps working in memory.
  }
}

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const [now] = useState(() => Date.now());
  const [state, setState] = useState(() => load(now));
  const ref = useRef(state);
  const [agent, setAgentState] = useState(() => {
    try {
      const saved = localStorage.getItem(AGENT_KEY);
      return saved && AGENTS.includes(saved) ? saved : AGENTS[0];
    } catch {
      return AGENTS[0];
    }
  });
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Payments depend only on the drivers, which change rarely.
  const payments = useMemo(
    () => generatePayments(state.drivers, now),
    [state.drivers, now],
  );

  const toast = useCallback(
    (message: string, tone: Toast["tone"] = "success") => {
      const id = Date.now() + Math.random();
      setToasts((list) => [...list, { id, message, tone }]);
      window.setTimeout(
        () => setToasts((list) => list.filter((t) => t.id !== id)),
        4200,
      );
    },
    [],
  );

  const act = useCallback(
    (fn: (s: AdminState) => AdminState, success?: string) => {
      try {
        const next = fn(ref.current);
        ref.current = next;
        setState(next);
        save(next);
        if (success) toast(success);
        return true;
      } catch (error) {
        toast(
          error instanceof Error ? error.message : "Action impossible.",
          "error",
        );
        return false;
      }
    },
    [toast],
  );

  const setAgent = useCallback((name: string) => {
    setAgentState(name);
    try {
      localStorage.setItem(AGENT_KEY, name);
    } catch {
      // Not persisted; fine for a demo.
    }
  }, []);

  const reset = useCallback(() => {
    const fresh = createAdminSeed(Date.now());
    ref.current = fresh;
    setState(fresh);
    save(fresh);
    toast("Données de démonstration réinitialisées.");
  }, [toast]);

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STATE_KEY || !e.newValue) return;
      try {
        const next = JSON.parse(e.newValue) as AdminState;
        ref.current = next;
        setState(next);
      } catch {
        // Ignore malformed writes from other tabs.
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <Context.Provider
      value={{
        state,
        payments,
        now,
        agent,
        setAgent,
        act,
        toast,
        reset,
        toasts,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useAdmin() {
  const value = use(Context);
  if (!value) throw new Error("AdminStoreProvider is required");
  return value;
}
