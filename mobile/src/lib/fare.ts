// Fare check: what a ride should cost on the official meter, shown before paying.
// Demo tariff, close to a Casablanca petit taxi: pick-up 1,60 MAD, about 2,50 MAD per km,
// waiting time on the meter, 7,50 MAD minimum, +50 % at night. Amounts are integer centimes.
import { isNight } from './model';

export const TARIFF = {
  pickup: 160,
  perKm: 250,
  /** Waiting time stays on the meter (wait & return). */
  perWaitingMinute: 30,
  minimum: 750,
  nightFactor: 1.5,
} as const;

export interface FareRange {
  min: number;
  max: number;
  /** Most likely meter fare. */
  likely: number;
}

const roundMad = (cents: number) => Math.round(cents / 100) * 100;

export function estimateFare(
  km: number,
  { at = Date.now(), waitMinutes = 0, roundTrip = false } = {},
): FareRange {
  const distance = roundTrip ? km * 2 : km;
  let likely = TARIFF.pickup + distance * TARIFF.perKm + waitMinutes * TARIFF.perWaitingMinute;
  likely = Math.max(TARIFF.minimum, likely);
  if (isNight(at)) likely *= TARIFF.nightFactor;
  likely = Math.round(likely);
  return {
    likely,
    min: Math.max(TARIFF.minimum, roundMad(likely * 0.9)),
    max: roundMad(likely * 1.15) + 100,
  };
}

export type FareVerdict = 'ok' | 'low' | 'high';

/** Compares the meter fare with the estimate. A fare above the range deserves a second look. */
export function checkFare(fare: number, range: FareRange): FareVerdict {
  if (fare > range.max) return 'high';
  if (fare < range.min) return 'low';
  return 'ok';
}

export const rangeLabel = (r: FareRange) =>
  `${Math.round(r.min / 100)}–${Math.round(r.max / 100)} MAD`;
