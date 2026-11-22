import { describe, expect, it } from 'vitest';
import {
  addMessage,
  closeRequest,
  createRequest,
  emptySupport,
  promisedReply,
  requestsFor,
  restoreSupport,
} from './support';

const NOW = Date.UTC(2026, 10, 20, 12);
const base = {
  role: 'passenger' as const,
  category: 'payment' as const,
  subject: 'Double débit',
  body: 'J’ai été débitée deux fois pour la même course.',
};

describe('support requests', () => {
  it('creates a request with my message and an automatic acknowledgement', () => {
    const { request, state } = createRequest(
      emptySupport(),
      { ...base, paymentId: 'AB12' },
      'S1',
      NOW,
    );
    expect(state.requests).toHaveLength(1);
    expect(request).toMatchObject({
      id: 'S1',
      status: 'open',
      paymentId: 'AB12',
      role: 'passenger',
    });
    expect(request.messages.map((m) => m.from)).toEqual(['me', 'support']);
    expect(request.messages[1].automatic).toBe(true);
    expect(request.messages[1].body).toContain('4 heures');
    expect(promisedReply('account')).toBe('24 heures');
  });

  it('refuses empty, too short, or wrong-category requests', () => {
    expect(() => createRequest(emptySupport(), { ...base, subject: ' ' }, 'S1', NOW)).toThrow(
      /titre/,
    );
    expect(() => createRequest(emptySupport(), { ...base, body: 'aide' }, 'S1', NOW)).toThrow(
      /10 caractères/,
    );
    // "Retrait" is a driver topic, not a passenger one.
    expect(() =>
      createRequest(emptySupport(), { ...base, category: 'withdrawal' }, 'S1', NOW),
    ).toThrow(/sujet/);
  });

  it('a reply reopens the request; a closed request takes no more messages', () => {
    let s = createRequest(emptySupport(), base, 'S1', NOW).state;
    s = addMessage(s, 'S1', 'Voici la référence : TT-AB12.', NOW + 1000);
    expect(s.requests[0].messages).toHaveLength(3);
    expect(s.requests[0].updatedAt).toBe(NOW + 1000);
    s = closeRequest(s, 'S1', NOW + 2000);
    expect(s.requests[0].status).toBe('closed');
    expect(() => addMessage(s, 'S1', 'Encore une question ici', NOW + 3000)).toThrow(/fermée/);
  });

  it('shows each role only its own requests, open ones first', () => {
    let s = createRequest(emptySupport(), base, 'P1', NOW).state;
    s = createRequest(s, { ...base, subject: 'Autre souci' }, 'P2', NOW + 10).state;
    s = createRequest(
      s,
      { ...base, role: 'driver', category: 'withdrawal', subject: 'Retrait' },
      'D1',
      NOW,
    ).state;
    s = closeRequest(s, 'P2', NOW + 20);
    expect(requestsFor(s, 'passenger').map((r) => r.id)).toEqual(['P1', 'P2']);
    expect(requestsFor(s, 'driver').map((r) => r.id)).toEqual(['D1']);
  });

  it('restores only well-formed saved data', () => {
    const s = createRequest(emptySupport(), base, 'S1', NOW).state;
    expect(restoreSupport(JSON.stringify(s))).toEqual(s);
    expect(restoreSupport('{nope')).toEqual(emptySupport());
    expect(restoreSupport(JSON.stringify({ version: 1, requests: [{ id: 1 }] }))).toEqual(
      emptySupport(),
    );
  });
});
