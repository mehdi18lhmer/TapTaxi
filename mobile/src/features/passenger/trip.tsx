// Ride details: taxi number, driver, amount, then "Signaler un problème" (AI support agent).
import { router, useLocalSearchParams } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  Detail,
  Divider,
  Empty,
  Info,
  Screen,
  Stack,
  Txt,
} from '@/components/ui';
import { DriverCard } from '@/components/ride-parts';
import { dateLabel, methodLabel, money, passengerFeeOf, passengerPaid } from '@/lib/model';
import { rangeLabel } from '@/lib/fare';
import { place } from '@/lib/places';
import { rideForPayment } from '@/lib/rides';
import { useRides } from '@/lib/rides-store';
import { useStore } from '@/lib/store';
import { space } from '@/theme';

export function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useStore();
  const { rides } = useRides();
  const t = state.transactions.find(
    (x) => x.id === id && (x.kind === 'payment' || x.kind === 'cash'),
  );
  if (!t) return <Empty title="Course introuvable" body="Elle n’existe plus sur cet appareil." />;
  const ride = rideForPayment(rides, t.split?.ride ?? t.id);
  return (
    <Screen>
      <Stack gap={space.xs}>
        <Txt variant="caption">
          {dateLabel(t.at, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Txt>
        <Txt variant="heading">{money(passengerPaid(t))} MAD</Txt>
        <Badge neutral={t.kind === 'cash'}>
          {t.kind === 'cash' ? 'Payée en espèces' : `Payée · ${methodLabel(t.method)}`}
        </Badge>
      </Stack>
      <DriverCard />
      {ride && (
        <Card>
          <Detail label="Départ" value={place(ride.pickup).name} />
          <Detail label="Destination" value={place(ride.destination).name} />
          <Detail label="Estimation" value={rangeLabel(ride.estimate)} />
          {ride.waitReturn && <Detail label="Attente et retour" value="Oui" />}
        </Card>
      )}
      <Card>
        <Detail
          label={t.split ? 'Ma part du compteur' : 'Course (compteur)'}
          value={`${money(t.fare)} MAD`}
        />
        {t.kind === 'payment' && (
          <Detail label="Frais TapTaxi" value={`${money(passengerFeeOf(t))} MAD`} />
        )}
        {t.tip > 0 && <Detail label="Pourboire" value={`${money(t.tip)} MAD`} />}
        <Divider />
        <Detail label="Total" value={`${money(passengerPaid(t))} MAD`} strong />
        <Detail label="Référence" value={`TT-${t.split?.ride ?? t.id}`} />
        {t.split && <Detail label="Note partagée" value={`${t.split.of} personnes`} />}
      </Card>
      {t.kind === 'payment' && (
        <Button
          title="Voir le reçu"
          icon="file"
          variant="secondary"
          onPress={() => router.push(`/receipt/${t.id}`)}
        />
      )}
      <Button
        title="Signaler un problème"
        icon="chat"
        onPress={() => router.push({ pathname: '/passenger/support-chat', params: { ride: t.id } })}
      />
      <Info>
        L’assistant support répond en français, arabe, darija et anglais. Une personne prend le
        relais pour les remboursements, litiges et la sécurité.
      </Info>
    </Screen>
  );
}
