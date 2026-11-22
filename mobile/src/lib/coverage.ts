// CNSS & AMO social coverage for drivers: registration status, the monthly contribution,
// paying it from the TapTaxi wallet, payment history. Pure functions.
// Demo: no CNSS partner is connected; amounts and numbers are fictitious.
import { balance, dateLabel } from './model';
import type { AppState, Transaction } from './model';

export const COVERAGE = {
  cnssNumber: '128 455 709',
  regime: 'AMO des travailleurs non salariés (TNS)',
  /** Demo monthly contribution, in centimes. */
  monthly: 17500,
  registeredSince: 'octobre 2026',
  beneficiaries: 'Vous, votre conjointe et 2 enfants',
} as const;

const monthKey = (at: number) => dateLabel(at, { month: '2-digit', year: 'numeric' });

export const contributions = (s: AppState): Transaction[] =>
  s.transactions.filter((t) => t.kind === 'contribution');

export const paidThisMonth = (s: AppState, now = Date.now()) =>
  contributions(s).some((t) => monthKey(t.at) === monthKey(now));

/** Contributions are due on the last day of the month. */
export function dueDate(now = Date.now()) {
  const d = new Date(now);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 0, 0);
  return d.getTime();
}

export const daysUntilDue = (now = Date.now()) =>
  Math.max(0, Math.ceil((dueDate(now) - now) / 86_400_000));

export function contributionLabel(now = Date.now()) {
  return `Cotisation AMO · ${dateLabel(now, { month: 'long', year: 'numeric' })}`;
}

/** Pays this month's AMO contribution from the wallet. Only once per month. */
export function payContribution(s: AppState, id: string, now = Date.now()): AppState {
  if (paidThisMonth(s, now)) throw new Error('La cotisation de ce mois est déjà payée.');
  if (balance(s) < COVERAGE.monthly) throw new Error('Solde insuffisant pour payer la cotisation.');
  const t: Transaction = {
    id,
    kind: 'contribution',
    credit: -COVERAGE.monthly,
    fare: 0,
    tip: 0,
    fee: 0,
    method: 'wallet',
    at: now,
    label: contributionLabel(now),
  };
  return { ...s, transactions: [t, ...s.transactions] };
}
