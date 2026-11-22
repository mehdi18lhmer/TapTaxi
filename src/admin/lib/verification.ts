// Document review rules. Pure functions: they take state and return new state.
import type { AdminState, Driver, DocType, DriverDocument } from "./types";
import { docTitle } from "./labels";
import { addAudit } from "./audit";

const DAY = 86_400_000;
const EXPIRY_WARNING_DAYS = 30;

export interface Check {
  label: string;
  ok: boolean;
  detail: string;
}

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** Automatic consistency checks shown to the reviewer. They advise; the human decides. */
export function documentChecks(driver: Driver, now = Date.now()): Check[] {
  const doc = (type: DocType) => driver.documents.find((d) => d.type === type);
  const checks: Check[] = [];

  const missing = (["cin", "permit", "vehicle", "photo"] as DocType[]).filter(
    (t) => !doc(t),
  );
  checks.push({
    label: "Dossier complet",
    ok: missing.length === 0,
    detail: missing.length
      ? `Manquant : ${missing.map((t) => docTitle[t]).join(", ")}`
      : "Les 4 documents sont fournis",
  });

  const cinName = doc("cin")?.fields["Nom complet"];
  if (cinName !== undefined) {
    const ok = normalize(cinName) === normalize(driver.name);
    checks.push({
      label: "Nom identique à la CIN",
      ok,
      detail: ok
        ? cinName
        : `Compte : ${driver.name} · CIN : ${cinName || "illisible"}`,
    });
  }

  const vehicle = doc("vehicle");
  if (vehicle) {
    const ok =
      normalize(vehicle.fields["Immatriculation"] ?? "") ===
      normalize(driver.plate);
    checks.push({
      label: "Plaque identique à la carte grise",
      ok,
      detail: ok
        ? driver.plate
        : `Compte : ${driver.plate} · Carte grise : ${vehicle.fields["Immatriculation"] || "illisible"}`,
    });
  }

  for (const d of driver.documents) {
    if (!d.expiresAt) continue;
    const daysLeft = Math.floor((d.expiresAt - now) / DAY);
    checks.push({
      label: `${docTitle[d.type]} en cours de validité`,
      ok: daysLeft >= 0,
      detail:
        daysLeft < 0
          ? `Expiré depuis ${-daysLeft} jour${-daysLeft > 1 ? "s" : ""}`
          : daysLeft <= EXPIRY_WARNING_DAYS
            ? `Expire dans ${daysLeft} jours — à surveiller`
            : `Valide encore ${Math.floor(daysLeft / 30)} mois`,
    });
  }
  return checks;
}

function updateDriver(
  s: AdminState,
  id: string,
  fn: (d: Driver) => Driver,
): AdminState {
  if (!s.drivers.some((d) => d.id === id))
    throw new Error("Chauffeur introuvable.");
  return { ...s, drivers: s.drivers.map((d) => (d.id === id ? fn(d) : d)) };
}

function setDocument(
  driver: Driver,
  type: DocType,
  patch: Partial<DriverDocument>,
): Driver {
  if (!driver.documents.some((d) => d.type === type))
    throw new Error("Document introuvable.");
  return {
    ...driver,
    documents: driver.documents.map((d) =>
      d.type === type ? { ...d, ...patch } : d,
    ),
  };
}

export function reviewDocument(
  s: AdminState,
  driverId: string,
  type: DocType,
  decision: { approve: true } | { approve: false; reason: string },
  actor: string,
  now = Date.now(),
): AdminState {
  if (!decision.approve && !decision.reason.trim())
    throw new Error("Indiquez la raison du refus.");
  const next = updateDriver(s, driverId, (d) =>
    setDocument(d, type, {
      status: decision.approve ? "approved" : "rejected",
      rejectionReason: decision.approve ? undefined : decision.reason.trim(),
      reviewedAt: now,
      reviewer: actor,
    }),
  );
  const driver = next.drivers.find((d) => d.id === driverId)!;
  return addAudit(
    next,
    actor,
    `${decision.approve ? "a validé" : "a refusé"} « ${docTitle[type]} » de ${driver.name}`,
    `/verifications/${driverId}`,
    now,
  );
}

/** What the final decision buttons allow, with the reason when they don't. */
export function decisionState(driver: Driver) {
  const pending = driver.documents.filter((d) => d.status === "pending").length;
  const rejected = driver.documents.filter(
    (d) => d.status === "rejected",
  ).length;
  const complete = driver.documents.length === 4;
  return {
    pending,
    rejected,
    canApprove: complete && pending === 0 && rejected === 0,
    approveHint: !complete
      ? "Le dossier est incomplet."
      : pending
        ? `Encore ${pending} document${pending > 1 ? "s" : ""} à vérifier.`
        : rejected
          ? "Un document refusé doit d’abord être renvoyé."
          : "",
    canRequestChanges: rejected > 0 || !complete,
  };
}

export function approveDriver(
  s: AdminState,
  driverId: string,
  actor: string,
  now = Date.now(),
): AdminState {
  const driver = s.drivers.find((d) => d.id === driverId);
  if (!driver) throw new Error("Chauffeur introuvable.");
  const { canApprove, approveHint } = decisionState(driver);
  if (!canApprove) throw new Error(approveHint);
  const next = updateDriver(s, driverId, (d) => ({
    ...d,
    application: "approved",
    account: "active",
  }));
  return addAudit(
    next,
    actor,
    `a validé l’inscription de ${driver.name}`,
    `/drivers/${driverId}`,
    now,
  );
}

export function requestChanges(
  s: AdminState,
  driverId: string,
  actor: string,
  now = Date.now(),
): AdminState {
  const driver = s.drivers.find((d) => d.id === driverId);
  if (!driver) throw new Error("Chauffeur introuvable.");
  if (!decisionState(driver).canRequestChanges)
    throw new Error("Refusez d’abord le document à renvoyer.");
  const next = updateDriver(s, driverId, (d) => ({
    ...d,
    application: "changes_requested",
  }));
  return addAudit(
    next,
    actor,
    `a demandé des corrections à ${driver.name}`,
    `/verifications/${driverId}`,
    now,
  );
}

export function rejectApplication(
  s: AdminState,
  driverId: string,
  reason: string,
  actor: string,
  now = Date.now(),
): AdminState {
  if (!reason.trim()) throw new Error("Indiquez la raison du refus.");
  const driver = s.drivers.find((d) => d.id === driverId);
  if (!driver) throw new Error("Chauffeur introuvable.");
  const next = updateDriver(s, driverId, (d) => ({
    ...d,
    application: "rejected",
    account: "rejected",
    notes: [
      {
        id: `N${now}`,
        author: actor,
        body: `Refus : ${reason.trim()}`,
        at: now,
      },
      ...d.notes,
    ],
  }));
  return addAudit(
    next,
    actor,
    `a refusé l’inscription de ${driver.name}`,
    `/verifications/${driverId}`,
    now,
  );
}

/** Applications waiting on the admin team, oldest first (first in, first served). */
export function reviewQueue(s: AdminState) {
  return s.drivers
    .filter((d) => d.application === "pending")
    .sort((a, b) => a.submittedAt - b.submittedAt);
}
