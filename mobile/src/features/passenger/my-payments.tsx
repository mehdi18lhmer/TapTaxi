import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Empty, Icon, Row, Screen, Stack, Txt } from '@/components/ui';
import { dateLabel, methodLabel, money } from '@/lib/model';
import { passengerSummary, passengerTotal } from '@/lib/checkout';
import { sharePdf } from '@/lib/pdf';
import { useStore } from '@/lib/store';
import { colors as c, radius, space } from '@/theme';
import { useRole } from '@/lib/role-store';

/** The passenger's receipts. In the demo the passenger and driver share this device. */
/** `tab`: shown as the passenger "Reçus" tab, with its own title and no back button. */
export function MyPayments({ tab = false }: { tab?: boolean }) {
  const { state, notify } = useStore();
  const { role } = useRole();
  const [sharing, setSharing] = useState(false);
  const summary = passengerSummary(state.transactions);

  return (
    <Screen>
      {tab && <Txt variant="title">Reçus</Txt>}
      <Txt variant="caption">Tous vos reçus démo au même endroit.</Txt>
      <Card dark>
        <Txt variant="caption" style={{ color: c.lightOnDark }}>
          {summary.count} paiements
        </Txt>
        <Txt selectable variant="money" style={{ color: c.surface, fontSize: 38 }}>
          {money(summary.total)}
          <Txt style={{ color: c.lightOnDark }}> MAD payés</Txt>
        </Txt>
        <Row style={{ justifyContent: 'space-between' }}>
          {[
            ['Courses', summary.fares],
            ['Pourboires', summary.tips],
            ['Frais', summary.fees],
          ].map(([label, value]) => (
            <Stack key={label} gap={space.xs}>
              <Txt variant="headline" style={{ color: c.surface }}>
                {money(Number(value))}
              </Txt>
              <Txt variant="small" style={{ color: c.lightOnDark }}>
                {label}
              </Txt>
            </Stack>
          ))}
        </Row>
      </Card>
      <Card style={{ paddingVertical: space.xs, gap: 0 }}>
        {summary.count ? (
          summary.payments.map((t, i) => (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityLabel={`Reçu ${t.id}, ${money(passengerTotal(t))} MAD`}
              onPress={() => router.push(`/receipt/${t.id}`)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                paddingVertical: space.lg,
                borderBottomWidth: i < summary.count - 1 ? 1 : 0,
                borderBottomColor: c.line,
              })}
            >
              <Row>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: radius.pill,
                    backgroundColor: c.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="card" size={20} />
                </View>
                <Stack gap={space.xs} style={{ flex: 1 }}>
                  <Txt variant="headline" style={{ fontSize: 13 }}>
                    Taxi n° 1287
                  </Txt>
                  <Txt variant="caption" style={{ fontSize: 11 }}>
                    {dateLabel(t.at)} · {methodLabel(t.method)}
                  </Txt>
                </Stack>
                <Stack gap={space.xs} style={{ alignItems: 'flex-end' }}>
                  <Txt variant="headline" style={{ fontSize: 14, fontVariant: ['tabular-nums'] }}>
                    {money(passengerTotal(t))} MAD
                  </Txt>
                  <Txt variant="small">Reçu ›</Txt>
                </Stack>
              </Row>
            </Pressable>
          ))
        ) : (
          <Empty
            title="Votre première course vous attend"
            body="Vos reçus apparaîtront ici après un paiement."
          />
        )}
      </Card>
      <Button
        title="Tous mes reçus (PDF)"
        variant="secondary"
        icon="share"
        disabled={!summary.count}
        loading={sharing}
        onPress={() => {
          setSharing(true);
          void sharePdf('Mes paiements', summary.payments, true)
            .catch(() => notify('Impossible de générer le PDF.'))
            .finally(() => setSharing(false));
        }}
      />
      {!tab && (
        <Button
          title={role === 'driver' ? 'Retour à l’espace chauffeur' : 'Retour à l’accueil'}
          variant="ghost"
          onPress={() => router.dismissTo(role === 'driver' ? '/(tabs)' : '/passenger')}
        />
      )}
    </Screen>
  );
}
