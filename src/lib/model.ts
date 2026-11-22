/** How a passenger paid. "wallet" is a mobile wallet (Orange Money…), "balance" the TapTaxi wallet. */
export type Method =
  "card" | "wallet" | "balance" | "applepay" | "googlepay" | "cash";
export type PayoutMethod = "agency" | "wallet" | "bank";
export interface Transaction {
  id: string;
  /** "cash": ride paid in cash to the driver (recorded, no wallet credit). "contribution": CNSS/AMO. */
  kind:
    "payment" | "withdrawal" | "owner" | "advance" | "cash" | "contribution";
  credit: number;
  fare: number;
  tip: number;
  fee: number;
  method: Method | PayoutMethod;
  at: number;
  label: string;
  /** Split payment: this transaction is one share of a ride paid by several people. */
  split?: { part: number; of: number; payer: string; ride: string };
}
export interface PaymentRequest {
  id: string;
  fare: number;
  createdAt: number;
  expiresAt: number;
  status: "waiting" | "connected" | "paid" | "cancelled";
}
export interface Withdrawal {
  id: string;
  amount: number;
  method: PayoutMethod;
  code: string;
  at: number;
}
export interface AppState {
  version: 2;
  openingBalance: number;
  transactions: Transaction[];
  requests: PaymentRequest[];
  withdrawals: Withdrawal[];
  readNotifications: boolean;
  sound: boolean;
  ownerAmount: number;
  ownerEnabled: boolean;
  payout: PayoutMethod;
  documents: string[];
  onboarded: boolean;
  phone: string;
}
export const STORAGE_KEY = "taptaxi.demo.v2";
export const money = (cents: number) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(cents / 100)
    .replace(/\u202f|\u00a0/g, " ");
export const dateLabel = (
  at: number,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" },
) =>
  new Intl.DateTimeFormat("fr-FR", {
    ...options,
    timeZone: "Africa/Casablanca",
  }).format(at);
export const timeLabel = (at: number) =>
  dateLabel(at, { hour: "2-digit", minute: "2-digit" });
export const dayKey = (at: number) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
export function parseMoney(input: string): number | null {
  const clean = input.trim().replace(/[ \u00a0\u202f]/g, "");
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(clean)) return null;
  const [whole, fraction = ""] = clean.replace(",", ".").split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents <= 10000000 ? cents : null;
}
const validAmount = (n: number) =>
  Number.isSafeInteger(n) && n > 0 && n <= 10000000;
/** Night service: 20:00–06:00, Casablanca time. */
export function isNight(at: number) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: "Africa/Casablanca",
    }).format(at),
  );
  return hour >= 20 || hour < 6;
}
/** Night surcharge on the passenger service fee (0,50 MAD). */
export const NIGHT_SURCHARGE = 50;
/** Day fee by meter fare (Day Pricing sheet): [fare from, fee], in centimes. */
export const FEE_TIERS: readonly (readonly [number, number])[] = [
  [0, 0],
  [1000, 100],
  [1500, 150],
  [2000, 200],
  [3000, 250],
  [4000, 300],
];
/** Passenger service fee: 0 to 3 MAD by day depending on the meter fare, +0,50 MAD at night. */
export function serviceFee(fare: number, at = Date.now()) {
  const day = [...FEE_TIERS].reverse().find(([from]) => fare >= from)?.[1] ?? 0;
  return day + (isNight(at) ? NIGHT_SURCHARGE : 0);
}
/** The driver earns 10 % of the passenger service fee on every digital payment. */
export const driverBonus = (fee: number) => Math.round(fee / 10);
export function paymentBreakdown(fare: number, tip = 0, at = Date.now()) {
  const fee = serviceFee(fare, at);
  const driverFee = driverBonus(fee);
  return {
    fare,
    tip,
    fee,
    driverFee,
    night: isNight(at),
    total: fare + tip + fee,
    credit: fare + tip + driverFee,
  };
}
/** Service fee the passenger paid on a recorded ride (no fee on cash rides). */
export const passengerFeeOf = (t: Transaction) =>
  t.kind === "payment" ? serviceFee(t.fare, t.at) : 0;
/** What the passenger paid for a recorded ride: fare + tip + service fee. */
export const passengerPaid = (t: Transaction) =>
  t.fare + t.tip + passengerFeeOf(t);
export function balance(s: AppState) {
  return (
    s.openingBalance + s.transactions.reduce((sum, t) => sum + t.credit, 0)
  );
}
export function todayPayments(s: AppState, now = Date.now()) {
  return s.transactions.filter(
    (t) => t.kind === "payment" && dayKey(t.at) === dayKey(now),
  );
}
export function createSeed(now = Date.now()): AppState {
  const atHour = (day: number, hour: number, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - day);
    d.setHours(hour, minute, 0, 0);
    return d.getTime();
  };
  const payment = (
    id: string,
    fare: number,
    tip: number,
    at: number,
    method: Method,
  ): Transaction => {
    const b = paymentBreakdown(fare, tip, at);
    return {
      id,
      kind: "payment",
      credit: b.credit,
      fare,
      tip,
      fee: b.driverFee,
      method,
      at,
      label: "Paiement",
    };
  };
  const cash = (id: string, fare: number, at: number): Transaction => ({
    id,
    kind: "cash",
    credit: 0,
    fare,
    tip: 0,
    fee: 0,
    method: "cash",
    at,
    label: "Course en espèces",
  });
  const amounts = [2350, 3750, 1100, 2125, 1875, 2500, 3000, 1950];
  const transactions: Transaction[] = amounts.map((credit, i) => {
    const tip = i === 1 ? 1000 : i === 6 ? 500 : 0;
    return payment(
      ["AB12", "AA97", "AA91", "AA88", "AA82", "AA79", "AA75", "AA71"][i],
      credit - 50 - tip,
      tip,
      atHour(0, 14 - Math.floor(i / 2), i === 0 ? 32 : 48 - i * 3),
      i % 2 ? "wallet" : "card",
    );
  });
  transactions.push(cash("CA31", 1400, atHour(0, 11, 5)));
  transactions.push(cash("CA27", 2600, atHour(0, 9, 40)));
  transactions.push({
    id: "OWN17",
    kind: "owner",
    credit: -15000,
    fare: 0,
    tip: 0,
    fee: 0,
    method: "bank",
    at: atHour(1, 23),
    label: "Versement propriétaire",
  });
  [3175, 1520, 1938, 4200, 3500, 3222, 3875].forEach((credit, i) =>
    transactions.push(
      payment(
        `AA${64 - i * 6}`,
        credit - 50,
        0,
        atHour(1, 22 - i, 41 - i * 3),
        i % 2 ? "wallet" : "card",
      ),
    ),
  );
  transactions.push(cash("CA19", 1800, atHour(1, 12, 15)));
  // Earlier days of the month, so week and month views have history.
  for (let day = 2; day <= 26; day++) {
    if (day % 7 === 5) continue; // one day off a week
    const rides = 4 + ((day * 7) % 5);
    for (let i = 0; i < rides; i++) {
      const fare =
        900 + ((day * 37 + i * 53) % 32) * 100 + ((day + i) % 2) * 50;
      const at = atHour(day, 9 + i * 1, (day * 11 + i * 7) % 60);
      const id = `H${String(day).padStart(2, "0")}${i}`;
      transactions.push(
        (day + i) % 4 === 0
          ? cash(id, fare, at)
          : payment(
              id,
              fare,
              i % 3 === 0 ? 500 : 0,
              at,
              i % 2 ? "wallet" : "card",
            ),
      );
    }
    transactions.push({
      id: `OWN${String(day).padStart(2, "0")}`,
      kind: "owner",
      credit: -15000,
      fare: 0,
      tip: 0,
      fee: 0,
      method: "bank",
      at: atHour(day, 23),
      label: "Versement propriétaire",
    });
  }
  transactions.push({
    id: "AMO10",
    kind: "contribution",
    credit: -17500,
    fare: 0,
    tip: 0,
    fee: 0,
    method: "wallet",
    at: atHour(24, 10),
    label: "Cotisation AMO",
  });
  transactions.sort((a, b) => b.at - a.at);
  return {
    version: 2,
    openingBalance: 124850 - transactions.reduce((sum, t) => sum + t.credit, 0),
    transactions,
    requests: [],
    withdrawals: [],
    readNotifications: false,
    sound: true,
    ownerAmount: 15000,
    ownerEnabled: true,
    payout: "agency",
    documents: [],
    onboarded: false,
    phone: "612345678",
  };
}
export function createRequest(
  s: AppState,
  fare: number,
  id: string,
  now = Date.now(),
): AppState {
  if (!validAmount(fare))
    throw new Error("Saisissez un montant valide, supérieur à 0.");
  if (s.requests.some((r) => r.id === id)) return s;
  return {
    ...s,
    requests: [
      { id, fare, createdAt: now, expiresAt: now + 300000, status: "waiting" },
      ...s.requests,
    ],
  };
}
export function cancelRequest(s: AppState, id: string): AppState {
  return {
    ...s,
    requests: s.requests.map((r) =>
      r.id === id && r.status !== "paid" ? { ...r, status: "cancelled" } : r,
    ),
  };
}
export function connectRequest(s: AppState, id: string): AppState {
  return {
    ...s,
    requests: s.requests.map((r) =>
      r.id === id && r.status === "waiting" ? { ...r, status: "connected" } : r,
    ),
  };
}
export function completePayment(
  s: AppState,
  id: string,
  tip: number,
  method: Method,
  now = Date.now(),
): AppState {
  const r = s.requests.find((r) => r.id === id);
  if (!r) throw new Error("Ce paiement est introuvable dans cette démo.");
  if (r.status === "paid") return s;
  if (r.status === "cancelled" || now >= r.expiresAt)
    throw new Error(
      "Ce code a expiré ou a été annulé. Demandez un nouveau code.",
    );
  if (!Number.isSafeInteger(tip) || tip < 0 || tip > 100000)
    throw new Error("Pourboire invalide.");
  if (method === "cash")
    throw new Error("Un paiement en espèces n’est pas un paiement numérique.");
  const b = paymentBreakdown(r.fare, tip, now);
  return {
    ...s,
    requests: s.requests.map((item) =>
      item.id === id ? { ...item, status: "paid" } : item,
    ),
    transactions: [
      {
        id,
        kind: "payment",
        credit: b.credit,
        fare: r.fare,
        tip,
        fee: b.driverFee,
        method,
        at: now,
        label: "Paiement",
      },
      ...s.transactions,
    ],
  };
}
export function withdraw(
  s: AppState,
  amount: number,
  method: PayoutMethod,
  id: string,
  now = Date.now(),
): AppState {
  if (s.withdrawals.some((w) => w.id === id)) return s;
  if (!validAmount(amount))
    throw new Error("Saisissez un montant valide, supérieur à 0.");
  if (amount > balance(s))
    throw new Error("Ce montant dépasse votre solde disponible.");
  const digits =
    Array.from(id).reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 90000000, 0) +
    10000000;
  return {
    ...s,
    withdrawals: [
      { id, amount, method, code: String(digits), at: now },
      ...s.withdrawals,
    ],
    transactions: [
      {
        id,
        kind: "withdrawal",
        credit: -amount,
        fare: 0,
        tip: 0,
        fee: 0,
        method,
        at: now,
        label: "Retrait",
      },
      ...s.transactions,
    ],
  };
}
export function restoreState(raw: string | null, now = Date.now()): AppState {
  try {
    const s = JSON.parse(raw || "null") as AppState;
    const record = (x: unknown): x is Record<string, unknown> =>
      typeof x === "object" && x !== null;
    if (
      !s ||
      s.version !== 2 ||
      !Number.isSafeInteger(s.openingBalance) ||
      !Array.isArray(s.transactions) ||
      !Array.isArray(s.requests) ||
      !Array.isArray(s.withdrawals) ||
      !Array.isArray(s.documents) ||
      typeof s.phone !== "string" ||
      typeof s.sound !== "boolean" ||
      typeof s.readNotifications !== "boolean" ||
      typeof s.onboarded !== "boolean" ||
      typeof s.ownerEnabled !== "boolean" ||
      !Number.isSafeInteger(s.ownerAmount) ||
      !["agency", "wallet", "bank"].includes(s.payout)
    )
      throw Error();
    if (
      !s.transactions.every(
        (t) =>
          record(t) &&
          typeof t.id === "string" &&
          Number.isSafeInteger(t.credit) &&
          Number.isFinite(t.at) &&
          Number.isSafeInteger(t.fare) &&
          Number.isSafeInteger(t.tip) &&
          Number.isSafeInteger(t.fee) &&
          [
            "payment",
            "withdrawal",
            "owner",
            "advance",
            "cash",
            "contribution",
          ].includes(t.kind) &&
          typeof t.label === "string",
      ) ||
      !s.requests.every(
        (r) =>
          record(r) &&
          typeof r.id === "string" &&
          validAmount(r.fare) &&
          Number.isFinite(r.expiresAt) &&
          ["waiting", "connected", "paid", "cancelled"].includes(r.status),
      ) ||
      !s.withdrawals.every(
        (w) =>
          record(w) &&
          typeof w.id === "string" &&
          validAmount(w.amount) &&
          typeof w.code === "string" &&
          Number.isFinite(w.at),
      )
    )
      throw Error();
    return s;
  } catch {
    return createSeed(now);
  }
}
export const newId = () => crypto.randomUUID().slice(0, 8).toUpperCase();
const METHOD_LABELS: Record<string, string> = {
  card: "Carte bancaire",
  wallet: "Wallet mobile",
  balance: "Solde TapTaxi",
  applepay: "Apple Pay",
  googlepay: "Google Pay",
  cash: "Espèces",
  bank: "Compte bancaire",
  agency: "En agence",
};
export const methodLabel = (m: string) => METHOD_LABELS[m] ?? "En agence";
