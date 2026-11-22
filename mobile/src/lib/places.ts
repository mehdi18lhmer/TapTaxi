// Casablanca places used by the demo (request, bookings, demand map). Pure data + helpers.
// Positions are on the demo map grid (0–100 on both axes, north at the top, the ocean to the
// north-west). One grid unit is about 150 m, so 100 units ≈ 15 km.

export type PlaceKind = 'station' | 'airport' | 'hotel' | 'university' | 'district' | 'mall';

export interface Place {
  id: string;
  name: string;
  /** Short line under the name, e.g. the district. */
  area: string;
  kind: PlaceKind;
  x: number;
  y: number;
  /** Road distance from the city centre when the place is off the map (the airport). */
  offMapKm?: number;
}

export const PLACES: readonly Place[] = [
  { id: 'maarif', name: 'Maârif', area: 'Bd Zerktouni', kind: 'district', x: 42, y: 47 },
  { id: 'twin', name: 'Twin Center', area: 'Maârif', kind: 'district', x: 45, y: 42 },
  { id: 'kenzi', name: 'Hôtel Kenzi Tower', area: 'Twin Center', kind: 'hotel', x: 46, y: 41 },
  { id: 'gauthier', name: 'Gauthier', area: 'Centre-ville', kind: 'district', x: 52, y: 35 },
  {
    id: 'hyatt',
    name: 'Hyatt Regency',
    area: 'Place des Nations Unies',
    kind: 'hotel',
    x: 58,
    y: 28,
  },
  {
    id: 'sofitel',
    name: 'Sofitel Tour Blanche',
    area: 'Centre-ville',
    kind: 'hotel',
    x: 62,
    y: 25,
  },
  { id: 'casaport', name: 'Gare Casa Port', area: 'Port', kind: 'station', x: 65, y: 21 },
  {
    id: 'voyageurs',
    name: 'Gare Casa Voyageurs',
    area: 'Belvédère',
    kind: 'station',
    x: 75,
    y: 36,
  },
  { id: 'hassan2', name: 'Mosquée Hassan II', area: 'Corniche', kind: 'district', x: 48, y: 16 },
  { id: 'aindiab', name: 'Aïn Diab', area: 'Corniche', kind: 'district', x: 22, y: 29 },
  { id: 'mall', name: 'Morocco Mall', area: 'Corniche', kind: 'mall', x: 12, y: 42 },
  { id: 'derb', name: 'Derb Sultan', area: 'Al Fida', kind: 'district', x: 64, y: 52 },
  { id: 'uh2', name: 'Université Hassan II', area: 'Aïn Chock', kind: 'university', x: 47, y: 73 },
  { id: 'benmsik', name: 'Faculté Ben M’Sik', area: 'Ben M’Sik', kind: 'university', x: 79, y: 64 },
  {
    id: 'sidimaarouf',
    name: 'Sidi Maârouf',
    area: 'Casanearshore',
    kind: 'district',
    x: 35,
    y: 82,
  },
  {
    id: 'airport',
    name: 'Aéroport Mohammed V',
    area: 'Nouaceur · 30 km',
    kind: 'airport',
    x: 40,
    y: 99,
    offMapKm: 30,
  },
];

/** Where the demo passenger stands. */
export const PASSENGER_POSITION = { x: 42, y: 47 } as const;

/** Taxis can be requested within this radius (km). */
export const REQUEST_RADIUS_KM = 1;

export const KM_PER_UNIT = 0.15;
/** Roads are longer than a straight line. */
const ROAD_FACTOR = 1.3;

export function placeById(id: string): Place | undefined {
  return PLACES.find((p) => p.id === id);
}

export function place(id: string): Place {
  const found = placeById(id);
  if (!found) throw new Error('Lieu inconnu.');
  return found;
}

const straightKm = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y) * KM_PER_UNIT;

/** Road distance in km, rounded to 0.1 km. The airport uses its known distance. */
export function roadKm(from: Place, to: Place) {
  if (from.id === to.id) return 0;
  const offMap = from.offMapKm ?? to.offMapKm;
  const km = offMap
    ? offMap + straightKm(from.offMapKm ? to : from, { x: 50, y: 40 }) * 0.5
    : straightKm(from, to) * ROAD_FACTOR;
  return Math.round(km * 10) / 10;
}

export const kmLabel = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`;

export interface NearbyTaxi {
  id: string;
  taxi: string;
  x: number;
  y: number;
  km: number;
  /** Minutes to reach the passenger. */
  eta: number;
}

/** Free TapTaxi taxis around the passenger (demo positions), nearest first. */
export function nearbyTaxis(
  at: { x: number; y: number } = PASSENGER_POSITION,
  radiusKm = REQUEST_RADIUS_KM,
): NearbyTaxi[] {
  const offsets: [string, number, number][] = [
    ['1287', 2.5, -2.2],
    ['0954', -4.1, 1.6],
    ['2210', 1.2, 4.6],
    ['1733', -2.2, -4.9],
    ['3021', 9.5, 6.8], // outside 1 km
  ];
  return offsets
    .map(([taxi, dx, dy]) => {
      const km = Math.round(Math.hypot(dx, dy) * KM_PER_UNIT * 10) / 10;
      return {
        id: taxi,
        taxi,
        x: at.x + dx,
        y: at.y + dy,
        km,
        eta: Math.max(2, Math.round(km * 4)),
      };
    })
    .filter((t) => t.km <= radiusKm)
    .sort((a, b) => a.km - b.km);
}

/** Destinations offered for a booking: airport, train stations and hotels first. */
export const BOOKING_DESTINATIONS = (['airport', 'station', 'hotel'] as const).flatMap((kind) =>
  PLACES.filter((p) => p.kind === kind),
);
