// Passenger checkout rules (native app). Pure functions: no React, no Expo modules,
// so they can be tested directly. Amounts are integer centimes.
import { passengerFeeOf, passengerPaid } from './model';
import type { PaymentRequest, Transaction } from './model';

/** Tip shortcuts offered to the passenger: none, 2, 5, 10 MAD (100 % for the driver). */
export const TIP_OPTIONS = [
  { value: 0, label: 'Sans' },
  { value: 200, label: '+2' },
  { value: 500, label: '+5' },
  { value: 1000, label: '+10' },
] as const;

/**
 * Card numbers the demo accepts (standard test numbers). Real card data must never be
 * collected here: a real app hands the card to the payment provider's secure form.
 */
export const TEST_CARD_NUMBERS = ['4242424242424242', '5555555555554444'];
export const TEST_CARD = {
  number: '4242 4242 4242 4242',
  expiry: '12/29',
  cvv: '123',
  name: 'Youssef Benali',
};
export const TEST_WALLET_PHONE = '612345678';
export const WALLET_PROVIDERS = ['Cash Plus', 'Orange Money', 'inwi money', 'Barid Pay'] as const;

/** How long the fake "processing" step lasts before the payment is recorded. */
export const PROCESSING_MS = 1800;

export interface CardInput {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
}

/** "4242424242424242" → "4242 4242 4242 4242" while typing. */
export const formatCardNumber = (raw: string) =>
  raw
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim();

/** "1229" → "12/29" while typing. */
export function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

/** Returns an error message, or null when the test card is acceptable. */
export function validateTestCard(card: CardInput, now = new Date()): string | null {
  if (!TEST_CARD_NUMBERS.includes(card.number.replace(/\s/g, '')))
    return 'Utilisez une carte de test : 4242 4242 4242 4242 ou 5555 5555 5555 4444.';
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(card.expiry);
  if (!match) return 'Saisissez une date d’expiration valide.';
  const year = 2000 + Number(match[2]);
  const month = Number(match[1]);
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1))
    return 'Cette carte est expirée.';
  if (!/^\d{3}$/.test(card.cvv)) return 'Le CVV contient 3 chiffres.';
  if (card.name.trim().length < 3) return 'Saisissez le nom du titulaire.';
  return null;
}

/** Moroccan mobile number, 9 digits starting with 6 or 7, without +212. */
export function validateWalletPhone(phone: string): string | null {
  return /^[67]\d{8}$/.test(phone.replace(/\s/g, ''))
    ? null
    : 'Saisissez un numéro marocain de 9 chiffres, sans +212.';
}

/** A code can be paid while it is waiting or connected and not past its expiry. */
export function isPayable(r: PaymentRequest | undefined, now = Date.now()) {
  return !!r && (r.status === 'waiting' || r.status === 'connected') && now < r.expiresAt;
}

/** Seconds left before the code expires (0 when expired). */
export const secondsLeft = (r: PaymentRequest, now = Date.now()) =>
  Math.max(0, Math.ceil((r.expiresAt - now) / 1000));

/** What the passenger paid for a recorded payment: fare + tip + passenger fee. */
export const passengerTotal = (t: Transaction) => passengerPaid(t);

/** Totals for the passenger's "Mes paiements" screen. */
export function passengerSummary(transactions: Transaction[]) {
  const payments = transactions.filter((t) => t.kind === 'payment');
  return {
    payments,
    count: payments.length,
    total: payments.reduce((n, t) => n + passengerTotal(t), 0),
    fares: payments.reduce((n, t) => n + t.fare, 0),
    tips: payments.reduce((n, t) => n + t.tip, 0),
    fees: payments.reduce((n, t) => n + passengerFeeOf(t), 0),
  };
}
