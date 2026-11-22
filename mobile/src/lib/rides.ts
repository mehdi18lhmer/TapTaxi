// Taxi requests, rides and bookings. Pure functions: state in, state out (no React/Expo).
//
// Not a booking app for street rides: the passenger sends a request and a free TapTaxi taxi
// within 1 km accepts it. Bookings (airport, hotels) are set in advance for a date and time.
// Demo: the passenger and the driver share this device, so the same ride appears on both
// sides. A real version keeps rides on a server and dispatches them to nearby drivers.
import { estimateFare } from './fare';
import type { FareRange } from './fare';
import { nearbyTaxis, place, roadKm } from './places';

export type RideStatus =
  | 'searching' // request sent, waiting for a driver
  | 'accepted' // driver on the way
  | 'arrived' // driver at the pick-up point
  | 'onboard' // ride in progress
  | 'waiting' // wait & return: driver waits at the destination
  | 'returning' // wait & return: ride back
  | 'ended' // at destination, the driver shows the payment QR
  | 'paid'
  | 'cancelled'
  | 'declined';

export interface Ride {
  id: string;
  /** "passenger": sent from this device's passenger app; "demo": simulated passenger. */
  origin: 'passenger' | 'demo';
  passengerName: string;
  pickup: string;
  destination: string;
  km: number;
  /** Distance between the driver and the pick-up point when the request was sent. */
  driverKm: number;
  estimate: FareRange;
  waitReturn: boolean;
  status: RideStatus;
  requestedAt: number;
  acceptedAt?: number;
  arrivedAt?: number;
  startedAt?: number;
  waitStartedAt?: number;
  waitEndedAt?: number;
  endedAt?: number;
  /** Payment request shown as QR at the end of the ride. */
  paymentId?: string;
  meterFare?: number;
  bookingId?: string;
}

export type BookingKind = 'airport' | 'hotel' | 'station' | 'other';

export interface Booking {
  id: string;
  origin: 'passenger' | 'demo';
  passengerName: string;
  kind: BookingKind;
  pickup: string;
  destination: string;
  at: number;
  km: number;
  estimate: FareRange;
  waitReturn: boolean;
  status: 'confirmed' | 'cancelled';
  createdAt: number;
  /** Airport and hotel bookings are offered first to the nearest drivers. */
  priority: boolean;
  /** The demo driver (taxi 1287) took this booking. */
  driverAccepted: boolean;
}

export interface RidesState {
  version: 1;
  rides: Ride[];
  bookings: Booking[];
}

/** The demo driver who accepts requests. */
export const DEMO_DRIVER = {
  name: 'Youssef B.',
  fullName: 'Youssef Benali',
  taxi: '1287',
  plate: '48213 | ب | 6',
  rating: '4,9',
  phone: '6 12 •• •• 78',
} as const;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const MINUTE = 60_000;

/** The driver reaches the passenger in about 4 minutes per km. */
export const etaMinutes = (driverKm: number) => Math.max(2, Math.round(driverKm * 4));

const ACTIVE: RideStatus[] = [
  'searching',
  'accepted',
  'arrived',
  'onboard',
  'waiting',
  'returning',
  'ended',
];
export const isActive = (r: Ride) => ACTIVE.includes(r.status);

export const statusLabel: Record<RideStatus, string> = {
  searching: 'Recherche d’un taxi',
  accepted: 'Chauffeur en route',
  arrived: 'Chauffeur arrivé',
  onboard: 'Course en cours',
  waiting: 'Attente à destination',
  returning: 'Retour en cours',
  ended: 'Arrivé · paiement',
  paid: 'Payée',
  cancelled: 'Annulée',
  declined: 'Refusée',
};

function seedRides(now: number): Ride[] {
  return [demoRequest('DEMO01', 0, now - 40_000)];
}

function seedBookings(now: number): Booking[] {
  const tomorrow = new Date(now + DAY);
  tomorrow.setHours(6, 30, 0, 0);
  const evening = new Date(now + 2 * DAY);
  evening.setHours(19, 15, 0, 0);
  return [
    buildBooking(
      'BKD01',
      { pickup: 'hyatt', destination: 'airport', at: tomorrow.getTime(), waitReturn: false },
      'Mme Laurent',
      'demo',
      now,
    ),
    buildBooking(
      'BKD02',
      { pickup: 'voyageurs', destination: 'sofitel', at: evening.getTime(), waitReturn: false },
      'M. Alaoui',
      'demo',
      now,
    ),
  ];
}

export const emptyRides = (now = Date.now()): RidesState => ({
  version: 1,
  rides: seedRides(now),
  bookings: seedBookings(now),
});

// ---------- Requests (within 1 km) ----------

export interface RequestInput {
  pickup: string;
  destination: string;
  waitReturn: boolean;
}

export function rideEstimate(input: RequestInput, at = Date.now(), waitMinutes = 0) {
  const km = roadKm(place(input.pickup), place(input.destination));
  return {
    km,
    estimate: estimateFare(km, {
      at,
      roundTrip: input.waitReturn,
      waitMinutes: input.waitReturn ? Math.max(waitMinutes, 15) : waitMinutes,
    }),
  };
}

export function activePassengerRide(s: RidesState): Ride | undefined {
  return s.rides.find((r) => r.origin === 'passenger' && isActive(r));
}

/** The passenger sends a request; the nearest free taxi within 1 km will accept it. */
export function requestRide(
  s: RidesState,
  input: RequestInput,
  passengerName: string,
  id: string,
  now = Date.now(),
): RidesState {
  if (input.pickup === input.destination) throw new Error('Choisissez une destination différente.');
  if (activePassengerRide(s)) throw new Error('Vous avez déjà une course en cours.');
  const nearest = nearbyTaxis()[0];
  if (!nearest) throw new Error('Aucun taxi libre à moins de 1 km pour le moment.');
  const { km, estimate } = rideEstimate(input, now);
  const ride: Ride = {
    id,
    origin: 'passenger',
    passengerName,
    pickup: input.pickup,
    destination: input.destination,
    km,
    driverKm: nearest.km,
    estimate,
    waitReturn: input.waitReturn,
    status: 'searching',
    requestedAt: now,
  };
  return { ...s, rides: [ride, ...s.rides] };
}

const DEMO_TRIPS: [string, string, string, number][] = [
  ['Salma', 'twin', 'voyageurs', 0.6],
  ['Karim', 'gauthier', 'mall', 0.8],
  ['Nadia', 'maarif', 'uh2', 0.4],
  ['Omar', 'hyatt', 'aindiab', 0.9],
];

function demoRequest(id: string, index: number, now: number): Ride {
  const [passengerName, pickup, destination, driverKm] = DEMO_TRIPS[index % DEMO_TRIPS.length];
  const { km, estimate } = rideEstimate({ pickup, destination, waitReturn: false }, now);
  return {
    id,
    origin: 'demo',
    passengerName,
    pickup,
    destination,
    km,
    driverKm,
    estimate,
    waitReturn: false,
    status: 'searching',
    requestedAt: now,
  };
}

/** Driver side: simulates a new passenger request nearby (guaranteed rides). */
export function addDemoRequest(s: RidesState, id: string, now = Date.now()): RidesState {
  const count = s.rides.filter((r) => r.origin === 'demo').length;
  return { ...s, rides: [demoRequest(id, count, now), ...s.rides] };
}

/** Requests waiting for a driver, nearest first. */
export function incomingRequests(s: RidesState): Ride[] {
  return s.rides
    .filter((r) => r.status === 'searching')
    .sort((a, b) => a.driverKm - b.driverKm || b.requestedAt - a.requestedAt);
}

/** The ride the demo driver is doing now (accepted and not paid yet). */
export function activeDriverRide(s: RidesState): Ride | undefined {
  return s.rides.find((r) => isActive(r) && r.status !== 'searching');
}

function patch(s: RidesState, id: string, fn: (r: Ride) => Ride): RidesState {
  const found = s.rides.find((r) => r.id === id);
  if (!found) throw new Error('Course introuvable.');
  return { ...s, rides: s.rides.map((r) => (r.id === id ? fn(r) : r)) };
}

/**
 * The driver accepts a request. `simulated`: the demo's simulated driver accepting the
 * passenger's own request, which never waits for the driver's other ride.
 */
export function acceptRide(
  s: RidesState,
  id: string,
  now = Date.now(),
  { simulated = false } = {},
): RidesState {
  const current = activeDriverRide(s);
  if (!simulated && current && current.id !== id)
    throw new Error('Terminez votre course en cours avant d’en accepter une autre.');
  return patch(s, id, (r) => {
    if (r.status !== 'searching') return r;
    return { ...r, status: 'accepted', acceptedAt: now };
  });
}

export function declineRide(s: RidesState, id: string): RidesState {
  return patch(s, id, (r) => {
    if (r.status !== 'searching') return r;
    // A passenger's own request goes to the next taxi: it stays visible to them.
    return r.origin === 'passenger' ? r : { ...r, status: 'declined' };
  });
}

export function cancelRide(s: RidesState, id: string): RidesState {
  return patch(s, id, (r) =>
    ['searching', 'accepted', 'arrived'].includes(r.status) ? { ...r, status: 'cancelled' } : r,
  );
}

/** The next step of a ride, or null when the ride needs a payment or is over. */
export function nextStatus(r: Ride): RideStatus | null {
  switch (r.status) {
    case 'accepted':
      return 'arrived';
    case 'arrived':
      return 'onboard';
    case 'onboard':
      return r.waitReturn ? 'waiting' : 'ended';
    case 'waiting':
      return 'returning';
    case 'returning':
      return 'ended';
    default:
      return null;
  }
}

/** Moves the ride one step forward. Calling it twice for the same step is harmless. */
export function advanceRide(
  s: RidesState,
  id: string,
  expected: RideStatus,
  now = Date.now(),
): RidesState {
  return patch(s, id, (r) => {
    if (r.status !== expected) return r;
    const next = nextStatus(r);
    if (!next) return r;
    const times: Partial<Ride> =
      next === 'arrived'
        ? { arrivedAt: now }
        : next === 'onboard'
          ? { startedAt: now }
          : next === 'waiting'
            ? { waitStartedAt: now }
            : next === 'returning'
              ? { waitEndedAt: now }
              : { endedAt: now };
    return { ...r, ...times, status: next };
  });
}

/** Minutes the driver has waited at the destination (wait & return). */
export function waitingMinutes(r: Ride, now = Date.now()) {
  if (!r.waitStartedAt) return 0;
  return Math.max(0, Math.floor(((r.waitEndedAt ?? now) - r.waitStartedAt) / MINUTE));
}

/**
 * Meter fare the demo shows at the end of a ride: the likely estimate, plus the waiting
 * time on the meter for wait & return.
 */
export function simulatedMeter(r: Ride, now = Date.now()) {
  const extraWait = r.waitReturn ? Math.max(0, waitingMinutes(r, now) - 15) : 0;
  return Math.round(r.estimate.likely / 10) * 10 + extraWait * 30;
}

/** The driver showed the payment QR for this ride. */
export function linkPayment(
  s: RidesState,
  id: string,
  paymentId: string,
  meterFare: number,
): RidesState {
  return patch(s, id, (r) => ({ ...r, paymentId, meterFare }));
}

export const rideForPayment = (s: RidesState, paymentId: string) =>
  s.rides.find((r) => r.paymentId === paymentId);

/** Marks the ride linked to this payment as paid (no change when there is none). */
export function markPaid(s: RidesState, paymentId: string): RidesState {
  if (!rideForPayment(s, paymentId)) return s;
  return {
    ...s,
    rides: s.rides.map((r) => (r.paymentId === paymentId ? { ...r, status: 'paid' } : r)),
  };
}

// ---------- Bookings (airport, hotels) ----------

export interface BookingInput {
  pickup: string;
  destination: string;
  at: number;
  waitReturn: boolean;
}

export const MIN_BOOKING_NOTICE = 30 * MINUTE;
export const MAX_BOOKING_AHEAD = 30 * DAY;
/** The passenger gets a reminder this long before pick-up. */
export const REMINDER_BEFORE = 60 * MINUTE;

const kindOf = (destination: string, pickup: string): BookingKind => {
  const kinds = [place(destination).kind, place(pickup).kind];
  if (kinds.includes('airport')) return 'airport';
  if (kinds.includes('hotel')) return 'hotel';
  if (kinds.includes('station')) return 'station';
  return 'other';
};

function buildBooking(
  id: string,
  input: BookingInput,
  passengerName: string,
  origin: Booking['origin'],
  now: number,
): Booking {
  const { km, estimate } = rideEstimate(input, input.at);
  const kind = kindOf(input.destination, input.pickup);
  return {
    id,
    origin,
    passengerName,
    kind,
    pickup: input.pickup,
    destination: input.destination,
    at: input.at,
    km,
    estimate,
    waitReturn: input.waitReturn,
    status: 'confirmed',
    createdAt: now,
    priority: kind === 'airport' || kind === 'hotel',
    driverAccepted: false,
  };
}

export function bookingError(input: BookingInput, now = Date.now()): string | null {
  if (input.pickup === input.destination) return 'Choisissez une destination différente.';
  if (!Number.isFinite(input.at)) return 'Choisissez une date et une heure.';
  if (input.at < now + MIN_BOOKING_NOTICE)
    return 'Réservez au moins 30 minutes à l’avance. Pour partir maintenant, demandez un taxi.';
  if (input.at > now + MAX_BOOKING_AHEAD) return 'Réservez au maximum 30 jours à l’avance.';
  return null;
}

export function createBooking(
  s: RidesState,
  input: BookingInput,
  passengerName: string,
  id: string,
  now = Date.now(),
): RidesState {
  const problem = bookingError(input, now);
  if (problem) throw new Error(problem);
  // The demo driver is nearby and gets airport/hotel bookings first.
  const booking = { ...buildBooking(id, input, passengerName, 'passenger', now) };
  return { ...s, bookings: [booking, ...s.bookings] };
}

export function cancelBooking(s: RidesState, id: string): RidesState {
  if (!s.bookings.some((b) => b.id === id)) throw new Error('Réservation introuvable.');
  return {
    ...s,
    bookings: s.bookings.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)),
  };
}

export function acceptBooking(s: RidesState, id: string): RidesState {
  return {
    ...s,
    bookings: s.bookings.map((b) =>
      b.id === id && b.status === 'confirmed' ? { ...b, driverAccepted: true } : b,
    ),
  };
}

/** Confirmed bookings still ahead, soonest first; priority (airport, hotels) first for drivers. */
export function upcomingBookings(
  s: RidesState,
  {
    now = Date.now(),
    origin,
    priorityFirst = false,
  }: {
    now?: number;
    origin?: Booking['origin'];
    priorityFirst?: boolean;
  } = {},
) {
  return s.bookings
    .filter((b) => b.status === 'confirmed' && b.at > now && (!origin || b.origin === origin))
    .sort((a, b) => (priorityFirst ? Number(b.priority) - Number(a.priority) : 0) || a.at - b.at);
}

/** Reminder before pick-up: the passenger's next booking within 24 hours. */
export function bookingReminder(s: RidesState, now = Date.now()) {
  const next = upcomingBookings(s, { now, origin: 'passenger' })[0];
  if (!next || next.at - now > DAY) return null;
  const minutes = Math.round((next.at - now) / MINUTE);
  return { booking: next, minutes, soon: next.at - now <= REMINDER_BEFORE };
}

// ---------- Storage ----------

export function restoreRides(raw: string | null, now = Date.now()): RidesState {
  try {
    const s = JSON.parse(raw ?? 'null') as RidesState;
    const ok =
      s?.version === 1 &&
      Array.isArray(s.rides) &&
      Array.isArray(s.bookings) &&
      s.rides.every(
        (r) =>
          typeof r?.id === 'string' &&
          r.status in statusLabel &&
          typeof r.pickup === 'string' &&
          typeof r.destination === 'string' &&
          typeof r.estimate?.likely === 'number',
      ) &&
      s.bookings.every(
        (b) => typeof b?.id === 'string' && Number.isFinite(b.at) && typeof b.pickup === 'string',
      );
    return ok ? s : emptyRides(now);
  } catch {
    return emptyRides(now);
  }
}
