import type { AdminState } from "./types";

const MAX_ENTRIES = 200;

/** Every admin action is logged so the team can see who did what. */
export function addAudit(
  s: AdminState,
  actor: string,
  action: string,
  link?: string,
  now = Date.now(),
): AdminState {
  const entry = {
    id: `A${now}-${s.audit.length}`,
    at: now,
    actor,
    action,
    link,
  };
  return { ...s, audit: [entry, ...s.audit].slice(0, MAX_ENTRIES) };
}
