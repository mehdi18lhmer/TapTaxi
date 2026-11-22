import { useState } from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, Chips, Info, Row, Screen, Stack, Txt } from '@/components/ui';
import { dateLabel, money } from '@/lib/model';
import { useStore } from '@/lib/store';
import { sharePdf } from '@/lib/pdf';
import { colors as c, radius, space } from '@/theme';
import { monthlyStatement, monthStart } from '@/lib/ledger';
export function Statements() {
  const { state, notify } = useStore();
  const [offset, setOffset] = useState(0);
  const [pending, setPending] = useState(false);
  const {
    month,
    payments: items,
    total,
    activeDays,
    averagePerDay,
    weeks,
  } = monthlyStatement(state, offset);
  return (
    <Screen>
      <Txt variant="title">
        Vos revenus,
        <Txt variant="title" style={{ color: c.red }}>
          {' '}
          noir sur blanc.
        </Txt>
      </Txt>
      <Txt variant="caption">Votre historique, mois après mois.</Txt>
      <Chips
        value={String(offset)}
        onChange={(v) => setOffset(Number(v))}
        items={[-2, -1, 0].map((n) => ({
          value: String(n),
          label: dateLabel(monthStart(n), { month: 'short' }),
        }))}
      />
      <Card>
        <Txt variant="headline" style={{ textTransform: 'capitalize' }}>
          {month}
        </Txt>
        <Txt variant="caption">Revenu total</Txt>
        <Txt selectable variant="money" style={{ fontSize: 42 }}>
          {money(total)}
          <Txt> MAD</Txt>
        </Txt>
        <Badge neutral>Données de démonstration</Badge>
        <View
          style={{
            height: 140,
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: space.xl,
            paddingVertical: space.sm,
          }}
        >
          {weeks.map((sum, i) => {
            return (
              <Stack key={i} gap={space.sm} style={{ flex: 1, alignItems: 'center' }}>
                <View
                  style={{
                    backgroundColor: i % 2 ? c.red : c.redSoft,
                    height: Math.max(8, total ? (sum / total) * 100 : 8),
                    width: '100%',
                    borderRadius: radius.sm,
                  }}
                />
                <Txt variant="small">Sem. {i + 1}</Txt>
              </Stack>
            );
          })}
        </View>
        <Row style={{ justifyContent: 'space-between' }}>
          <Stack gap={space.xs}>
            <Txt variant="heading">{items.length}</Txt>
            <Txt variant="small">Paiements</Txt>
          </Stack>
          <Stack gap={space.xs}>
            <Txt variant="heading">{activeDays}</Txt>
            <Txt variant="small">Jours actifs</Txt>
          </Stack>
          <Stack gap={space.xs}>
            <Txt variant="heading">{money(averagePerDay)}</Txt>
            <Txt variant="small">Moy. / jour</Txt>
          </Stack>
        </Row>
      </Card>
      <Button
        title="Partager le relevé PDF"
        icon="share"
        disabled={!items.length}
        loading={pending}
        onPress={() => {
          setPending(true);
          void sharePdf(`Relevé — ${month}`, items)
            .catch(() => notify('Le PDF n’a pas pu être créé. Réessayez.'))
            .finally(() => setPending(false));
        }}
      />
      <Info>Les relevés de cette démo ne constituent pas une preuve bancaire vérifiée.</Info>
    </Screen>
  );
}
