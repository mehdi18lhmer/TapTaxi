// Passenger account and saved cards. Pure functions: state in, state out (no React/Expo).
//
// A saved card keeps only what is needed to show and pick it: brand, last 4 digits,
// expiry and holder name. The full number and the CVV are never stored, like the "token"
// a real payment provider returns. A real app would also store the account on a server.
import { validateTestCard } from './checkout';
import type { CardInput } from './checkout';
import { welcomeGift } from './passenger-wallet';
import type { WalletEntry } from './passenger-wallet';

export type CardBrand = 'Visa' | 'Mastercard';

export interface SavedCard {
  id: string;
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
  holder: string;
  addedAt: number;
}

export interface PassengerAccount {
  firstName: string;
  phone: string;
  since: number;
}

export interface PassengerState {
  version: 1;
  account: PassengerAccount | null;
  cards: SavedCard[];
  defaultCardId: string | null;
  /** TapTaxi wallet movements (see lib/passenger-wallet.ts). */
  wallet: WalletEntry[];
}

export const MAX_CARDS = 5;
export const emptyPassenger = (): PassengerState => ({
  version: 1,
  account: null,
  cards: [],
  defaultCardId: null,
  wallet: [],
});

export function signIn(
  s: PassengerState,
  firstName: string,
  phone: string,
  now = Date.now(),
): PassengerState {
  const name = firstName.trim();
  if (name.length < 2) throw new Error('Saisissez votre prénom.');
  return {
    ...s,
    account: { firstName: name, phone, since: s.account?.since ?? now },
    // Demo: a friend's gift is waiting, to show what a received gift looks like.
    wallet: s.wallet.length ? s.wallet : [welcomeGift(now)],
  };
}

/**
 * Changes the first name and/or phone. The screen checks the SMS code before a new phone
 * number reaches this function; the join date is kept.
 */
export function updateProfile(s: PassengerState, firstName: string, phone: string): PassengerState {
  if (!s.account) throw new Error('Connectez-vous pour modifier votre profil.');
  const name = firstName.trim();
  if (name.length < 2) throw new Error('Saisissez votre prénom.');
  if (!/^[67]\d{8}$/.test(phone)) throw new Error('Numéro de téléphone invalide.');
  return { ...s, account: { ...s.account, firstName: name, phone } };
}

/** Logging out removes the account and its cards from this device. */
export const signOut = (): PassengerState => emptyPassenger();

export function brandOf(cardNumber: string): CardBrand {
  return cardNumber.replace(/\s/g, '').startsWith('5') ? 'Mastercard' : 'Visa';
}

/**
 * Checks the card, then keeps only its display details. Returns the new state and the
 * saved card. The first card becomes the default.
 */
export function addCard(
  s: PassengerState,
  input: CardInput,
  id: string,
  now = new Date(),
): { state: PassengerState; card: SavedCard } {
  if (!s.account) throw new Error('Connectez-vous pour enregistrer une carte.');
  const problem = validateTestCard(input, now);
  if (problem) throw new Error(problem);
  const digits = input.number.replace(/\s/g, '');
  const [month, year] = input.expiry.split('/').map(Number);
  const card: SavedCard = {
    id,
    brand: brandOf(digits),
    last4: digits.slice(-4),
    expMonth: month,
    expYear: 2000 + year,
    holder: input.name.trim().toUpperCase(),
    addedAt: now.getTime(),
  };
  const duplicate = s.cards.find(
    (c) => c.last4 === card.last4 && c.expMonth === card.expMonth && c.expYear === card.expYear,
  );
  if (duplicate) throw new Error('Cette carte est déjà enregistrée.');
  if (s.cards.length >= MAX_CARDS)
    throw new Error(`Vous pouvez enregistrer ${MAX_CARDS} cartes au maximum.`);
  return {
    card,
    state: { ...s, cards: [...s.cards, card], defaultCardId: s.defaultCardId ?? card.id },
  };
}

export function removeCard(s: PassengerState, id: string): PassengerState {
  const cards = s.cards.filter((c) => c.id !== id);
  const defaultCardId = s.defaultCardId === id ? (cards[0]?.id ?? null) : s.defaultCardId;
  return { ...s, cards, defaultCardId };
}

export function setDefaultCard(s: PassengerState, id: string): PassengerState {
  if (!s.cards.some((c) => c.id === id)) throw new Error('Carte introuvable.');
  return { ...s, defaultCardId: id };
}

/** A card is usable until the end of its expiry month. */
export function isCardExpired(card: SavedCard, now = new Date()) {
  return (
    card.expYear < now.getFullYear() ||
    (card.expYear === now.getFullYear() && card.expMonth < now.getMonth() + 1)
  );
}

/** The card checkout should pre-select: the default if still valid, else the first valid one. */
export function preferredCard(s: PassengerState, now = new Date()): SavedCard | null {
  const usable = s.cards.filter((c) => !isCardExpired(c, now));
  return usable.find((c) => c.id === s.defaultCardId) ?? usable[0] ?? null;
}

export const cardLabel = (c: SavedCard) => `${c.brand} •••• ${c.last4}`;
export const cardExpiry = (c: SavedCard) =>
  `${String(c.expMonth).padStart(2, '0')}/${String(c.expYear).slice(-2)}`;

/** Accepts only well-formed saved data; anything else starts fresh (logged out). */
export function restorePassenger(raw: string | null): PassengerState {
  try {
    const s = JSON.parse(raw ?? 'null') as PassengerState;
    const validCard = (c: SavedCard) =>
      typeof c?.id === 'string' &&
      (c.brand === 'Visa' || c.brand === 'Mastercard') &&
      /^\d{4}$/.test(c.last4) &&
      Number.isInteger(c.expMonth) &&
      Number.isInteger(c.expYear) &&
      typeof c.holder === 'string' &&
      // A saved card must never carry a full number or a CVV.
      !('number' in c) &&
      !('cvv' in c);
    if (s && !Array.isArray(s.wallet)) s.wallet = [];
    if (
      s?.version !== 1 ||
      !s.wallet.every(
        (e) => typeof e?.id === 'string' && Number.isSafeInteger(e.amount) && Number.isFinite(e.at),
      ) ||
      !Array.isArray(s.cards) ||
      !s.cards.every(validCard) ||
      (s.account !== null &&
        (typeof s.account?.firstName !== 'string' || typeof s.account?.phone !== 'string'))
    )
      return emptyPassenger();
    return s;
  } catch {
    return emptyPassenger();
  }
}
