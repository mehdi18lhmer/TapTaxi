// Booking confirmation and details, with the reminder before pick-up.
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  Detail,
  Divider,
  Empty,
  Info,
  Notice,
  Screen,
  Stack,
  Success,
  Txt,
} from '@/components/ui';
import { dateLabel, timeLabel } from '@/lib/model';
import { rangeLabel } from '@/lib/fare';
import { kmLabel, place } from '@/lib/places';
import { cancelBooking, DEMO_DRIVER, REMINDER_BEFORE } from '@/lib/rides';
import { useRides } from '@/lib/rides-store';
import { space } from '@/theme';

export function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { rides, update } = useRides();
  const b = rides.bookings.find((x) => x.id === id);
  if (!b)
    return <Empty title="Réservation introuvable" body="Elle n’existe plus sur cet appareil." />;
  const cancelled = b.status === 'cancelled';
  return (
    <Screen>
      <Stack style={{ alignItems: 'center' }} gap={space.sm}>
        {!cancelled && <Success />}
        <Txt variant="heading">{cancelled ? 'Réservation annulée' : 'Réservation confirmée'}</Txt>
        <Txt variant="caption">Référence BK-{b.id}</Txt>
      </Stack>
      <Card>
        <Detail
          label="Prise en charge"
          value={dateLabel(b.at, { weekday: 'long', day: 'numeric', month: 'long' })}
        />
        <Detail label="Heure" value={timeLabel(b.at)} strong />
        <Divider />
        <Detail label="Départ" value={place(b.pickup).name} />
        <Detail label="Destination" value={place(b.destination).name} />
        <Detail label="Distance" value={kmLabel(b.km)} />
        <Detail label="Attente et retour" value={b.waitReturn ? 'Oui' : 'Non'} />
        <Detail label="Estimation compteur" value={rangeLabel(b.estimate)} />
        {b.priority && <Badge>Priorité aux chauffeurs proches</Badge>}
      </Card>
      {!cancelled && (
        <>
          <Notice icon="bell" title={`Rappel ${REMINDER_BEFORE / 60_000} min avant`}>
            Vous recevrez un rappel avec le numéro du taxi et le nom du chauffeur.
          </Notice>
          <Card>
            <Txt variant="caption">Chauffeur</Txt>
            <Txt variant="headline">
              {b.driverAccepted
                ? `${DEMO_DRIVER.name} · taxi n° ${DEMO_DRIVER.taxi}`
                : 'Attribué avant la prise en charge'}
            </Txt>
          </Card>
          <Button title="Retour à l’accueil" onPress={() => router.dismissTo('/passenger')} />
          <Button
            variant="ghost"
            title="Annuler la réservation"
            onPress={() =>
              Alert.alert('Annuler cette réservation ?', 'Aucun frais dans cette démo.', [
                { text: 'Garder', style: 'cancel' },
                {
                  text: 'Annuler',
                  style: 'destructive',
                  onPress: () => void update((s) => cancelBooking(s, b.id)),
                },
              ])
            }
          />
        </>
      )}
      <Info>Démo : aucune notification réelle n’est programmée.</Info>
    </Screen>
  );
}
