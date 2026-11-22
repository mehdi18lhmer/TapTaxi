// Passenger notifications, derived from the wallet and bookings (nothing extra to store).
import { dateLabel, money, timeLabel } from './model';
import type { PassengerState } from './passenger';
import { activePassengerRide, bookingReminder, statusLabel, upcomingBookings } from './rides';
import type { RidesState } from './rides';
import { place } from './places';

export interface Notice {
  id: string;
  at: number;
  title: string;
  body: string;
  icon: 'gift' | 'calendar' | 'taxi' | 'wallet';
  path: string;
}

export function passengerNotices(p: PassengerState, r: RidesState, now = Date.now()): Notice[] {
  const items: Notice[] = [];
  const ride = activePassengerRide(r);
  if (ride)
    items.push({
      id: `ride-${ride.id}`,
      at: ride.acceptedAt ?? ride.requestedAt,
      title: statusLabel[ride.status],
      body: `Vers ${place(ride.destination).name} · taxi n° 1287`,
      icon: 'taxi',
      path: `/passenger/ride/${ride.id}`,
    });
  const reminder = bookingReminder(r, now);
  if (reminder)
    items.push({
      id: `rem-${reminder.booking.id}`,
      at: now,
      title: reminder.soon ? 'Votre taxi arrive bientôt' : 'Rappel de réservation',
      body: `${place(reminder.booking.pickup).name} → ${place(reminder.booking.destination).name}, ${dateLabel(reminder.booking.at, { weekday: 'long' })} à ${timeLabel(reminder.booking.at)}`,
      icon: 'calendar',
      path: `/passenger/booking/${reminder.booking.id}`,
    });
  for (const b of upcomingBookings(r, { now, origin: 'passenger' }).slice(reminder ? 1 : 0, 3))
    items.push({
      id: `bk-${b.id}`,
      at: b.createdAt,
      title: 'Réservation confirmée',
      body: `${place(b.destination).name} · ${dateLabel(b.at, { day: 'numeric', month: 'short' })} à ${timeLabel(b.at)}`,
      icon: 'calendar',
      path: `/passenger/booking/${b.id}`,
    });
  for (const e of p.wallet.filter((e) => e.kind === 'gift-received'))
    items.push({
      id: e.id,
      at: e.at,
      title: `${e.contact?.name ?? 'Un proche'} vous offre ${money(e.amount)} MAD`,
      body: e.message
        ? `« ${e.message} » · ajouté à votre solde TapTaxi`
        : 'Ajouté à votre solde TapTaxi',
      icon: 'gift',
      path: '/passenger/wallet',
    });
  for (const e of p.wallet.filter((e) => e.kind === 'topup' && e.status === 'pending'))
    items.push({
      id: e.id,
      at: e.at,
      title: `Recharge en attente · ${money(e.amount)} MAD`,
      body: `Présentez le code ${e.code} chez ${e.agent}.`,
      icon: 'wallet',
      path: '/passenger/wallet',
    });
  return items.sort((a, b) => b.at - a.at);
}
