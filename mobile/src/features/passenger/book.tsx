// Book a taxi in advance for the airport, a station or a hotel (date and time).
import { useMemo, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, CheckRow, Detail, Heading, Info, Screen, Txt } from '@/components/ui';
import { PlacePicker } from '@/components/place-picker';
import { dateLabel, money, serviceFee } from '@/lib/model';
import { rangeLabel } from '@/lib/fare';
import { BOOKING_DESTINATIONS, kmLabel, PLACES } from '@/lib/places';
import { bookingError, createBooking, rideEstimate } from '@/lib/rides';
import { useRides } from '@/lib/rides-store';
import { usePassenger } from '@/lib/passenger-store';
import { uid } from '@/lib/ids';
import { colors as c, fonts, radius, space } from '@/theme';

const DAY = 86_400_000;

function Pills<T extends string | number>({
  items,
  value,
  onChange,
}: {
  items: { value: T; label: string; disabled?: boolean }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: space.sm }}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <Pressable
            key={String(item.value)}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: item.disabled }}
            disabled={item.disabled}
            onPress={() => onChange(item.value)}
            style={({ pressed }) => ({
              paddingHorizontal: space.lg,
              paddingVertical: space.md,
              borderRadius: radius.pill,
              backgroundColor: selected ? c.ink : c.surface,
              opacity: item.disabled ? 0.35 : pressed ? 0.65 : 1,
            })}
          >
            <Txt
              variant="caption"
              style={{ color: selected ? c.surface : c.ink, fontFamily: fonts.medium }}
            >
              {item.label}
            </Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function BookTaxi() {
  const { update } = useRides();
  const { passenger } = usePassenger();
  const [now] = useState(() => Date.now());
  const [pickup, setPickup] = useState('maarif');
  const [destination, setDestination] = useState<string | null>('airport');
  const [day, setDay] = useState(1);
  const [time, setTime] = useState(6 * 60 + 30);
  const [waitReturn, setWaitReturn] = useState(false);
  const [saving, setSaving] = useState(false);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        value: i,
        label:
          i === 0
            ? 'Aujourd’hui'
            : i === 1
              ? 'Demain'
              : dateLabel(now + i * DAY, { weekday: 'short', day: 'numeric' }),
      })),
    [now],
  );
  const at = useMemo(() => {
    const d = new Date(now + day * DAY);
    d.setHours(Math.floor(time / 60), time % 60, 0, 0);
    return d.getTime();
  }, [now, day, time]);
  const times = Array.from({ length: 38 }, (_, i) => 5 * 60 + i * 30).map((m) => {
    const d = new Date(now + day * DAY);
    d.setHours(Math.floor(m / 60), m % 60, 0, 0);
    return {
      value: m,
      label: `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`,
      disabled: d.getTime() < now + 30 * 60_000,
    };
  });
  const input = destination ? { pickup, destination, at, waitReturn } : null;
  const problem = input ? bookingError(input, now) : 'Choisissez une destination.';
  const estimate = input && destination !== pickup ? rideEstimate(input, at) : null;

  const confirm = async () => {
    if (!input) return;
    setSaving(true);
    const id = uid();
    const ok = await update((s) =>
      createBooking(s, input, passenger.account?.firstName ?? 'Passager', id),
    );
    setSaving(false);
    if (ok) router.replace(`/passenger/booking/${id}`);
  };

  return (
    <Screen>
      <Txt variant="title">
        Réservez votre taxi
        <Txt variant="title" style={{ color: c.red }}>
          .
        </Txt>
      </Txt>
      <Txt variant="caption">Aéroport, gare ou hôtel : à la date et à l’heure de votre choix.</Txt>

      <Heading title="Destination" />
      <PlacePicker
        places={BOOKING_DESTINATIONS}
        value={destination}
        onChange={setDestination}
        initial={6}
        exclude={pickup}
      />

      <Heading title="Prise en charge" />
      <PlacePicker
        places={PLACES}
        value={pickup}
        onChange={setPickup}
        initial={3}
        exclude={destination ?? undefined}
      />

      <Heading title="Date" />
      <Pills items={days} value={day} onChange={setDay} />
      <Heading title="Heure" />
      <Pills items={times} value={time} onChange={setTime} />

      <Card>
        <CheckRow
          label="Attente et retour"
          sub="Le chauffeur attend et vous ramène (attente au compteur)."
          value={waitReturn}
          onChange={setWaitReturn}
        />
      </Card>

      {estimate && (
        <Card>
          <Detail
            label="Le"
            value={dateLabel(at, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}
          />
          <Detail label="Distance" value={kmLabel(estimate.km)} />
          <Detail label="Estimation compteur" value={rangeLabel(estimate.estimate)} strong />
          <Detail
            label="Frais TapTaxi"
            value={`${money(serviceFee(estimate.estimate.likely, at))} MAD`}
          />
          <Txt variant="caption" style={{ fontSize: 11 }}>
            Les réservations pour l’aéroport et les hôtels sont proposées en priorité aux chauffeurs
            les plus proches. Rappel 1 h avant la prise en charge.
          </Txt>
        </Card>
      )}
      {problem && destination && <Txt style={{ color: c.red }}>{problem}</Txt>}
      <Button
        title="Confirmer la réservation"
        icon="calendar"
        disabled={!!problem}
        loading={saving}
        onPress={() => void confirm()}
      />
      <Info>
        Démo : la réservation reste sur cet appareil. Paiement à l’arrivée, comme une course.
      </Info>
    </Screen>
  );
}
