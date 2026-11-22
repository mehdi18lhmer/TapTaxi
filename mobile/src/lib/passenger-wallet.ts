// Passenger TapTaxi wallet: top up in advance (card or cash at an agent), pay rides from the
// balance, gift part of it to someone, pay a share of a split ride. Pure functions.
// Demo: the balance lives on this device. A real wallet is held by the licensed payment
// partner, not by TapTaxi. Amounts are integer centimes.
import type { PassengerState } from './passenger';

export type WalletEntryKind = 'topup' | 'ride' | 'gift-sent' | 'gift-received' | 'split';

export interface WalletEntry {
  id: string;
  kind: WalletEntryKind;
  /** Signed: credit > 0, debit < 0. */
  amount: number;
  at: number;
  label: string;
  /** Agent top-ups stay pending until the cash is handed over. */
  status: 'done' | 'pending';
  method?: 'card' | 'agent';
  agent?: string;
  /** Code shown to the agent for a cash top-up. */
  code?: string;
  contact?: { name: string; phone: string };
  message?: string;
  /** Ride payment reference. */
  ref?: string;
}

export const TOPUP = { min: 1000, max: 200000 } as const;
export const GIFT = { min: 1000, max: 50000 } as const;
export const TOPUP_AMOUNTS = [5000, 10000, 20000] as const;
export const GIFT_AMOUNTS = [2000, 5000, 10000] as const;
export const AGENTS = ['Cash Plus', 'Wafacash', 'Barid Cash'] as const;

/** Demo contacts for "Offrir une course". The real app reads the phone's contacts. */
export const DEMO_CONTACTS = [
  { name: 'Salma', phone: '661234567' },
  { name: 'Maman', phone: '662345678' },
  { name: 'Karim', phone: '663456789' },
  { name: 'Omar', phone: '664567890' },
] as const;

export const walletBalance = (s: PassengerState) =>
  s.wallet.reduce((n, e) => n + (e.status === 'done' ? e.amount : 0), 0);

export const pendingTopups = (s: PassengerState) =>
  s.wallet.filter((e) => e.kind === 'topup' && e.status === 'pending');

export function welcomeGift(now: number): WalletEntry {
  return {
    id: 'GIFT0',
    kind: 'gift-received',
    amount: 5000,
    at: now,
    label: 'Cadeau de Karim',
    status: 'done',
    contact: { name: 'Karim', phone: '663456789' },
    message: 'Pour tes courses de la semaine. Bon retour !',
  };
}

function checkAmount(amount: number, { min, max }: { min: number; max: number }) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Saisissez un montant valide.');
  if (amount < min) throw new Error(`Montant minimum : ${min / 100} MAD.`);
  if (amount > max) throw new Error(`Montant maximum : ${max / 100} MAD.`);
}

const signedIn = (s: PassengerState) => {
  if (!s.account) throw new Error('Connectez-vous pour utiliser votre wallet.');
};

const add = (s: PassengerState, entry: WalletEntry): PassengerState =>
  s.wallet.some((e) => e.id === entry.id) ? s : { ...s, wallet: [entry, ...s.wallet] };

/** Top up by bank card: credited at once (simulation). */
export function topUpByCard(
  s: PassengerState,
  amount: number,
  cardLabel: string,
  id: string,
  now = Date.now(),
): PassengerState {
  signedIn(s);
  checkAmount(amount, TOPUP);
  return add(s, {
    id,
    kind: 'topup',
    amount,
    at: now,
    label: `Recharge · ${cardLabel}`,
    status: 'done',
    method: 'card',
  });
}

/** Cash top-up at an agent: creates a code, credited once the agent confirms. */
export function startAgentTopUp(
  s: PassengerState,
  amount: number,
  agent: string,
  id: string,
  now = Date.now(),
): PassengerState {
  signedIn(s);
  checkAmount(amount, TOPUP);
  const code = String(
    (Array.from(id).reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 900000, 7) + 100000) % 1000000,
  ).padStart(6, '0');
  return add(s, {
    id,
    kind: 'topup',
    amount,
    at: now,
    label: `Recharge en espèces · ${agent}`,
    status: 'pending',
    method: 'agent',
    agent,
    code,
  });
}

/** Demo: the agent received the cash. */
export function confirmAgentTopUp(s: PassengerState, id: string, now = Date.now()): PassengerState {
  if (!s.wallet.some((e) => e.id === id && e.status === 'pending'))
    throw new Error('Recharge introuvable ou déjà créditée.');
  return {
    ...s,
    wallet: s.wallet.map((e) => (e.id === id ? { ...e, status: 'done', at: now } : e)),
  };
}

/** Pays a ride (or a share of it) from the balance. */
export function payFromWallet(
  s: PassengerState,
  amount: number,
  ref: string,
  id: string,
  { now = Date.now(), split = false } = {},
): PassengerState {
  signedIn(s);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Montant invalide.');
  if (s.wallet.some((e) => e.id === id)) return s;
  if (amount > walletBalance(s))
    throw new Error(
      'Solde TapTaxi insuffisant. Rechargez votre wallet ou choisissez un autre moyen.',
    );
  return add(s, {
    id,
    kind: split ? 'split' : 'ride',
    amount: -amount,
    at: now,
    label: split ? `Ma part · course TT-${ref}` : `Course TT-${ref}`,
    status: 'done',
    ref,
  });
}

export interface GiftInput {
  name: string;
  phone: string;
  amount: number;
  message: string;
}

export function giftError(s: PassengerState, input: GiftInput): string | null {
  if (input.name.trim().length < 2) return 'Choisissez un contact.';
  if (!/^[67]\d{8}$/.test(input.phone.replace(/\s/g, ''))) return 'Numéro marocain invalide.';
  if (s.account && input.phone.replace(/\s/g, '') === s.account.phone)
    return 'Vous ne pouvez pas vous offrir une course.';
  try {
    checkAmount(input.amount, GIFT);
  } catch (e) {
    return (e as Error).message;
  }
  if (input.amount > walletBalance(s)) return 'Solde insuffisant : rechargez votre wallet.';
  if (input.message.length > 140) return 'Message trop long (140 caractères maximum).';
  return null;
}

/** Sends part of the balance to someone, who uses it to pay their rides. */
export function sendGift(
  s: PassengerState,
  input: GiftInput,
  id: string,
  now = Date.now(),
): PassengerState {
  signedIn(s);
  const problem = giftError(s, input);
  if (problem) throw new Error(problem);
  return add(s, {
    id,
    kind: 'gift-sent',
    amount: -input.amount,
    at: now,
    label: `Course offerte à ${input.name.trim()}`,
    status: 'done',
    contact: { name: input.name.trim(), phone: input.phone.replace(/\s/g, '') },
    message: input.message.trim(),
  });
}

/** The notification the receiver gets (shown in the demo as a preview). */
export const giftNotification = (from: string, e: WalletEntry) =>
  `${from} vous offre ${(Math.abs(e.amount) / 100).toFixed(2).replace('.', ',')} MAD de courses TapTaxi${e.message ? ` : « ${e.message} »` : '.'}`;
