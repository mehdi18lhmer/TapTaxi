// Hash routing, like the driver web app: #/support/T-1042 → ["support", "T-1042"].
import { useEffect, useState } from "react";

const current = () => window.location.hash.replace(/^#\/?/, "");

export function go(path: string) {
  window.location.hash = path;
}

export function useRoute() {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const onChange = () => {
      setRoute(current());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route.split("/").filter(Boolean).map(decodeURIComponent);
}
