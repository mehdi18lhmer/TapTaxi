// Ride history (passenger "Courses" tab): every ride, paid digitally or in cash.
// A split ride shows once, with the passenger's own share.
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Empty, Icon, Info, Row, Screen, Stack, Txt } from '@/components/ui';
import { dateLabel, methodLabel, money, passengerFeeOf, passengerPaid } from '@/lib/model';
import type { Transaction } from '@/lib/model';
import { sharePdf } from '@/lib/pdf';
import { useStore } from '@/lib/store';
import { colors as c, radius, space } from '@/theme';

export const tripsOf = (items: Transaction[]) =>
  items.filter(
    (t) => (t.kind === 'payment' && (!t.split || t.split.part === 1)) || t.kind === 'cash',
  );

export function Trips({ tab = false }: { tab?: boolean }) {
  const { state, notify } = useStore();
  const [sharing, setSharing] = useState(false);
  const trips = tripsOf(state.transactions);
  const total = trips.reduce((n, t) => n + passengerPaid(t), 0);
  const fees = trips.reduce((n, t) => n + passengerFeeOf(t), 0);
  return (
    <Screen>
      {tab && <Txt variant="title">Mes courses</Txt>}
      <Card dark>
        <Txt variant="caption" style={{ color: c.lightOnDark }}>
          {trips.length} courses
        </Txt>
        <Txt selectable variant="money" style={{ color: c.surface, fontSize: 36 }}>
          {money(total)}
          <Txt style={{ color: c.lightOnDark }}> MAD</Txt>
        </Txt>
        <Txt variant="caption" style={{ color: c.lightOnDark }}>
          Dont {money(fees)} MAD de frais TapTaxi · toujours affichés avant de payer
        </Txt>
      </Card>
      <Card style={{ paddingVertical: space.xs, gap: 0 }}>
        {trips.length ? (
          trips.map((t, i) => (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityLabel={`Course ${t.id}, ${money(passengerPaid(t))} MAD`}
              onPress={() => router.push(`/passenger/trip/${t.id}`)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                paddingVertical: space.lg,
                borderBottomWidth: i < trips.length - 1 ? 1 : 0,
                borderBottomColor: c.line,
              })}
            >
              <Row>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.pill,
                    backgroundColor: t.kind === 'cash' ? c.warm : c.redSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={t.kind === 'cash' ? 'cash' : t.split ? 'users' : 'taxi'} size={18} />
                </View>
                <Stack gap={0} style={{ flex: 1 }}>
                  <Txt variant="headline" style={{ fontSize: 13 }}>
                    Taxi n° 1287 · Youssef B.
                  </Txt>
                  <Txt variant="caption" style={{ fontSize: 11 }}>
                    {dateLabel(t.at)} · {methodLabel(t.method)}
                    {t.split ? ` · partagée ×${t.split.of}` : ''}
                  </Txt>
                </Stack>
                <Txt variant="headline" style={{ fontSize: 14 }}>
                  {money(passengerPaid(t))}
                </Txt>
              </Row>
            </Pressable>
          ))
        ) : (
          <Empty title="Aucune course" body="Demandez un taxi ou scannez le QR d’un chauffeur." />
        )}
      </Card>
      {trips.some((t) => t.kind === 'payment') && (
        <Button
          variant="secondary"
          title="Exporter mes reçus (PDF)"
          icon="share"
          loading={sharing}
          onPress={() => {
            setSharing(true);
            void sharePdf(
              'Mes reçus TapTaxi',
              trips.filter((t) => t.kind === 'payment'),
              true,
            )
              .catch(() => notify('Le PDF n’a pas pu être créé.'))
              .finally(() => setSharing(false));
          }}
        />
      )}
      <Info>Un souci ? Ouvrez la course puis « Signaler un problème ».</Info>
    </Screen>
  );
}
