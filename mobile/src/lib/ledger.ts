// Native-only business rules built on top of the shared model (../../src/lib/model.ts).
// Screens call these instead of computing balances or building transactions inline.
// All amounts are integer centimes.
import {
  balance,
  dateLabel,
  dayKey,
  money,
  paymentBreakdown,
  timeLabel,
  todayPayments,
} from './model';
import type { AppState, Method, Transaction } from './model';

const DAY_MS = 86_400_000;

/** Daily earnings goal shown on the home screen (300 MAD). */
export const DAILY_GOAL = 30_000;
/** Typical payment, used to estimate how many rides remain to reach the goal. */
export const AVERAGE_PAYMENT = 2_350;
/** Fuel advance slider bounds, in whole MAD. */
export const FUEL_ADVANCE = { min: 30, max: 60, step: 15 } as const;

export const sumCredit = (items: Transaction[]) => items.reduce((n, t) => n + t.credit, 0);
export const sumTips = (items: Transaction[]) => items.reduce((n, t) => n + t.tip, 0);

// ---------- Today ----------

export function todaySummary(s: AppState, now = Date.now()) {
  const payments = todayPayments(s, now);
  return {
    payments,
    earned: sumCredit(payments),
    tips: sumTips(payments),
    /** The driver's 10 % of the passenger service fees. */
    feeShare: payments.reduce((n, t) => n + t.fee, 0),
  };
}

export function dailyGoalProgress(earned: number) {
  return {
    percent: Math.min(100, Math.round((earned / DAILY_GOAL) * 100)),
    reached: earned >= DAILY_GOAL,
    paymentsLeft: Math.max(0, Math.ceil((DAILY_GOAL - earned) / AVERAGE_PAYMENT)),
  };
}

// ---------- Withdrawals ----------

export function withdrawalError(amount: number | null, s: AppState): string | undefined {
  if (amount === null) return 'Saisissez un montant valide.';
  if (amount <= 0) return 'Le montant doit être supérieur à 0.';
  if (amount > balance(s)) return 'Ce montant dépasse votre solde.';
  return undefined;
}

// ---------- Owner payout ----------

export const ownerPayouts = (s: AppState) => s.transactions.filter((t) => t.kind === 'owner');

export function ownerPaidToday(s: AppState, now = Date.now()) {
  return ownerPayouts(s).some((t) => dayKey(t.at) === dayKey(now));
}

/** Records today's owner payout. Idempotent: a second payout on the same day is ignored. */
export function payOwner(s: AppState, id: string, now = Date.now()): AppState {
  if (!s.ownerEnabled) throw new Error('Activez le versement pour continuer.');
  if (ownerPaidToday(s, now)) return s;
  if (balance(s) < s.ownerAmount) throw new Error('Solde insuffisant.');
  const payout: Transaction = {
    id,
    kind: 'owner',
    credit: -s.ownerAmount,
    fare: 0,
    tip: 0,
    fee: 0,
    method: 'bank',
    at: now,
    label: 'Versement propriétaire',
  };
  return { ...s, transactions: [payout, ...s.transactions] };
}

// ---------- Fuel advance ----------

export const hasFuelAdvance = (s: AppState) => s.transactions.some((t) => t.kind === 'advance');

export function requestFuelAdvance(
  s: AppState,
  amountMad: number,
  id: string,
  now = Date.now(),
): AppState {
  if (hasFuelAdvance(s)) throw new Error('Une avance démo est déjà en cours.');
  if (amountMad < FUEL_ADVANCE.min || amountMad > FUEL_ADVANCE.max)
    throw new Error('Montant d’avance invalide.');
  const advance: Transaction = {
    id,
    kind: 'advance',
    credit: amountMad * 100,
    fare: 0,
    tip: 0,
    fee: 0,
    method: 'wallet',
    at: now,
    label: 'Avance carburant démo',
  };
  return { ...s, transactions: [advance, ...s.transactions] };
}

// ---------- History & statements ----------

export type HistoryPeriod = 'week' | 'month' | 'all';

export function filterHistory(
  s: AppState,
  period: HistoryPeriod,
  query: string,
  now = Date.now(),
): Transaction[] {
  const maxAge = period === 'week' ? 7 * DAY_MS : period === 'month' ? 30 * DAY_MS : Infinity;
  const needle = query.trim().toLowerCase();
  return s.transactions.filter(
    (t) => now - t.at < maxAge && `${t.label} ${t.id}`.toLowerCase().includes(needle),
  );
}

const monthLabel = (at: number) => dateLabel(at, { month: 'long', year: 'numeric' });

/** First day of the month `offset` months from now (0 = this month, -1 = last month). */
export function monthStart(offset: number, now = Date.now()) {
  const d = new Date(now);
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.getTime();
}

export function monthlyStatement(s: AppState, offset: number, now = Date.now()) {
  const month = monthLabel(monthStart(offset, now));
  const payments = s.transactions.filter((t) => t.kind === 'payment' && monthLabel(t.at) === month);
  const total = sumCredit(payments);
  const activeDays = new Set(payments.map((t) => dayKey(t.at))).size;
  // Four buckets: days 1–8, 9–16, 17–24, 25–end.
  const weeks = [0, 1, 2, 3].map((week) =>
    sumCredit(
      payments.filter((t) => {
        const day = Number(dateLabel(t.at, { day: 'numeric' }));
        return Math.min(3, Math.floor((day - 1) / 8)) === week;
      }),
    ),
  );
  return {
    month,
    payments,
    total,
    activeDays,
    averagePerDay: activeDays ? Math.round(total / activeDays) : 0,
    weeks,
  };
}

// ---------- Cash and split payments ----------

const findPayable = (s: AppState, id: string, now: number) => {
  const r = s.requests.find((r) => r.id === id);
  if (!r) throw new Error('Ce paiement est introuvable dans cette démo.');
  if (r.status === 'paid') return null;
  if (r.status === 'cancelled' || now >= r.expiresAt)
    throw new Error('Ce code a expiré ou a été annulé. Demandez un nouveau code.');
  return r;
};

/**
 * The passenger pays the driver in cash: the ride is recorded in the driver's history with no
 * digital payment, no service fee and no wallet credit.
 */
export function completeCashPayment(s: AppState, id: string, now = Date.now()): AppState {
  const r = findPayable(s, id, now);
  if (!r) return s;
  const ride: Transaction = {
    id,
    kind: 'cash',
    credit: 0,
    fare: r.fare,
    tip: 0,
    fee: 0,
    method: 'cash',
    at: now,
    label: 'Course en espèces',
  };
  return {
    ...s,
    requests: s.requests.map((x) => (x.id === id ? { ...x, status: 'paid' } : x)),
    transactions: [ride, ...s.transactions],
  };
}

export const MAX_SPLIT = 4;

/** Splits the meter fare in equal shares (the first share takes the leftover centimes). */
export function splitFare(fare: number, people: number): number[] {
  if (!Number.isInteger(people) || people < 2 || people > MAX_SPLIT)
    throw new Error(`Partagez entre 2 et ${MAX_SPLIT} personnes.`);
  const base = Math.floor(fare / people);
  return Array.from({ length: people }, (_, i) => (i === 0 ? fare - base * (people - 1) : base));
}

/** Each share pays its part of the meter plus the service fee computed on that share. */
export function splitPreview(fare: number, people: number, myTip = 0, at = Date.now()) {
  return splitFare(fare, people).map((share, i) =>
    paymentBreakdown(share, i === 0 ? myTip : 0, at),
  );
}

export interface SplitShare {
  payer: string;
  method: Exclude<Method, 'cash'>;
}

/** Share ids: the first one (this phone's passenger) keeps the payment id for the receipt. */
export const shareId = (id: string, index: number) => (index === 0 ? id : `${id}-${index + 1}`);

/**
 * Records one payment per person. The driver gets one confirmation per payment.
 * Only the first share (this phone's passenger) carries a tip.
 */
export function completeSplitPayment(
  s: AppState,
  id: string,
  shares: SplitShare[],
  myTip: number,
  now = Date.now(),
): AppState {
  const r = findPayable(s, id, now);
  if (!r) return s;
  if (!Number.isSafeInteger(myTip) || myTip < 0 || myTip > 100000)
    throw new Error('Pourboire invalide.');
  const parts = splitPreview(r.fare, shares.length, myTip, now);
  const payments: Transaction[] = parts.map((b, i) => ({
    id: shareId(id, i),
    kind: 'payment',
    credit: b.credit,
    fare: b.fare,
    tip: b.tip,
    fee: b.driverFee,
    method: shares[i].method,
    at: now + i, // keeps the shares in order
    label: 'Paiement partagé',
    split: { part: i + 1, of: shares.length, payer: shares[i].payer, ride: id },
  }));
  return {
    ...s,
    requests: s.requests.map((x) => (x.id === id ? { ...x, status: 'paid' } : x)),
    transactions: [...payments.reverse(), ...s.transactions],
  };
}

/** All the payments of a split ride, in share order. */
export const sharesOf = (s: AppState, rideId: string) =>
  s.transactions
    .filter((t) => t.split?.ride === rideId)
    .sort((a, b) => (a.split?.part ?? 0) - (b.split?.part ?? 0));

// ---------- SMS to the driver ----------

/** Text of the SMS the driver gets for a digital payment (amount + ride reference). */
export function paymentSms(t: Transaction) {
  const split = t.split ? ` (part ${t.split.part}/${t.split.of})` : '';
  return `TapTaxi : paiement reçu ${money(t.credit)} MAD${split} · course ${money(t.fare)} + bonus ${money(t.fee)}${t.tip ? ` + pourboire ${money(t.tip)}` : ''} · réf. TT-${t.id} · ${timeLabel(t.at)}`;
}

/** The driver's latest payment SMS (simulated, derived from the payments). */
export function driverSms(s: AppState, limit = 10) {
  return s.transactions
    .filter((t) => t.kind === 'payment')
    .slice(0, limit)
    .map((t) => ({ id: t.id, at: t.at, body: paymentSms(t) }));
}

// ---------- Earnings dashboard ----------

export type EarningsPeriod = 'today' | 'week' | 'month';

export function periodStart(period: EarningsPeriod, now = Date.now()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (period === 'week') d.setDate(d.getDate() - 6);
  if (period === 'month') d.setDate(1);
  return d.getTime();
}

export const periodLabel: Record<EarningsPeriod, string> = {
  today: 'Aujourd’hui',
  week: '7 derniers jours',
  month: 'Ce mois-ci',
};

export function earningsSummary(s: AppState, period: EarningsPeriod, now = Date.now()) {
  const from = periodStart(period, now);
  const items = s.transactions.filter((t) => t.at >= from && t.at <= now);
  const digital = items.filter((t) => t.kind === 'payment');
  const cash = items.filter((t) => t.kind === 'cash');
  const meterDigital = digital.reduce((n, t) => n + t.fare, 0);
  const meterCash = cash.reduce((n, t) => n + t.fare, 0);
  const tips = sumTips(digital);
  const bonus = digital.reduce((n, t) => n + t.fee, 0);
  const ownerPaid = -items.filter((t) => t.kind === 'owner').reduce((n, t) => n + t.credit, 0);
  const contributions = -items
    .filter((t) => t.kind === 'contribution')
    .reduce((n, t) => n + t.credit, 0);
  const digitalTotal = meterDigital + tips + bonus;
  const total = digitalTotal + meterCash;
  const days = new Map<string, number>();
  for (const t of [...digital, ...cash])
    days.set(dayKey(t.at), (days.get(dayKey(t.at)) ?? 0) + t.fare + t.tip + t.fee);
  return {
    period,
    from,
    rides: digital.filter((t) => !t.split || t.split.part === 1).length + cash.length,
    digitalCount: digital.length,
    cashCount: cash.length,
    digitalTotal,
    cashTotal: meterCash,
    tips,
    bonus,
    total,
    ownerPaid,
    contributions,
    /** What the driver keeps after the owner's share and contributions. */
    net: total - ownerPaid - contributions,
    digitalShare: total ? Math.round((digitalTotal / total) * 100) : 0,
    activeDays: days.size,
    items: [...digital, ...cash].sort((a, b) => b.at - a.at),
  };
}

// ---------- Owner – driver link ----------

/**
 * Today's settlement between the taxi owner and the driver: the owner gets a fixed daily
 * amount (set in "Versement propriétaire"), the rest of the day's earnings is the driver's.
 */
export function ownerSettlement(s: AppState, now = Date.now()) {
  const today = earningsSummary(s, 'today', now);
  const ownerAmount = s.ownerEnabled ? s.ownerAmount : 0;
  return {
    earned: today.total,
    ownerAmount,
    driverShare: Math.max(0, today.total - ownerAmount),
    paid: ownerPaidToday(s, now),
    ownerPercent: today.total ? Math.min(100, Math.round((ownerAmount / today.total) * 100)) : 0,
  };
}

/** One line per day for the history the owner and the driver both see. */
export function settlementHistory(s: AppState, days = 7, now = Date.now()) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dayKey(d.getTime());
    const of = s.transactions.filter((t) => dayKey(t.at) === key);
    const earned = of
      .filter((t) => t.kind === 'payment' || t.kind === 'cash')
      .reduce((n, t) => n + t.fare + t.tip + t.fee, 0);
    const owner = -of.filter((t) => t.kind === 'owner').reduce((n, t) => n + t.credit, 0);
    return { key, at: d.getTime(), earned, owner, driver: Math.max(0, earned - owner) };
  }).filter((d) => d.earned || d.owner);
}
