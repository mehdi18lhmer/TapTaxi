import { useState } from 'react';
// Driver "Courses" tab: guaranteed rides. Requests and bookings come to the driver, so there
// is no need to search for passengers: incoming requests, the current ride, upcoming
// bookings (airport and hotels first to nearby drivers) and the demand map.
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  Divider,
  Heading,
  Icon,
  Info,
  Notice,
  Row,
  Screen,
  Stack,
  Txt,
} from '@/components/ui';
import { CityMap } from '@/components/city-map';
import { IncomingRequest } from './incoming-request';
import { dateLabel, timeLabel } from '@/lib/model';
import { rangeLabel } from '@/lib/fare';
import { kmLabel, place } from '@/lib/places';
import {
  acceptBooking,
  activeDriverRide,
  addDemoRequest,
  incomingRequests,
  statusLabel,
  upcomingBookings,
} from '@/lib/rides';
import { useRides } from '@/lib/rides-store';
import { forecast, hotspot } from '@/lib/demand';
import { demandColor } from './demand';
import { uid } from '@/lib/ids';
import { colors as c, space } from '@/theme';

export function DriverRides() {
  const { rides, update } = useRides();
  const [now] = useState(() => Date.now());
  const active = activeDriverRide(rides);
  const incoming = incomingRequests(rides);
  const bookings = upcomingBookings(rides, { now, priorityFirst: true });
  const zones = forecast(now, 0);
  const hot = hotspot(now);

  return (
    <Screen>
      <Txt variant="title">
        Courses
        <Txt variant="title" style={{ color: c.red }}>
          {' '}
          garanties.
        </Txt>
      </Txt>
      <Txt variant="caption">Les demandes et réservations des passagers viennent à vous.</Txt>

      {active && (
        <Notice
          tone="dark"
          icon="taxi"
          title={`En cours · ${statusLabel[active.status]}`}
          onPress={() => router.push(`/job/${active.id}`)}
        >
          {active.passengerName} · {place(active.pickup).name} → {place(active.destination).name}
        </Notice>
      )}

      <Heading title={`Demandes à proximité (${incoming.length})`} />
      {incoming.length ? (
        incoming.slice(0, 3).map((r) => <IncomingRequest key={r.id} ride={r} />)
      ) : (
        <Card>
          <Txt variant="caption">
            Aucune demande pour le moment. Placez-vous dans une zone de forte demande.
          </Txt>
        </Card>
      )}
      <Button
        variant="secondary"
        title="Démo : recevoir une demande"
        icon="bell"
        onPress={() => void update((s) => addDemoRequest(s, uid()))}
      />

      <Heading title="Réservations à venir" />
      <Card style={{ gap: 0, paddingVertical: space.xs }}>
        {bookings.length ? (
          bookings.map((b, i) => (
            <View key={b.id}>
              {i > 0 && <Divider />}
              <Stack gap={space.sm} style={{ paddingVertical: space.md }}>
                <Row style={{ alignItems: 'flex-start' }}>
                  <Icon
                    name={
                      b.kind === 'airport'
                        ? 'plane'
                        : b.kind === 'hotel'
                          ? 'bed'
                          : b.kind === 'station'
                            ? 'train'
                            : 'calendar'
                    }
                    size={20}
                  />
                  <Stack gap={0} style={{ flex: 1 }}>
                    <Txt variant="headline" style={{ fontSize: 14 }}>
                      {place(b.pickup).name} → {place(b.destination).name}
                    </Txt>
                    <Txt variant="caption" style={{ fontSize: 11 }}>
                      {dateLabel(b.at, { weekday: 'short', day: 'numeric', month: 'short' })} à{' '}
                      {timeLabel(b.at)} · {kmLabel(b.km)} · {rangeLabel(b.estimate)} ·{' '}
                      {b.passengerName}
                    </Txt>
                  </Stack>
                </Row>
                <Row style={{ justifyContent: 'space-between' }}>
                  {b.priority ? (
                    <Badge>Priorité · vous êtes à 1,2 km</Badge>
                  ) : (
                    <Badge neutral>Ouverte</Badge>
                  )}
                  {b.driverAccepted ? (
                    <Txt variant="small" style={{ color: c.green }}>
                      Acceptée ✓
                    </Txt>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void update((s) => acceptBooking(s, b.id))}
                      hitSlop={10}
                    >
                      <Txt variant="headline" style={{ fontSize: 13, color: c.red }}>
                        Accepter
                      </Txt>
                    </Pressable>
                  )}
                </Row>
              </Stack>
            </View>
          ))
        ) : (
          <Txt variant="caption" style={{ paddingVertical: space.md }}>
            Aucune réservation à venir.
          </Txt>
        )}
      </Card>

      <Heading
        title="Où aller maintenant ?"
        action="Carte complète"
        onPress={() => router.push('/demand')}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ouvrir la carte de la demande"
        onPress={() => router.push('/demand')}
      >
        <CityMap
          height={200}
          showLabels={false}
          zones={zones.map((z) => ({
            id: z.id,
            x: z.x,
            y: z.y,
            r: z.r,
            color: demandColor(z.level),
          }))}
        />
      </Pressable>
      <Notice icon="flame" title={hot.message}>
        {hot.zone.reason}
      </Notice>
      <Info>Démo : demandes, réservations et prévisions simulées pour Casablanca.</Info>
    </Screen>
  );
}
