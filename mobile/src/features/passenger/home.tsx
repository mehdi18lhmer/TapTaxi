import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  Divider,
  Heading,
  Icon,
  IconButton,
  Info,
  Logo,
  MenuRow,
  Notice,
  Row,
  Screen,
  Shortcut,
  Stack,
  Txt,
} from '@/components/ui';
import { CityMap } from '@/components/city-map';
import { dateLabel, methodLabel, money, passengerPaid, timeLabel } from '@/lib/model';
import { cardLabel, preferredCard } from '@/lib/passenger';
import { usePassenger } from '@/lib/passenger-store';
import { walletBalance } from '@/lib/passenger-wallet';
import { useStore } from '@/lib/store';
import { useRides } from '@/lib/rides-store';
import { activePassengerRide, bookingReminder, statusLabel } from '@/lib/rides';
import { nearbyTaxis, PASSENGER_POSITION, place, REQUEST_RADIUS_KM } from '@/lib/places';
import { passengerNotices } from '@/lib/notices';
import { colors as c, radius, space } from '@/theme';

/** Home for the passenger role: request a taxi, wallet, bookings, receipts. */
export function PassengerHome() {
  const { state } = useStore();
  const { passenger } = usePassenger();
  const { rides } = useRides();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const card = preferredCard(passenger);
  const taxis = nearbyTaxis();
  const ride = activePassengerRide(rides);
  const reminder = bookingReminder(rides, now);
  const notices = passengerNotices(passenger, rides, now);
  const recent = state.transactions
    .filter((t) => (t.kind === 'payment' && (!t.split || t.split.part === 1)) || t.kind === 'cash')
    .slice(0, 3);

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Logo />
        <IconButton
          icon="bell"
          label="Notifications"
          badge={notices.length ? String(notices.length) : undefined}
          onPress={() => router.push('/passenger/notifications')}
        />
      </Row>
      <Txt variant="heading">
        Bonjour {passenger.account?.firstName ?? ''}
        <Txt variant="heading" style={{ color: c.red }}>
          .
        </Txt>
      </Txt>

      {ride && (
        <Notice
          tone="dark"
          icon="taxi"
          title={statusLabel[ride.status]}
          onPress={() => router.push(`/passenger/ride/${ride.id}`)}
        >
          Vers {place(ride.destination).name} · touchez pour suivre la course
        </Notice>
      )}
      {reminder && (
        <Notice
          tone={reminder.soon ? 'warning' : 'neutral'}
          icon="calendar"
          title={reminder.soon ? 'Votre taxi arrive bientôt' : 'Rappel de réservation'}
          onPress={() => router.push(`/passenger/booking/${reminder.booking.id}`)}
        >
          {place(reminder.booking.destination).name} ·{' '}
          {dateLabel(reminder.booking.at, { weekday: 'long' })} à {timeLabel(reminder.booking.at)}
        </Notice>
      )}

      {/* Request a taxi within 1 km */}
      <Card style={{ padding: space.md, gap: space.md }}>
        <CityMap
          height={190}
          center={PASSENGER_POSITION}
          radiusKm={REQUEST_RADIUS_KM}
          showLabels={false}
          markers={[
            ...taxis.map((t) => ({ id: t.id, x: t.x, y: t.y, kind: 'taxi' as const })),
            { id: 'me', kind: 'me' as const, ...PASSENGER_POSITION },
          ]}
        />
        <Row style={{ paddingHorizontal: space.sm }}>
          <Stack gap={0} style={{ flex: 1 }}>
            <Txt variant="headline">{taxis.length} taxis libres à moins de 1 km</Txt>
            <Txt variant="caption">Le plus proche arrive en ~{taxis[0]?.eta ?? 3} min · Maârif</Txt>
          </Stack>
        </Row>
        <Button
          title={ride ? 'Suivre ma course' : 'Demander un taxi'}
          icon="taxi"
          testID="request-taxi"
          onPress={() => router.push(ride ? `/passenger/ride/${ride.id}` : '/passenger/request')}
        />
      </Card>

      {/* TapTaxi wallet */}
      <Card dark>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="caption" style={{ color: c.lightOnDark }}>
            Solde TapTaxi
          </Txt>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/passenger/wallet')}
            hitSlop={10}
          >
            <Txt variant="caption" style={{ color: c.lightOnDark }}>
              Historique ›
            </Txt>
          </Pressable>
        </Row>
        <Txt selectable variant="money" style={{ color: c.surface, fontSize: 38 }}>
          {money(walletBalance(passenger))}
          <Txt style={{ color: c.lightOnDark }}> MAD</Txt>
        </Txt>
      </Card>
      <Row style={{ gap: space.xs }}>
        <Shortcut
          icon="plus"
          label="Recharger"
          primary
          onPress={() => router.push('/passenger/topup')}
        />
        <Shortcut icon="gift" label="Offrir" onPress={() => router.push('/passenger/gift')} />
        <Shortcut icon="calendar" label="Réserver" onPress={() => router.push('/passenger/book')} />
        <Shortcut icon="qr" label="Scanner" onPress={() => router.navigate('/scan')} />
      </Row>

      {/* The card that will be pre-selected when paying. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={card ? `Carte par défaut : ${cardLabel(card)}` : 'Ajouter une carte'}
        onPress={() => router.push(card ? '/passenger/cards' : '/passenger/add-card')}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Card>
          <Row>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.md,
                backgroundColor: card ? c.ink : c.redSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="card" color={card ? c.surface : c.red} />
            </View>
            <Stack gap={0} style={{ flex: 1 }}>
              <Txt variant="caption">Carte enregistrée</Txt>
              <Txt variant="headline">{card ? cardLabel(card) : 'Ajoutez une carte'}</Txt>
              <Txt variant="small">{card ? 'Paiement en un geste' : 'Pour payer en un geste'}</Txt>
            </Stack>
            <Badge neutral>{card ? 'Gérer' : 'Ajouter'}</Badge>
          </Row>
        </Card>
      </Pressable>

      <Card style={{ paddingBottom: space.sm }}>
        <Heading
          title="Dernières courses"
          action="Tout voir"
          onPress={() => router.navigate('/receipts')}
        />
        {recent.length ? (
          recent.map((t, i) => (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityLabel={`Course ${t.id}, ${money(passengerPaid(t))} MAD`}
              onPress={() => router.push(`/passenger/trip/${t.id}`)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              {i > 0 && <Divider />}
              <Row style={{ paddingVertical: space.md }}>
                <Icon name={t.kind === 'cash' ? 'cash' : 'taxi'} size={20} />
                <Stack gap={0} style={{ flex: 1 }}>
                  <Txt variant="headline" style={{ fontSize: 13 }}>
                    Taxi n° 1287
                  </Txt>
                  <Txt variant="caption" style={{ fontSize: 11 }}>
                    {dateLabel(t.at)} · {methodLabel(t.method)}
                  </Txt>
                </Stack>
                <Txt variant="headline" style={{ fontSize: 14 }}>
                  {money(passengerPaid(t))} MAD
                </Txt>
              </Row>
            </Pressable>
          ))
        ) : (
          <Txt variant="caption" style={{ paddingBottom: space.md }}>
            Vos courses apparaîtront ici.
          </Txt>
        )}
      </Card>

      <Card style={{ gap: 0, paddingVertical: space.xs }}>
        <MenuRow
          title="Pourquoi TapTaxi ?"
          sub="Taxis agréés · compteur officiel + 1–3 MAD"
          icon="shield"
          onPress={() => router.push('/why')}
        />
        <Divider />
        <MenuRow
          title="Nos frais"
          sub="Toujours affichés avant de payer"
          icon="file"
          onPress={() => router.push('/fees')}
        />
        <Divider />
        <MenuRow
          title="Assistant support"
          sub="Français · العربية · Darija · English"
          icon="chat"
          onPress={() => router.push('/passenger/support-chat')}
        />
      </Card>
      <Info>Démo : taxis, trajets et paiements sont simulés sur cet appareil.</Info>
    </Screen>
  );
}
