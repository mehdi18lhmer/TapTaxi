// Demand prediction for guaranteed rides: a demand score per area for the next 30–60 minutes.
// Demo model with mock Casablanca data. A real model learns from past requests and bookings by
// place and hour, day of week, flight arrivals, train timetables, events and weather.
// Pure and deterministic: the same time always gives the same map.

export type DemandLevel = 'low' | 'medium' | 'high' | 'peak';

export interface DemandZone {
  id: string;
  name: string;
  x: number;
  y: number;
  /** Map radius, in grid units. */
  r: number;
}

export const ZONES: readonly DemandZone[] = [
  { id: 'voyageurs', name: 'Casa Voyageurs', x: 75, y: 36, r: 9 },
  { id: 'casaport', name: 'Casa Port', x: 65, y: 21, r: 7 },
  { id: 'airport', name: 'Aéroport Mohammed V', x: 40, y: 95, r: 8 },
  { id: 'uh2', name: 'Université Hassan II', x: 47, y: 73, r: 8 },
  { id: 'benmsik', name: 'Fac. Ben M’Sik', x: 79, y: 64, r: 7 },
  { id: 'maarif', name: 'Maârif · Twin Center', x: 44, y: 44, r: 10 },
  { id: 'centre', name: 'Centre-ville', x: 56, y: 30, r: 8 },
  { id: 'corniche', name: 'Aïn Diab · Morocco Mall', x: 17, y: 36, r: 10 },
  { id: 'derb', name: 'Derb Sultan', x: 64, y: 52, r: 7 },
];

/** Mock timetables (minutes after midnight). */
const TRAIN_ARRIVALS = [
  7 * 60 + 40,
  9 * 60 + 40,
  12 * 60 + 40,
  14 * 60 + 40,
  17 * 60 + 40,
  18 * 60 + 40,
  20 * 60 + 40,
  22 * 60 + 10,
];
const FLIGHT_ARRIVALS = [
  { at: 8 * 60 + 15, flight: 'AT 201 · Paris' },
  { at: 11 * 60 + 50, flight: 'AT 965 · Madrid' },
  { at: 15 * 60 + 30, flight: 'AT 805 · Dubaï' },
  { at: 19 * 60 + 10, flight: 'AT 205 · Paris' },
  { at: 22 * 60 + 45, flight: 'AT 731 · Londres' },
];
/** A football match at the Stade Mohammed V on Sunday evenings (demo event). */
const EVENT = { day: 0, end: 21 * 60 + 45, name: 'Fin du match au Stade Mohammed V' };

export const INPUTS = [
  'Demandes et réservations passées, par lieu et par heure',
  'Jour de la semaine',
  'Arrivées des vols (aéroport Mohammed V)',
  'Horaires ONCF (Casa Voyageurs, Casa Port)',
  'Événements en ville',
  'Météo',
] as const;

const casablanca = (at: number) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Casablanca',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { minutes: Number(get('hour')) * 60 + Number(get('minute')), weekday };
};

/** Mock weather: light rain on weekday evenings between 17:00 and 20:00. */
export const rainExpected = (at: number) => {
  const { minutes, weekday } = casablanca(at);
  return weekday >= 1 && weekday <= 4 && minutes >= 17 * 60 && minutes < 20 * 60;
};

/** 1 when `minutes` is right after `event`, fading to 0 within `window` minutes. */
const boost = (minutes: number, event: number, window = 25) => {
  const delta = minutes - event;
  if (delta < -5 || delta > window) return 0;
  return delta < 0 ? 0.6 : 1 - delta / (window * 1.4);
};

const peakHours = (minutes: number, ranges: [number, number][]) =>
  ranges.some(([a, b]) => minutes >= a * 60 && minutes < b * 60) ? 1 : 0;

interface Score {
  score: number;
  reason: string;
}

function scoreAt(zone: DemandZone, at: number): Score {
  const { minutes, weekday } = casablanca(at);
  const weekend = weekday === 0 || weekday === 6;
  const night = minutes < 6 * 60 || minutes >= 23 * 60;
  let score = night ? 12 : 30;
  let reason = 'Demande habituelle à cette heure';
  const add = (extra: number, why: string) => {
    if (extra > 0 && extra >= 10) {
      score += extra;
      reason = why;
    } else score += extra;
  };
  switch (zone.id) {
    case 'voyageurs':
    case 'casaport': {
      const best = Math.max(...TRAIN_ARRIVALS.map((t) => boost(minutes, t)));
      const train = TRAIN_ARRIVALS.find((t) => boost(minutes, t) === best);
      add(
        Math.round(best * (zone.id === 'voyageurs' ? 60 : 40)),
        train !== undefined
          ? `Arrivée de train ${zone.id === 'voyageurs' ? 'Al Boraq ' : ''}à ${String(Math.floor(train / 60)).padStart(2, '0')}:${String(train % 60).padStart(2, '0')}`
          : 'Trains',
      );
      break;
    }
    case 'airport': {
      const best = Math.max(...FLIGHT_ARRIVALS.map((f) => boost(minutes, f.at, 40)));
      const flight = FLIGHT_ARRIVALS.find((f) => boost(minutes, f.at, 40) === best);
      add(Math.round(best * 55), flight ? `Arrivée du vol ${flight.flight}` : 'Vols');
      break;
    }
    case 'uh2':
    case 'benmsik':
      if (!weekend)
        add(
          peakHours(minutes, [
            [12, 13],
            [16, 18],
          ]) * 45,
          'Sortie des cours',
        );
      break;
    case 'maarif':
      add(
        peakHours(minutes, [
          [8, 9],
          [17, 21],
        ]) * 35,
        'Bureaux et commerces',
      );
      break;
    case 'centre':
      add(
        peakHours(minutes, [
          [8, 10],
          [12, 14],
          [17, 19],
        ]) * 30,
        'Heure de pointe',
      );
      break;
    case 'corniche':
      add(
        (weekend ? 1 : 0.4) * peakHours(minutes, [[18, 23]]) * 50,
        weekend ? 'Soirée du week-end' : 'Soirée sur la corniche',
      );
      break;
    case 'derb':
      if (weekday === EVENT.day) add(Math.round(boost(minutes, EVENT.end, 40) * 60), EVENT.name);
      add(peakHours(minutes, [[10, 12]]) * 15, 'Marchés');
      break;
  }
  if (rainExpected(at)) {
    score += 12;
    if (score < 60) reason = `${reason} · pluie prévue`;
  }
  return { score: Math.max(0, Math.min(100, Math.round(score))), reason };
}

export const levelOf = (score: number): DemandLevel =>
  score >= 80 ? 'peak' : score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low';

export const levelLabel: Record<DemandLevel, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Forte',
  peak: 'Très forte',
};

export interface ZoneForecast extends DemandZone {
  score: number;
  level: DemandLevel;
  reason: string;
  /** Minutes from now to this zone's highest score within the window. */
  peakIn: number;
}

/** Demand per zone `minutesAhead` from now (0, 30 or 60), highest first. */
export function forecast(now: number, minutesAhead = 0): ZoneForecast[] {
  return ZONES.map((zone) => {
    // Look 0–30 min after the chosen time and keep the peak.
    let best = { score: -1, reason: '', at: 0 };
    for (let step = 0; step <= 30; step += 5) {
      const s = scoreAt(zone, now + (minutesAhead + step) * 60_000);
      if (s.score > best.score) best = { ...s, at: minutesAhead + step };
    }
    return {
      ...zone,
      score: best.score,
      level: levelOf(best.score),
      reason: best.reason,
      peakIn: best.at,
    };
  }).sort((a, b) => b.score - a.score);
}

/** The notification sent to drivers: the strongest zone in the next hour. */
export function hotspot(now: number) {
  const next = [...forecast(now, 0), ...forecast(now, 30)].sort((a, b) => b.score - a.score)[0];
  return {
    zone: next,
    message:
      next.score >= 40
        ? `${levelLabel[next.level]} demande à ${next.name} ${next.peakIn <= 5 ? 'maintenant' : `dans ${next.peakIn} min`}`
        : `Demande calme · meilleure zone : ${next.name}`,
  };
}
