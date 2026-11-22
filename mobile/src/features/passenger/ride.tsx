// Passenger side of a requested ride: searching → driver on the way → on board →
// (wait & return) → arrived, the driver shows the payment QR → pay.
// Demo: the driver's actions are simulated (timers and demo buttons).
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Empty, Info, Notice, Screen, Stack, Success, Txt } from '@/components/ui';
import { CityMap } from '@/components/city-map';
import { DriverCard, RideRoute, WaitTimer } from '@/components/ride-parts';
import { createRequest, money } from '@/lib/model';
import { isPayable } from '@/lib/checkout';
import {
  acceptRide,
  advanceRide,
  cancelRide,
  etaMinutes,
  linkPayment,
  markPaid,
  simulatedMeter,
  statusLabel,
} from '@/lib/rides';
import { useRides } from '@/lib/rides-store';
import { useStore } from '@/lib/store';
import { nearbyTaxis, PASSENGER_POSITION, place } from '@/lib/places';
import { rangeLabel } from '@/lib/fare';
import { uid } from '@/lib/ids';
import { successFeedback } from '@/lib/haptics';
import { colors as c, space } from '@/theme';

/** Demo speed: how long the simulated driver takes for each step. */
const ACCEPT_AFTER = 3500;
const ARRIVE_AFTER = 12_000;

export function PassengerRide() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { rides, update } = useRides();
  const { state, mutate } = useStore();
  const [now, setNow] = useState(() => Date.now());
  const ride = rides.rides.find((r) => r.id === id);
  const request = ride?.paymentId ? state.requests.find((r) => r.id === ride.paymentId) : undefined;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Simulated driver: accepts, then drives to the passenger.
  const status = ride?.status;
  useEffect(() => {
    if (status === 'searching') {
      const t = setTimeout(() => {
        void update((s) => acceptRide(s, id, Date.now(), { simulated: true })).then(
          (ok) => ok && void successFeedback(),
        );
      }, ACCEPT_AFTER);
      return () => clearTimeout(t);
    }
    if (status === 'accepted') {
      const t = setTimeout(() => void update((s) => advanceRide(s, id, 'accepted')), ARRIVE_AFTER);
      return () => clearTimeout(t);
    }
  }, [status, id, update]);

  // Paid (from the payment screen): close the ride.
  useEffect(() => {
    if (ride?.paymentId && request?.status === 'paid' && ride.status !== 'paid')
      void update((s) => markPaid(s, ride.paymentId!));
  }, [ride?.paymentId, ride?.status, request?.status, update]);

  if (!ride)
    return <Empty title="Course introuvable" body="Cette course n’existe plus sur cet appareil." />;

  const to = place(ride.destination);
  const nearest = nearbyTaxis()[0];
  const eta = etaMinutes(ride.driverKm);
  const elapsed = ride.acceptedAt ? now - ride.acceptedAt : 0;
  const etaLeft = Math.max(1, Math.ceil(eta * (1 - elapsed / ARRIVE_AFTER)));
  // The taxi moves towards the passenger on the map while on its way.
  const progress =
    ride.status === 'accepted'
      ? Math.min(1, elapsed / ARRIVE_AFTER)
      : ride.status === 'searching'
        ? 0
        : 1;
  const taxiPos = nearest
    ? {
        x: nearest.x + (PASSENGER_POSITION.x - nearest.x) * progress,
        y: nearest.y + (PASSENGER_POSITION.y - nearest.y) * progress,
      }
    : PASSENGER_POSITION;
  const step = (expected: typeof ride.status) => void update((s) => advanceRide(s, id, expected));

  const openPayment = async () => {
    if (ride.paymentId && isPayable(request, Date.now())) {
      router.push(`/pay/${ride.paymentId}`);
      return;
    }
    // Demo: we create the driver's payment QR on this device.
    const pid = uid();
    const fare = simulatedMeter(ride);
    if (!(await mutate((s) => createRequest(s, fare, pid)))) return;
    if (await update((s) => linkPayment(s, id, pid, fare))) router.push(`/pay/${pid}`);
  };

  const cancel = () =>
    Alert.alert('Annuler la demande ?', 'Le chauffeur sera prévenu.', [
      { text: 'Garder', style: 'cancel' },
      {
        text: 'Annuler la course',
        style: 'destructive',
        onPress: () => void update((s) => cancelRide(s, id)),
      },
    ]);

  return (
    <Screen>
      <Stack gap={space.xs}>
        <Txt variant="small" style={{ letterSpacing: 1 }}>
          {statusLabel[ride.status].toUpperCase()}
        </Txt>
        <Txt variant="heading">
          {ride.status === 'searching'
            ? 'On cherche un taxi près de vous…'
            : ride.status === 'accepted'
              ? `Votre chauffeur arrive dans ${etaLeft} min`
              : ride.status === 'arrived'
                ? 'Votre taxi est là.'
                : ride.status === 'onboard'
                  ? `En route vers ${to.name}`
                  : ride.status === 'waiting'
                    ? 'Le chauffeur vous attend.'
                    : ride.status === 'returning'
                      ? 'Retour en cours'
                      : ride.status === 'ended'
                        ? 'Vous êtes arrivé.'
                        : ride.status === 'paid'
                          ? 'Course payée. Merci !'
                          : 'Course annulée'}
        </Txt>
      </Stack>

      {['searching', 'accepted', 'arrived', 'onboard'].includes(ride.status) && (
        <CityMap
          height={200}
          center={PASSENGER_POSITION}
          radiusKm={ride.status === 'searching' ? 1 : undefined}
          route={ride.status === 'onboard' ? { from: PASSENGER_POSITION, to } : undefined}
          markers={[
            { id: 'me', kind: 'me', ...PASSENGER_POSITION },
            ...(ride.status === 'searching'
              ? nearbyTaxis().map((t) => ({ id: t.id, x: t.x, y: t.y, kind: 'taxi' as const }))
              : [
                  {
                    id: 'taxi',
                    kind: 'taxi' as const,
                    highlight: true,
                    label: 'n° 1287',
                    ...taxiPos,
                  },
                ]),
            { id: 'to', kind: 'destination', x: to.x, y: to.y, label: to.name },
          ]}
        />
      )}

      {ride.status === 'searching' && (
        <Card style={{ alignItems: 'center' }}>
          <ActivityIndicator color={c.red} />
          <Txt variant="caption" style={{ textAlign: 'center' }}>
            Votre demande est envoyée aux taxis TapTaxi libres à moins de 1 km.
          </Txt>
        </Card>
      )}

      {['accepted', 'arrived', 'onboard', 'waiting', 'returning'].includes(ride.status) && (
        <DriverCard eta={ride.status === 'accepted' ? etaLeft : undefined} />
      )}

      {ride.status === 'waiting' && <WaitTimer ride={ride} now={now} />}

      {ride.status === 'ended' && (
        <Card>
          <Txt variant="caption">Le chauffeur affiche le QR de paiement</Txt>
          <Txt variant="headline">Scannez-le pour vérifier et payer</Txt>
          <Txt variant="caption">
            Estimation : {rangeLabel(ride.estimate)}
            {ride.meterFare ? ` · compteur ${money(ride.meterFare)} MAD` : ''}
          </Txt>
          <Button
            title="Scanner le QR du chauffeur"
            icon="qr"
            onPress={() => router.navigate('/scan')}
          />
          <Button
            variant="secondary"
            title="Démo : ouvrir le paiement"
            icon="arrow"
            testID="open-payment"
            onPress={() => void openPayment()}
          />
          <Txt variant="small">
            Cash ? Choisissez « Espèces » sur l’écran de paiement : la course est enregistrée.
          </Txt>
        </Card>
      )}

      {ride.status === 'paid' && (
        <>
          <Success />
          {ride.paymentId && (
            <Button
              title="Voir le reçu"
              icon="file"
              onPress={() => router.push(`/receipt/${ride.paymentId}`)}
            />
          )}
          <Button
            variant="secondary"
            title="Retour à l’accueil"
            onPress={() => router.dismissTo('/passenger')}
          />
        </>
      )}

      {ride.status !== 'paid' && ride.status !== 'cancelled' && <RideRoute ride={ride} passenger />}

      {ride.status === 'accepted' && (
        <Button
          variant="secondary"
          title="Démo : le taxi arrive"
          onPress={() => step('accepted')}
        />
      )}
      {ride.status === 'arrived' && (
        <Button title="Je suis à bord" icon="taxi" onPress={() => step('arrived')} />
      )}
      {ride.status === 'onboard' && (
        <>
          <Notice icon="shield" title="Course suivie">
            Taxi n° 1287 · trajet partagé avec TapTaxi pour votre sécurité.
          </Notice>
          <Button
            variant="secondary"
            title={
              ride.waitReturn
                ? 'Démo : arrivé, le chauffeur attend'
                : 'Démo : arriver à destination'
            }
            onPress={() => step('onboard')}
          />
        </>
      )}
      {ride.status === 'waiting' && (
        <Button title="Je suis de retour, on repart" icon="arrow" onPress={() => step('waiting')} />
      )}
      {ride.status === 'returning' && (
        <Button
          variant="secondary"
          title="Démo : arrivé au point de départ"
          onPress={() => step('returning')}
        />
      )}

      {['searching', 'accepted', 'arrived'].includes(ride.status) && (
        <Button variant="ghost" title="Annuler la demande" onPress={cancel} />
      )}
      {ride.status === 'cancelled' && (
        <Button
          title="Nouvelle demande"
          icon="taxi"
          onPress={() => router.replace('/passenger/request')}
        />
      )}
      <Info>Démo : le chauffeur, le trajet et le compteur sont simulés.</Info>
    </Screen>
  );
}
