// Business metrics for the overview page. Pure functions over payments and state.
import { dayKey, paymentBreakdown } from "../../lib/model";
import type { AdminState, Driver, Payment, Ticket, Withdrawal } from "./types";
import { firstAgentReply, isOverdue } from "./support";
import { reviewQueue } from "./verification";

export const DAY = 86_400_000;

/** What the passenger paid: fare + tip + passenger fee (0–3 MAD, +0,50 at night). */
export const paid = (p: Payment) => paymentBreakdown(p.fare, p.tip, p.at).total;
/** What the driver received: fare + tip + the driver's 10 % of the fee. */
export const credited = (p: Payment) =>
  paymentBreakdown(p.fare, p.tip, p.at).credit;
/** What TapTaxi keeps: the passenger fee minus the driver's 10 %. */
export const commission = (p: Payment) => {
  const b = paymentBreakdown(p.fare, p.tip, p.at);
  return b.fee - b.driverFee;
};

const sum = <T>(items: T[], fn: (t: T) => number) =>
  items.reduce((n, t) => n + fn(t), 0);

export const inWindow = (p: { at: number }, from: number, to: number) =>
  p.at > from && p.at <= to;

function windowMetrics(
  payments: Payment[],
  withdrawals: Withdrawal[],
  from: number,
  to: number,
) {
  const list = payments.filter((p) => inWindow(p, from, to));
  const volume = sum(list, paid);
  return {
    count: list.length,
    volume,
    revenue: sum(list, commission),
    tips: sum(list, (p) => p.tip),
    averageTicket: list.length ? Math.round(volume / list.length) : 0,
    activeDrivers: new Set(list.map((p) => p.driverId)).size,
    withdrawn: sum(
      withdrawals.filter((w) => w.status === "paid" && inWindow(w, from, to)),
      (w) => w.amount,
    ),
  };
}
export type Metrics = ReturnType<typeof windowMetrics>;

/** Relative change, or null when there is nothing to compare against. */
export const change = (current: number, previous: number) =>
  previous ? (current - previous) / previous : null;

/** Metrics for the last `days` days, with the same metrics for the period before. */
export function kpis(
  payments: Payment[],
  withdrawals: Withdrawal[],
  days: number,
  now = Date.now(),
) {
  const span = days * DAY;
  return {
    current: windowMetrics(payments, withdrawals, now - span, now),
    previous: windowMetrics(payments, withdrawals, now - 2 * span, now - span),
  };
}

export interface DayPoint {
  key: string;
  at: number;
  volume: number;
  count: number;
}

/** One point per calendar day (Casablanca time), oldest first, including empty days. */
export function dailySeries(
  payments: Payment[],
  days: number,
  now = Date.now(),
): DayPoint[] {
  const points: DayPoint[] = [];
  const index = new Map<string, DayPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const at = now - i * DAY;
    const point = { key: dayKey(at), at, volume: 0, count: 0 };
    points.push(point);
    index.set(point.key, point);
  }
  const from = now - days * DAY;
  for (const p of payments) {
    if (p.at <= from - DAY || p.at > now) continue;
    const point = index.get(dayKey(p.at));
    if (!point) continue;
    point.volume += paid(p);
    point.count += 1;
  }
  return points;
}

export function methodSplit(payments: Payment[], from: number, to: number) {
  const list = payments.filter((p) => inWindow(p, from, to));
  const part = (method: Payment["method"]) => {
    const items = list.filter((p) => p.method === method);
    return { count: items.length, volume: sum(items, paid) };
  };
  return { card: part("card"), wallet: part("wallet"), total: list.length };
}

export function topDrivers(
  payments: Payment[],
  drivers: Driver[],
  from: number,
  to: number,
  limit = 5,
) {
  const totals = new Map<string, { volume: number; count: number }>();
  for (const p of payments) {
    if (!inWindow(p, from, to)) continue;
    const t = totals.get(p.driverId) ?? { volume: 0, count: 0 };
    t.volume += paid(p);
    t.count += 1;
    totals.set(p.driverId, t);
  }
  return [...totals.entries()]
    .map(([id, t]) => ({ driver: drivers.find((d) => d.id === id), ...t }))
    .filter((row): row is typeof row & { driver: Driver } => !!row.driver)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit);
}

/** Per-driver figures for the driver directory and profile. */
export function driverStats(
  driverId: string,
  payments: Payment[],
  withdrawals: Withdrawal[],
  now = Date.now(),
) {
  const mine = payments.filter((p) => p.driverId === driverId);
  const recent = mine.filter((p) => inWindow(p, now - 30 * DAY, now));
  const out = withdrawals.filter(
    (w) => w.driverId === driverId && w.status !== "failed",
  );
  const earned = sum(mine, credited);
  return {
    paymentsLast30: recent.length,
    volumeLast30: sum(recent, paid),
    earned,
    withdrawn: sum(out, (w) => w.amount),
    balance: earned - sum(out, (w) => w.amount),
    lastPaymentAt: mine.reduce((max, p) => Math.max(max, p.at), 0) || undefined,
  };
}

export function supportStats(tickets: Ticket[], now = Date.now()) {
  const unresolved = tickets.filter((t) => t.status !== "resolved");
  const replyTimes = tickets
    .map((t) => {
      const reply = firstAgentReply(t);
      return reply ? reply.at - t.createdAt : null;
    })
    .filter((n): n is number => n !== null);
  return {
    open: tickets.filter((t) => t.status === "open").length,
    unresolved: unresolved.length,
    overdue: unresolved.filter((t) => isOverdue(t, now)).length,
    urgent: unresolved.filter((t) => t.priority === "urgent").length,
    medianFirstReply: median(replyTimes),
  };
}

export function verificationStats(s: AdminState, now = Date.now()) {
  const queue = reviewQueue(s);
  return {
    waiting: queue.length,
    oldestWaiting: queue[0] ? now - queue[0].submittedAt : 0,
    changesRequested: s.drivers.filter(
      (d) => d.application === "changes_requested",
    ).length,
  };
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}
