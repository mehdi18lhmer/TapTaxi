// Pieces shared by the passenger's ride screen and the driver's ride screen.
import { View } from 'react-native';
import { Avatar, Badge, Card, Detail, Divider, Icon, Row, Stack, Txt } from '@/components/ui';
import { rangeLabel } from '@/lib/fare';
import { kmLabel, place } from '@/lib/places';
import { DEMO_DRIVER, waitingMinutes } from '@/lib/rides';
import type { Ride } from '@/lib/rides';
import { colors as c, radius, space } from '@/theme';

export function DriverCard({ eta }: { eta?: number }) {
  return (
    <Card>
      <Row>
        <Avatar />
        <Stack gap={0} style={{ flex: 1 }}>
          <Txt variant="headline">{DEMO_DRIVER.name}</Txt>
          <Txt variant="caption">
            Petit taxi n° {DEMO_DRIVER.taxi} · ★ {DEMO_DRIVER.rating}
          </Txt>
        </Stack>
        {eta !== undefined && (
          <Stack gap={0} style={{ alignItems: 'flex-end' }}>
            <Txt variant="heading" style={{ color: c.red }}>
              {eta} min
            </Txt>
            <Txt variant="small">arrivée</Txt>
          </Stack>
        )}
      </Row>
      <View
        style={{
          borderWidth: 1.5,
          borderColor: c.line,
          borderRadius: radius.sm,
          paddingVertical: space.xs,
          alignSelf: 'center',
          paddingHorizontal: space.lg,
        }}
      >
        <Txt selectable variant="headline">
          {DEMO_DRIVER.plate}
        </Txt>
      </View>
      <Badge>Taxi agréé · chauffeur vérifié</Badge>
    </Card>
  );
}

export function RideRoute({ ride, passenger = false }: { ride: Ride; passenger?: boolean }) {
  const from = place(ride.pickup);
  const to = place(ride.destination);
  return (
    <Card>
      <Row style={{ alignItems: 'flex-start' }}>
        <Stack gap={0} style={{ alignItems: 'center', paddingTop: 4 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#2F6BFF' }} />
          <View style={{ width: 2, height: 30, backgroundColor: c.line }} />
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c.ink }} />
        </Stack>
        <Stack gap={space.md} style={{ flex: 1 }}>
          <Stack gap={0}>
            <Txt variant="headline" style={{ fontSize: 14 }}>
              {from.name}
            </Txt>
            <Txt variant="caption" style={{ fontSize: 11 }}>
              {from.area}
              {!passenger ? ` · ${ride.passengerName}` : ''}
            </Txt>
          </Stack>
          <Stack gap={0}>
            <Txt variant="headline" style={{ fontSize: 14 }}>
              {to.name}
            </Txt>
            <Txt variant="caption" style={{ fontSize: 11 }}>
              {to.area}
            </Txt>
          </Stack>
        </Stack>
      </Row>
      <Divider />
      <Detail label="Estimation compteur" value={rangeLabel(ride.estimate)} />
      <Detail
        label="Distance"
        value={`${kmLabel(ride.km)}${ride.waitReturn ? ' · attente et retour' : ''}`}
      />
    </Card>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Live waiting time at the destination (wait & return). */
export function WaitTimer({ ride, now }: { ride: Ride; now: number }) {
  const seconds = ride.waitStartedAt
    ? Math.max(0, Math.floor(((ride.waitEndedAt ?? now) - ride.waitStartedAt) / 1000))
    : 0;
  return (
    <Card dark style={{ alignItems: 'center' }}>
      <Row>
        <Icon name="clock" color={c.red} />
        <Txt variant="caption" style={{ color: c.lightOnDark }}>
          Temps d’attente
        </Txt>
      </Row>
      <Txt selectable variant="money" style={{ color: c.surface }}>
        {pad(Math.floor(seconds / 60))}:{pad(seconds % 60)}
      </Txt>
      <Txt variant="caption" style={{ color: c.lightOnDark, textAlign: 'center' }}>
        L’attente reste au compteur ({waitingMinutes(ride, now)} min). 15 min sont incluses dans
        l’estimation.
      </Txt>
    </Card>
  );
}
