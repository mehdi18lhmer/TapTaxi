import { describe, expect, it } from 'vitest';
import { balance, completePayment, createRequest, createSeed, passengerPaid } from './model';
import {
  completeCashPayment,
  completeSplitPayment,
  earningsSummary,
  ownerSettlement,
  paymentSms,
  splitFare,
  splitPreview,
} from './ledger';
import { checkFare, estimateFare } from './fare';
import { nearbyTaxis, place, REQUEST_RADIUS_KM, roadKm } from './places';
import {
  acceptRide,
  activePassengerRide,
  advanceRide,
  bookingError,
  createBooking,
  emptyRides,
  incomingRequests,
  linkPayment,
  markPaid,
  requestRide,
  restoreRides,
} from './rides';
import { emptyPassenger, signIn } from './passenger';
import {
  confirmAgentTopUp,
  giftError,
  payFromWallet,
  sendGift,
  startAgentTopUp,
  topUpByCard,
  walletBalance,
} from './passenger-wallet';
import { contributions, COVERAGE, paidThisMonth, payContribution } from './coverage';
import { forecast, hotspot } from './demand';
import { detectIntent, replyTo } from './assistant';
import { agentReply, detectLanguage, detectTopic } from './support-agent';

// 14:00 in Casablanca (UTC+1 in November): day tariff.
const NOW = new Date('2026-11-20T13:00:00Z').getTime();

describe('cash and split payments', () => {
  it('records a cash ride with no fee and no wallet credit', () => {
    const seed = createSeed(NOW);
    let s = createRequest(seed, 2300, 'CASH1', NOW);
    s = completeCashPayment(s, 'CASH1', NOW + 1000);
    const t = s.transactions[0];
    expect(t).toMatchObject({ kind: 'cash', fare: 2300, credit: 0, method: 'cash' });
    expect(passengerPaid(t)).toBe(2300);
    expect(balance(s)).toBe(balance(seed));
    expect(s.requests[0].status).toBe('paid');
    expect(completeCashPayment(s, 'CASH1', NOW + 2000)).toBe(s);
  });

  it('refuses cash as a digital payment method', () => {
    const s = createRequest(createSeed(NOW), 2300, 'X', NOW);
    expect(() => completePayment(s, 'X', 0, 'cash', NOW + 1)).toThrow();
  });

  it('splits the fare in equal shares and applies the fee to each share', () => {
    expect(splitFare(3001, 3)).toEqual([1001, 1000, 1000]);
    expect(() => splitFare(3000, 1)).toThrow();
    expect(() => splitFare(3000, 5)).toThrow();
    const shares = splitPreview(4500, 3, 200, NOW);
    // 15 MAD each → 1,50 MAD fee each; my share carries the tip.
    expect(shares.map((b) => b.fee)).toEqual([150, 150, 150]);
    expect(shares[0].total).toBe(1500 + 150 + 200);
    expect(shares[1].total).toBe(1650);
  });

  it('records one payment per person for a split ride', () => {
    let s = createRequest(createSeed(NOW), 4500, 'SPL1', NOW);
    s = completeSplitPayment(
      s,
      'SPL1',
      [
        { payer: 'Moi', method: 'balance' },
        { payer: 'Salma', method: 'card' },
        { payer: 'Karim', method: 'card' },
      ],
      200,
      NOW + 1000,
    );
    const shares = s.transactions.filter((t) => t.split?.ride === 'SPL1');
    expect(shares.map((t) => t.id).sort()).toEqual(['SPL1', 'SPL1-2', 'SPL1-3']);
    expect(shares.reduce((n, t) => n + t.fare, 0)).toBe(4500);
    expect(s.requests[0].status).toBe('paid');
    expect(paymentSms(shares[0])).toMatch(/réf\. TT-/);
  });
});

describe('earnings dashboard and owner link', () => {
  it('splits earnings between digital and cash and counts the 10 % bonus', () => {
    const s = createSeed(NOW);
    const week = earningsSummary(s, 'week', NOW);
    expect(week.cashCount).toBeGreaterThan(0);
    expect(week.total).toBe(week.digitalTotal + week.cashTotal);
    expect(week.bonus).toBe(
      week.items.filter((t) => t.kind === 'payment').reduce((n, t) => n + t.fee, 0),
    );
    expect(earningsSummary(s, 'today', NOW).total).toBeLessThanOrEqual(week.total);
  });

  it('settles the owner’s daily amount and leaves the rest to the driver', () => {
    const s = createSeed(NOW);
    const today = ownerSettlement(s, NOW);
    expect(today.ownerAmount).toBe(15000);
    expect(today.driverShare).toBe(Math.max(0, today.earned - 15000));
  });
});

describe('fare check and places', () => {
  it('estimates a range around the meter and flags fares above it', () => {
    const range = estimateFare(5, { at: NOW });
    expect(range.min).toBeLessThan(range.likely);
    expect(range.max).toBeGreaterThan(range.likely);
    expect(checkFare(range.likely, range)).toBe('ok');
    expect(checkFare(range.max + 500, range)).toBe('high');
    const night = estimateFare(5, { at: new Date('2026-11-20T22:00:00Z').getTime() });
    expect(night.likely).toBeGreaterThan(range.likely);
  });

  it('only offers taxis within 1 km', () => {
    const taxis = nearbyTaxis();
    expect(taxis.length).toBeGreaterThan(0);
    expect(taxis.every((t) => t.km <= REQUEST_RADIUS_KM)).toBe(true);
    expect(roadKm(place('maarif'), place('airport'))).toBeGreaterThan(25);
  });
});

describe('requests, rides and bookings', () => {
  it('goes from request to payment, with wait & return', () => {
    let s = emptyRides(NOW);
    s = requestRide(
      s,
      { pickup: 'maarif', destination: 'voyageurs', waitReturn: true },
      'Leila',
      'R1',
      NOW,
    );
    expect(activePassengerRide(s)?.id).toBe('R1');
    expect(incomingRequests(s).map((r) => r.id)).toContain('R1');
    expect(() =>
      requestRide(
        s,
        { pickup: 'maarif', destination: 'mall', waitReturn: false },
        'Leila',
        'R2',
        NOW,
      ),
    ).toThrow();
    s = acceptRide(s, 'R1', NOW + 1);
    for (const step of ['accepted', 'arrived', 'onboard', 'waiting', 'returning'] as const)
      s = advanceRide(s, 'R1', step, NOW + 2);
    expect(s.rides.find((r) => r.id === 'R1')?.status).toBe('ended');
    s = linkPayment(s, 'R1', 'PAY1', 2500);
    s = markPaid(s, 'PAY1');
    expect(s.rides.find((r) => r.id === 'R1')?.status).toBe('paid');
    expect(activePassengerRide(s)).toBeUndefined();
  });

  it('ignores a repeated step', () => {
    let s = requestRide(
      emptyRides(NOW),
      { pickup: 'maarif', destination: 'twin', waitReturn: false },
      'L',
      'R1',
      NOW,
    );
    s = acceptRide(s, 'R1', NOW);
    s = advanceRide(s, 'R1', 'accepted', NOW);
    expect(advanceRide(s, 'R1', 'accepted', NOW)).toEqual(s);
  });

  it('books at least 30 minutes and at most 30 days ahead', () => {
    const input = {
      pickup: 'hyatt',
      destination: 'airport',
      at: NOW + 3_600_000,
      waitReturn: false,
    };
    expect(bookingError(input, NOW)).toBeNull();
    expect(bookingError({ ...input, at: NOW + 60_000 }, NOW)).toMatch(/30 minutes/);
    expect(bookingError({ ...input, at: NOW + 40 * 86_400_000 }, NOW)).toMatch(/30 jours/);
    const s = createBooking(emptyRides(NOW), input, 'Leila', 'B1', NOW);
    expect(s.bookings[0]).toMatchObject({ id: 'B1', kind: 'airport', priority: true });
  });

  it('restores corrupt storage as demo data', () => {
    expect(restoreRides('{bad', NOW).rides.length).toBeGreaterThan(0);
  });
});

describe('passenger wallet and gifts', () => {
  const signedIn = () => signIn(emptyPassenger(), 'Leila', '612345678', NOW);

  it('starts with a received gift, tops up by card and pays rides', () => {
    let s = signedIn();
    expect(walletBalance(s)).toBe(5000);
    s = topUpByCard(s, 10000, 'Visa •••• 4242', 'T1', NOW);
    expect(walletBalance(s)).toBe(15000);
    s = payFromWallet(s, 2500, 'AB12', 'P1', { now: NOW });
    expect(walletBalance(s)).toBe(12500);
    expect(() => payFromWallet(s, 99999, 'AB13', 'P2', { now: NOW })).toThrow(/insuffisant/);
  });

  it('credits a cash top-up only once the agent confirms', () => {
    let s = startAgentTopUp(signedIn(), 5000, 'Cash Plus', 'A1', NOW);
    expect(walletBalance(s)).toBe(5000);
    expect(s.wallet[0].code).toMatch(/^\d{6}$/);
    s = confirmAgentTopUp(s, 'A1', NOW);
    expect(walletBalance(s)).toBe(10000);
    expect(() => confirmAgentTopUp(s, 'A1', NOW)).toThrow();
  });

  it('sends a gift from the balance with checks', () => {
    const s = signedIn();
    const gift = { name: 'Salma', phone: '661234567', amount: 2000, message: 'Bon retour' };
    expect(giftError(s, gift)).toBeNull();
    expect(giftError(s, { ...gift, amount: 90000 })).toBeTruthy();
    expect(giftError(s, { ...gift, phone: '612345678' })).toMatch(/vous offrir/);
    expect(walletBalance(sendGift(s, gift, 'G1', NOW))).toBe(3000);
  });
});

describe('CNSS & AMO', () => {
  it('pays the monthly contribution once from the wallet', () => {
    const seed = createSeed(NOW);
    const s = paidThisMonth(seed, NOW) ? seed : payContribution(seed, 'AMO1', NOW);
    expect(paidThisMonth(s, NOW)).toBe(true);
    expect(() => payContribution(s, 'AMO2', NOW)).toThrow(/déjà/);
    expect(contributions(s).length).toBeGreaterThan(0);
    if (s !== seed) expect(balance(s)).toBe(balance(seed) - COVERAGE.monthly);
  });
});

describe('demand prediction', () => {
  it('is deterministic and scores every zone between 0 and 100', () => {
    const a = forecast(NOW, 30);
    expect(a).toEqual(forecast(NOW, 30));
    expect(a.every((z) => z.score >= 0 && z.score <= 100)).toBe(true);
    expect(a[0].score).toBeGreaterThanOrEqual(a[a.length - 1].score);
  });

  it('peaks at Casa Voyageurs right after a train arrival', () => {
    const train = new Date('2026-11-20T17:40:00Z').getTime(); // 18:40 in Casablanca
    const zone = forecast(train, 0).find((z) => z.id === 'voyageurs')!;
    expect(zone.score).toBeGreaterThanOrEqual(60);
    expect(hotspot(train).message).toMatch(/demande/);
  });
});

describe('TapTaxi Assistant (Darija)', () => {
  it('recognises the demo questions', () => {
    expect(detectIntent('Chhal dkhelt had simana?')).toBe('earnings');
    expect(detectIntent('Khelles AMO dyal had chhar')).toBe('amo');
    expect(detectIntent('Sifet flous l’owner')).toBe('owner');
    expect(detectIntent('Bghit nkhrej flousi')).toBe('withdraw');
    expect(detectIntent('شحال ربحت هاد السيمانة')).toBe('earnings');
    expect(detectIntent('xyz')).toBe('unknown');
  });

  it('asks for confirmation before any payment and offers a person when unsure', () => {
    const s = createSeed(NOW);
    const amo = replyTo('Khelles AMO', s, NOW);
    if (!paidThisMonth(s, NOW)) expect(amo.card).toMatchObject({ type: 'confirm', action: 'amo' });
    expect(replyTo('Sifet flous l owner', s, NOW).card?.type).toMatch(/confirm|undefined/);
    expect(replyTo('Chhal dkhelt', s, NOW).card?.type).toBe('earnings');
    expect(replyTo('Bghit nkhrej', s, NOW).card?.type).toBe('withdraw');
    expect(replyTo('blabla', s, NOW).card?.type).toBe('handoff');
  });
});

describe('multilingual support agent', () => {
  it('picks the language from the message', () => {
    expect(detectLanguage('J’ai oublié mon téléphone dans le taxi')).toBe('fr');
    expect(detectLanguage('I think I was overcharged')).toBe('en');
    expect(detectLanguage('كيف أقسم ثمن الرحلة؟')).toBe('ar');
    expect(detectLanguage('wach nsit telephone dyali f taxi')).toBe('darija');
  });

  it('handles lost items with the ride and hands refunds, disputes and safety to a person', () => {
    const ride = {
      id: 'TT-AB12',
      taxi: '1287',
      driver: 'Youssef B.',
      date: '20 nov.',
      fare: '23,00 MAD',
      fee: '2,00 MAD',
      tip: '0,00 MAD',
      total: '25,00 MAD',
      method: 'Carte bancaire',
    };
    const lost = agentReply('J’ai oublié mon sac', ride);
    expect(lost.topic).toBe('lost');
    expect(lost.action).toMatch(/1287/);
    for (const text of ['Je veux un remboursement', 'This is a scam', 'Le chauffeur m’a menacé'])
      expect(agentReply(text, ride).handoff).toBe(true);
    expect(detectTopic('comment partager la course ?')).toBe('split');
    expect(agentReply('qwerty', ride).unsure).toBe(true);
  });
});
