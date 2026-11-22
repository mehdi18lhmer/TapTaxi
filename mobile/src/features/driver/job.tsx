// Driver side of a ride: on the way → arrived → passenger on board → (wait & return) →
// end the ride → collect: the meter fare opens the payment QR.
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  Detail,
  Empty,
  Info,
  Notice,
  Screen,
  Stack,
  Txt,
} from '@/components/ui';
import { CityMap } from '@/components/city-map';
import { RideRoute, WaitTimer } from '@/components/ride-parts';
import { IncomingRequest } from './incoming-request';
import { money } from '@/lib/model';
import { isPayable } from '@/lib/checkout';
import { advanceRide, cancelRide, etaMinutes, simulatedMeter, statusLabel } from '@/lib/rides';
import { useRides } from '@/lib/rides-store';
import { useStore } from '@/lib/store';
import { place } from '@/lib/places';
import { space } from '@/theme';

export function DriverJob() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { rides, update } = useRides();
  const { state } = useStore();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ride = rides.rides.find((r) => r.id === id);
  if (!ride)
    return <Empty title="Course introuvable" body="Elle n’existe plus sur cet appareil." />;
  const from = place(ride.pickup);
  const to = place(ride.destination);
  const request = ride.paymentId ? state.requests.find((r) => r.id === ride.paymentId) : undefined;
  const step = () => void update((s) => advanceRide(s, id, ride.status));

  if (ride.status === 'searching')
    return (
      <Screen>
        <IncomingRequest ride={ride} />
      </Screen>
    );

  const action: Record<string, string> = {
    accepted: 'Je suis arrivé',
    arrived: 'Passager à bord',
    onboard: ride.waitReturn ? 'Arrivé · j’attends le passager' : 'Terminer la course',
    waiting: 'Fin de l’attente · on repart',
    returning: 'Terminer la course',
  };

  return (
    <Screen>
      <Stack gap={space.xs}>
        <Badge neutral={ride.status !== 'ended'}>{statusLabel[ride.status]}</Badge>
        <Txt variant="heading">
          {ride.status === 'accepted'
            ? `Allez chercher ${ride.passengerName} · ~${etaMinutes(ride.driverKm)} min`
            : ride.status === 'arrived'
              ? `${ride.passengerName} arrive`
              : ride.status === 'onboard'
                ? `Vers ${to.name}`
                : ride.status === 'waiting'
                  ? 'Vous attendez le passager'
                  : ride.status === 'returning'
                    ? `Retour vers ${from.name}`
                    : ride.status === 'ended'
                      ? 'Course terminée. Encaissez.'
                      : ride.status === 'paid'
                        ? 'Course payée'
                        : 'Course annulée'}
        </Txt>
      </Stack>
      {['accepted', 'arrived', 'onboard', 'returning'].includes(ride.status) && (
        <CityMap
          height={190}
          route={{ from, to }}
          markers={[
            { id: 'from', kind: 'pickup', x: from.x, y: from.y, label: from.name },
            { id: 'to', kind: 'destination', x: to.x, y: to.y, label: to.name },
          ]}
        />
      )}
      {ride.status === 'waiting' && <WaitTimer ride={ride} now={now} />}
      <RideRoute ride={ride} />

      {action[ride.status] && <Button title={action[ride.status]} icon="arrow" onPress={step} />}

      {ride.status === 'ended' &&
        (ride.paymentId && isPayable(request, now) ? (
          <Button
            title="Afficher le QR de paiement"
            icon="qr"
            onPress={() => router.push(`/qr/${ride.paymentId}`)}
          />
        ) : ride.paymentId && request?.status === 'paid' ? (
          <Button
            title="Voir le paiement"
            icon="check"
            onPress={() => router.push(`/received/${ride.paymentId}`)}
          />
        ) : (
          <>
            <Card>
              <Detail
                label="Compteur (démo)"
                value={`${money(simulatedMeter(ride, now))} MAD`}
                strong
              />
              <Txt variant="caption">
                Corrigez si besoin le montant exact du compteur à l’étape suivante.
              </Txt>
            </Card>
            <Button
              title="Encaisser cette course"
              icon="qr"
              testID="collect-ride"
              onPress={() =>
                router.push({
                  pathname: '/amount',
                  params: { ride: ride.id, fare: String(simulatedMeter(ride, now)) },
                })
              }
            />
          </>
        ))}
      {ride.status === 'paid' && (
        <Notice tone="success" icon="check" title="Paiement reçu">
          SMS envoyé et portefeuille crédité. Consultez vos gains du jour.
        </Notice>
      )}
      {ride.status === 'paid' && (
        <Button title="Mes gains" icon="chart" onPress={() => router.push('/earnings')} />
      )}
      {['accepted', 'arrived'].includes(ride.status) && (
        <Button
          variant="ghost"
          title="Annuler la course"
          onPress={() =>
            Alert.alert('Annuler cette course ?', 'Le passager sera prévenu.', [
              { text: 'Garder', style: 'cancel' },
              {
                text: 'Annuler',
                style: 'destructive',
                onPress: () => void update((s) => cancelRide(s, id)),
              },
            ])
          }
        />
      )}
      <Info>Démo : le passager et le trajet sont simulés.</Info>
    </Screen>
  );
}
