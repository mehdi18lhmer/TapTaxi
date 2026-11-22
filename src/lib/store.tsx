import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { restoreState, STORAGE_KEY } from "./model";
import type { AppState } from "./model";
type Store = {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => boolean;
  toast: (message: string) => void;
};
const Context = createContext<Store | null>(null);
function read() {
  try {
    return restoreState(localStorage.getItem(STORAGE_KEY));
  } catch {
    return restoreState(null);
  }
}
export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(read);
  const ref = useRef(state);
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = useCallback((text: string) => {
    setMessage(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(""), 4500);
  }, []);
  const update = useCallback(
    (fn: (s: AppState) => AppState) => {
      try {
        const next = fn(ref.current);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        ref.current = next;
        setState(next);
        return true;
      } catch (e) {
        toast(
          e instanceof Error
            ? e.message
            : "Impossible de sauvegarder. Vérifiez le stockage de votre navigateur.",
        );
        return false;
      }
    },
    [toast],
  );
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const next = restoreState(e.newValue);
        ref.current = next;
        setState(next);
      }
    };
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("storage", sync);
      clearTimeout(timer.current);
    };
  }, []);
  return (
    <Context.Provider value={{ state, update, toast }}>
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
          <button
            aria-label="Fermer la notification"
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function useStore() {
  const ctx = useContext(Context);
  if (!ctx) throw Error("Missing StoreProvider");
  return ctx;
}
export function go(path: string) {
  window.location.hash = path;
}
export function useRoute() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || "/");
  useEffect(() => {
    const handler = () => {
      setRoute(window.location.hash.slice(1) || "/");
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  return route;
}
