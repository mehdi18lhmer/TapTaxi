import { describe, expect, it } from 'vitest';
import {
  formatCardNumber,
  formatExpiry,
  isPayable,
  passengerSummary,
  passengerTotal,
  TEST_CARD,
  validateTestCard,
  validateWalletPhone,
} from './checkout';
import { completePayment, createRequest, createSeed } from './model';
import type { PaymentRequest } from './model';

const NOW = new Date(2026, 10, 20, 12);

describe('passenger checkout', () => {
  it('accepts only the test card, with a future expiry, a 3-digit CVV and a name', () => {
    expect(validateTestCard(TEST_CARD, NOW)).toBeNull();
    expect(validateTestCard({ ...TEST_CARD, number: '4000 0000 0000 0002' }, NOW)).toMatch(
      /carte de test/,
    );
    expect(validateTestCard({ ...TEST_CARD, expiry: '13/29' }, NOW)).toMatch(/expiration/);
    expect(validateTestCard({ ...TEST_CARD, expiry: '10/26' }, NOW)).toMatch(/expirée/);
    expect(validateTestCard({ ...TEST_CARD, expiry: '11/26' }, NOW)).toBeNull();
    expect(validateTestCard({ ...TEST_CARD, cvv: '12' }, NOW)).toMatch(/CVV/);
    expect(validateTestCard({ ...TEST_CARD, name: ' ' }, NOW)).toMatch(/titulaire/);
  });

  it('formats card fields while typing', () => {
    expect(formatCardNumber('42424242424242429999')).toBe('4242 4242 4242 4242');
    expect(formatExpiry('1229')).toBe('12/29');
    expect(formatExpiry('1')).toBe('1');
  });

  it('accepts Moroccan mobile numbers without +212', () => {
    expect(validateWalletPhone('6 12 34 56 78')).toBeNull();
    expect(validateWalletPhone('712345678')).toBeNull();
    expect(validateWalletPhone('512345678')).not.toBeNull();
    expect(validateWalletPhone('61234567')).not.toBeNull();
  });

  it('lets a code be paid only while waiting or connected and before expiry', () => {
    const r: PaymentRequest = {
      id: 'A',
      fare: 2300,
      createdAt: 0,
      expiresAt: 1000,
      status: 'waiting',
    };
    expect(isPayable(r, 999)).toBe(true);
    expect(isPayable({ ...r, status: 'connected' }, 999)).toBe(true);
    expect(isPayable(r, 1000)).toBe(false);
    expect(isPayable({ ...r, status: 'paid' }, 0)).toBe(false);
    expect(isPayable({ ...r, status: 'cancelled' }, 0)).toBe(false);
    expect(isPayable(undefined, 0)).toBe(false);
  });

  it('charges the passenger fare + tip + the service fee (2 MAD by day for 23 MAD), and sums the receipts', () => {
    const now = NOW.getTime();
    let s = createRequest(createSeed(now), 2300, 'NEW1', now);
    s = completePayment(s, 'NEW1', 1000, 'card', now + 1000);
    const payment = s.transactions.find((t) => t.id === 'NEW1')!;
    expect(passengerTotal(payment)).toBe(3500);
    const summary = passengerSummary(s.transactions);
    expect(summary.count).toBe(s.transactions.filter((t) => t.kind === 'payment').length);
    expect(summary.total).toBe(summary.fares + summary.tips + summary.fees);
  });
});
