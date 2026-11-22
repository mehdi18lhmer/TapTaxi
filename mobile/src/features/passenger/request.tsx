// Request a taxi: not a booking. The passenger sends a request and a free TapTaxi taxi
// within 1 km accepts it. The estimated fare is shown before sending.
import { useState } from 'react';
import { router } from 'expo-router';
import {
  Button,
  Card,
  CheckRow,
  Detail,
  Divider,
  Heading,
  Icon,
  Info,
  Row,
  Screen,
  Stack,
  Txt,
} from '@/components/ui';
import { CityMap } from '@/components/city-map';
import { PlacePicker } from '@/components/place-picker';
import { money, serviceFee } from '@/lib/model';
import { rangeLabel } from '@/lib/fare';
import {
  kmLabel,
  nearbyTaxis,
  PASSENGER_POSITION,
  PLACES,
  place,
  REQUEST_RADIUS_KM,
} from '@/lib/places';
import { requestRide, rideEstimate } from '@/lib/rides';
import { useRides } from '@/lib/rides-store';
import { usePassenger } from '@/lib/passenger-store';
import { uid } from '@/lib/ids';
import { colors as c } from '@/theme';

const PICKUP = 'maarif';

export function RequestTaxi() {
  const { update } = useRides();
  const { passenger } = usePassenger();
  const [destination, setDestination] = useState<string | null>(null);
  const [waitReturn, setWaitReturn] = useState(false);
  const [sending, setSending] = useState(false);
  const taxis = nearbyTaxis();
  const estimate = destination ? rideEstimate({ pickup: PICKUP, destination, waitReturn }) : null;
  const to = destination ? place(destination) : null;

  const send = async () => {
    if (!destination) return;
    setSending(true);
    const id = uid();
    const ok = await update((s) =>
      requestRide(
        s,
        { pickup: PICKUP, destination, waitReturn },
        passenger.account?.firstName ?? 'Passager',
        id,
      ),
    );
    setSending(false);
    if (ok) router.replace(`/passenger/ride/${id}`);
  };

  return (
    <Screen>
      <CityMap
        height={230}
        center={PASSENGER_POSITION}
        radiusKm={REQUEST_RADIUS_KM}
        route={to ? { from: PASSENGER_POSITION, to } : undefined}
        markers={[
          ...taxis.map((t) => ({ id: t.id, x: t.x, y: t.y, kind: 'taxi' as const })),
          { id: 'me', kind: 'me' as const, ...PASSENGER_POSITION },
          ...(to
            ? [{ id: 'to', kind: 'destination' as const, x: to.x, y: to.y, label: to.name }]
            : []),
        ]}
      />
      <Card>
        <Row>
          <Icon name="pin" color="#2F6BFF" size={20} />
          <Stack gap={0} style={{ flex: 1 }}>
            <Txt variant="caption">Départ · votre position</Txt>
            <Txt variant="headline">Maârif, Bd Zerktouni</Txt>
          </Stack>
        </Row>
        <Divider />
        <Row>
          <Icon name="taxi" color={c.red} size={20} />
          <Txt style={{ flex: 1 }}>
            {taxis.length} taxis libres à moins de {REQUEST_RADIUS_KM} km · le plus proche à{' '}
            {kmLabel(taxis[0]?.km ?? 0.3)}
          </Txt>
        </Row>
      </Card>

      <Heading title="Où allez-vous ?" />
      <PlacePicker places={PLACES} value={destination} onChange={setDestination} exclude={PICKUP} />

      <Card>
        <CheckRow
          label="Attente et retour"
          sub="Le chauffeur vous attend à destination et vous ramène. L’attente reste au compteur."
          value={waitReturn}
          onChange={setWaitReturn}
        />
      </Card>

      {estimate && (
        <Card>
          <Txt variant="caption">Prix estimé au compteur</Txt>
          <Txt variant="money" style={{ fontSize: 34 }}>
            {rangeLabel(estimate.estimate)}
          </Txt>
          <Detail
            label="Distance"
            value={`${kmLabel(estimate.km)}${waitReturn ? ' · aller-retour' : ''}`}
          />
          <Detail
            label="Frais TapTaxi (affichés avant de payer)"
            value={`${money(serviceFee(estimate.estimate.likely))} MAD`}
          />
          <Txt variant="caption" style={{ fontSize: 11 }}>
            Vous paierez le compteur officiel du taxi. L’estimation vous permet de vérifier le
            montant avant de payer.
          </Txt>
        </Card>
      )}

      <Button
        title={destination ? 'Demander un taxi' : 'Choisissez une destination'}
        icon="taxi"
        disabled={!destination}
        loading={sending}
        testID="send-request"
        onPress={() => void send()}
      />
      <Info>
        Pas une réservation : le premier taxi TapTaxi libre à moins de 1 km accepte votre demande.
      </Info>
    </Screen>
  );
}
