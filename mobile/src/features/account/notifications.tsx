import { router } from 'expo-router';
import { Card, Divider, Heading, Icon, MenuRow, Row, Screen, Stack, Txt } from '@/components/ui';
import { driverSms } from '@/lib/ledger';
import { hotspot } from '@/lib/demand';
import { daysUntilDue, paidThisMonth } from '@/lib/coverage';
import { View } from 'react-native';
import { money } from '@/lib/model';
import { useStore } from '@/lib/store';
import { colors as c, space } from '@/theme';
import { useState } from 'react';
export function Notifications() {
  const { state, mutate } = useStore();
  const latest = state.transactions.find((t) => t.kind === 'payment');
  const sms = driverSms(state, 6);
  const [now] = useState(() => Date.now());
  const hot = hotspot(now);
  return (
    <Screen>
      <Heading
        title="Vos notifications"
        action={state.readNotifications ? 'Tout est lu' : 'Tout lire'}
        onPress={() => {
          void mutate((s) => ({ ...s, readNotifications: true }));
        }}
      />
      {[
        {
          title: hot.message,
          body: `${hot.zone.reason}. Ouvrez la carte de la demande.`,
          path: '/demand',
          icon: 'map' as const,
        },
        ...(paidThisMonth(state)
          ? []
          : [
              {
                title: `Cotisation AMO dans ${daysUntilDue(now)} jours`,
                body: 'Payez-la depuis votre portefeuille en un geste.',
                path: '/coverage',
                icon: 'shield' as const,
              },
            ]),
        {
          title: 'Paiement reçu',
          body: latest
            ? `Le paiement #${latest.id} de ${money(latest.credit)} MAD est crédité au portefeuille démo.`
            : 'Votre premier paiement apparaîtra ici.',
          path: latest ? `/transaction/${latest.id}` : '/(tabs)',
          icon: 'wallet' as const,
        },
        {
          title: 'Votre espace chauffeur est prêt',
          body: 'Retrouvez vos revenus et vos services au même endroit.',
          path: '/(tabs)/profile',
          icon: 'shield' as const,
        },
        {
          title: 'Vos revenus à portée de main',
          body: 'Créez le relevé PDF de votre activité démo du mois.',
          path: '/statements',
          icon: 'file' as const,
        },
      ].map(({ title, body, path, icon }, i) => (
        <Card
          key={title}
          style={{
            borderWidth: 1,
            borderColor: !state.readNotifications && i < 2 ? c.redSoft : 'transparent',
          }}
        >
          <MenuRow
            title={title}
            sub={body}
            icon={icon}
            onPress={() => {
              void mutate((s) => ({ ...s, readNotifications: true })).then(() => router.push(path));
            }}
          />
        </Card>
      ))}
      <Heading title="SMS de paiement" />
      <Card style={{ gap: 0, paddingVertical: space.xs }}>
        {sms.map((m, i) => (
          <View key={m.id}>
            {i > 0 && <Divider />}
            <Row style={{ paddingVertical: space.md, alignItems: 'flex-start' }}>
              <Icon name="sms" size={18} color={c.green} />
              <Stack gap={0} style={{ flex: 1 }}>
                <Txt selectable variant="caption" style={{ color: c.ink }}>
                  {m.body}
                </Txt>
              </Stack>
            </Row>
          </View>
        ))}
      </Card>
      <Txt variant="small">
        SMS simulés : un par paiement numérique (montant + référence de la course).
      </Txt>
    </Screen>
  );
}
