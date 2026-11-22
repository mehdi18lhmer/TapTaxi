// Driver account and payout operations. Pure functions: state in, state out.
import type { AdminState, Driver, WithdrawalStatus } from "./types";
import { addAudit } from "./audit";
import { money } from "../../lib/model";

function findDriver(s: AdminState, id: string): Driver {
  const driver = s.drivers.find((d) => d.id === id);
  if (!driver) throw new Error("Chauffeur introuvable.");
  return driver;
}

export function setSuspended(
  s: AdminState,
  driverId: string,
  suspend: boolean,
  reason: string,
  actor: string,
  now = Date.now(),
): AdminState {
  const driver = findDriver(s, driverId);
  if (suspend && driver.account !== "active")
    throw new Error("Seul un compte actif peut être suspendu.");
  if (!suspend && driver.account !== "suspended")
    throw new Error("Ce compte n’est pas suspendu.");
  if (suspend && !reason.trim())
    throw new Error("Indiquez la raison de la suspension.");
  const note = suspend ? `Suspension : ${reason.trim()}` : "Compte réactivé";
  const next: AdminState = {
    ...s,
    drivers: s.drivers.map((d) =>
      d.id === driverId
        ? {
            ...d,
            account: suspend ? "suspended" : "active",
            notes: [
              { id: `N${now}`, author: actor, body: note, at: now },
              ...d.notes,
            ],
          }
        : d,
    ),
  };
  return addAudit(
    next,
    actor,
    `${suspend ? "a suspendu" : "a réactivé"} le compte de ${driver.name}`,
    `/drivers/${driverId}`,
    now,
  );
}

export function addDriverNote(
  s: AdminState,
  driverId: string,
  body: string,
  actor: string,
  now = Date.now(),
): AdminState {
  findDriver(s, driverId);
  if (!body.trim()) throw new Error("La note est vide.");
  return {
    ...s,
    drivers: s.drivers.map((d) =>
      d.id === driverId
        ? {
            ...d,
            notes: [
              { id: `N${now}`, author: actor, body: body.trim(), at: now },
              ...d.notes,
            ],
          }
        : d,
    ),
  };
}

/** Pending withdrawals are settled once, as paid or failed. */
export function settleWithdrawal(
  s: AdminState,
  id: string,
  status: Exclude<WithdrawalStatus, "pending">,
  actor: string,
  now = Date.now(),
): AdminState {
  const w = s.withdrawals.find((x) => x.id === id);
  if (!w) throw new Error("Retrait introuvable.");
  if (w.status !== "pending") throw new Error("Ce retrait a déjà été traité.");
  const driver = findDriver(s, w.driverId);
  const next: AdminState = {
    ...s,
    withdrawals: s.withdrawals.map((x) => (x.id === id ? { ...x, status } : x)),
  };
  return addAudit(
    next,
    actor,
    `a marqué le retrait ${id} de ${driver.name} (${money(w.amount)} MAD) comme ${status === "paid" ? "versé" : "échoué"}`,
    `/transactions`,
    now,
  );
}
