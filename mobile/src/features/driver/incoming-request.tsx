// Incoming passenger request (guaranteed rides): pick-up, distance, estimated fare, Accept / Decline.
import { View } from 'react-native';
import { router } from 'expo-router';
import { Badge, Button, Card, Icon, Row, Stack, Txt } from '@/components/ui';
import { money, paymentBreakdown } from '@/lib/model';
import { rangeLabel } from '@/lib/fare';
import { kmLabel, place } from '@/lib/places';
import { acceptRide, declineRide, etaMinutes } from '@/lib/rides';
import type { Ride } from '@/lib/rides';
import { useRides } from '@/lib/rides-store';
import { successFeedback } from '@/lib/haptics';
import { colors as c, space } from '@/theme';

export function IncomingRequest({ ride }: { ride: Ride }) {
  const { update } = useRides();
  const from = place(ride.pickup);
  const to = place(ride.destination);
  const bonus = paymentBreakdown(ride.estimate.likely).driverFee;
  return (
    <Card style={{ borderWidth: 2, borderColor: c.red }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Badge>Nouvelle demande</Badge>
        <Txt variant="small">{ride.origin === 'passenger' ? 'Passager TapTaxi' : 'Démo'}</Txt>
      </Row>
      <Row style={{ alignItems: 'flex-start' }}>
        <Icon name="pin" color="#2F6BFF" />
        <Stack gap={0} style={{ flex: 1 }}>
          <Txt variant="headline">{from.name}</Txt>
          <Txt variant="caption">
            À {kmLabel(ride.driverKm)} de vous · ~{etaMinutes(ride.driverKm)} min ·{' '}
            {ride.passengerName}
          </Txt>
        </Stack>
      </Row>
      <Row style={{ alignItems: 'flex-start' }}>
        <Icon name="arrow" />
        <Stack gap={0} style={{ flex: 1 }}>
          <Txt variant="headline" style={{ fontSize: 14 }}>
            {to.name}
          </Txt>
          <Txt variant="caption">
            {kmLabel(ride.km)}
            {ride.waitReturn ? ' · attente et retour' : ''}
          </Txt>
        </Stack>
      </Row>
      <View style={{ backgroundColor: c.background, borderRadius: 14, padding: space.md, gap: 2 }}>
        <Txt variant="caption">Course estimée</Txt>
        <Txt variant="heading">{rangeLabel(ride.estimate)}</Txt>
        <Txt variant="small" style={{ color: c.green }}>
          Compteur intégral + votre bonus 10 % (~{money(bonus)} MAD) si payé avec TapTaxi
        </Txt>
      </View>
      <Row style={{ gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button
            variant="secondary"
            title="Refuser"
            onPress={() => void update((s) => declineRide(s, ride.id))}
          />
        </View>
        <View style={{ flex: 1.4 }}>
          <Button
            title="Accepter"
            icon="check"
            testID="accept-request"
            onPress={() =>
              void update((s) => acceptRide(s, ride.id)).then((ok) => {
                if (!ok) return;
                void successFeedback();
                router.push(`/job/${ride.id}`);
              })
            }
          />
        </View>
      </Row>
    </Card>
  );
}
