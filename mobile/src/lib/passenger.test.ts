import { describe, expect, it } from 'vitest';
import {
  addCard,
  cardExpiry,
  cardLabel,
  emptyPassenger,
  isCardExpired,
  preferredCard,
  removeCard,
  restorePassenger,
  setDefaultCard,
  signIn,
  signOut,
  updateProfile,
} from './passenger';
import type { PassengerState } from './passenger';

const NOW = new Date(2026, 10, 20, 12);
const VISA = { number: '4242 4242 4242 4242', expiry: '12/29', cvv: '123', name: 'Leila Mansouri' };
const MASTERCARD = {
  number: '5555 5555 5555 4444',
  expiry: '03/28',
  cvv: '456',
  name: 'Leila Mansouri',
};
const signedIn = () => signIn(emptyPassenger(), ' Leila ', '612345678', NOW.getTime());

describe('passenger account', () => {
  it('signs in with a first name and keeps the original join date', () => {
    const s = signedIn();
    expect(s.account).toEqual({ firstName: 'Leila', phone: '612345678', since: NOW.getTime() });
    expect(signIn(s, 'Leila', '612345678', NOW.getTime() + 5000).account?.since).toBe(
      NOW.getTime(),
    );
    expect(() => signIn(emptyPassenger(), ' ', '612345678')).toThrow(/prénom/);
  });

  it('edits the name and phone, keeping the join date and the cards', () => {
    const s = addCard(signedIn(), VISA, 'C1', NOW).state;
    const edited = updateProfile(s, ' Leïla ', '712345678');
    expect(edited.account).toEqual({
      firstName: 'Leïla',
      phone: '712345678',
      since: NOW.getTime(),
    });
    expect(edited.cards).toEqual(s.cards);
    expect(() => updateProfile(s, 'L', '712345678')).toThrow(/prénom/);
    expect(() => updateProfile(s, 'Leila', '512345678')).toThrow(/invalide/);
    expect(() => updateProfile(emptyPassenger(), 'Leila', '612345678')).toThrow(/Connectez-vous/);
  });

  it('logging out removes the account and the saved cards', () => {
    const s = addCard(signedIn(), VISA, 'C1', NOW).state;
    expect(signOut()).toEqual(emptyPassenger());
    expect(s.cards).toHaveLength(1);
  });
});

describe('saved cards', () => {
  it('keeps only brand, last 4 digits, expiry and holder — never the number or CVV', () => {
    const { state, card } = addCard(signedIn(), VISA, 'C1', NOW);
    expect(card).toEqual({
      id: 'C1',
      brand: 'Visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2029,
      holder: 'LEILA MANSOURI',
      addedAt: NOW.getTime(),
    });
    const saved = JSON.stringify(state);
    expect(saved).not.toContain('4242424242424242');
    expect(saved).not.toContain('4242 4242 4242 4242');
    expect(saved).not.toContain('"cvv"');
    expect(cardLabel(card)).toBe('Visa •••• 4242');
    expect(cardExpiry(card)).toBe('12/29');
  });

  it('requires an account, a valid test card, and refuses duplicates', () => {
    expect(() => addCard(emptyPassenger(), VISA, 'C1', NOW)).toThrow(/Connectez-vous/);
    expect(() =>
      addCard(signedIn(), { ...VISA, number: '4000 0000 0000 0002' }, 'C1', NOW),
    ).toThrow(/carte de test/);
    expect(() => addCard(signedIn(), { ...VISA, cvv: '1' }, 'C1', NOW)).toThrow(/CVV/);
    const once = addCard(signedIn(), VISA, 'C1', NOW).state;
    expect(() => addCard(once, VISA, 'C2', NOW)).toThrow(/déjà enregistrée/);
  });

  it('the first card is the default; removing the default promotes the next card', () => {
    let s: PassengerState = addCard(signedIn(), VISA, 'C1', NOW).state;
    s = addCard(s, MASTERCARD, 'C2', NOW).state;
    expect(s.defaultCardId).toBe('C1');
    expect(s.cards.find((c) => c.id === 'C2')?.brand).toBe('Mastercard');
    s = setDefaultCard(s, 'C2');
    expect(preferredCard(s, NOW)?.id).toBe('C2');
    s = removeCard(s, 'C2');
    expect(s.defaultCardId).toBe('C1');
    s = removeCard(s, 'C1');
    expect(s.defaultCardId).toBeNull();
    expect(preferredCard(s, NOW)).toBeNull();
  });

  it('skips an expired default card at checkout', () => {
    let s = addCard(signedIn(), VISA, 'C1', NOW).state;
    s = addCard(s, MASTERCARD, 'C2', NOW).state;
    s = setDefaultCard(s, 'C2'); // expires 03/28
    const later = new Date(2028, 3, 1);
    expect(isCardExpired(s.cards[1], later)).toBe(true);
    expect(isCardExpired(s.cards[1], new Date(2028, 2, 31))).toBe(false);
    expect(preferredCard(s, later)?.id).toBe('C1');
  });

  it('restores only well-formed saved data', () => {
    const s = addCard(signedIn(), VISA, 'C1', NOW).state;
    expect(restorePassenger(JSON.stringify(s))).toEqual(s);
    expect(restorePassenger(null)).toEqual(emptyPassenger());
    expect(restorePassenger('{broken')).toEqual(emptyPassenger());
    const leaked = { ...s, cards: [{ ...s.cards[0], number: '4242424242424242' }] };
    expect(restorePassenger(JSON.stringify(leaked))).toEqual(emptyPassenger());
  });
});
