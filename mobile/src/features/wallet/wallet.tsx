import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Heading, Icon, Info, Row, Screen, Stack, Txt } from '@/components/ui';
import { Transactions } from '@/components/transactions';
import { balance, methodLabel, money } from '@/lib/model';
import { useStore } from '@/lib/store';
import { colors as c, radius, space } from '@/theme';
import { todaySummary } from '@/lib/ledger';
export function Wallet() {
  const { state } = useStore();
  const today = todaySummary(state);
  return (
    <Screen>
      <Stack gap={space.xs}>
        <Txt variant="title">
          Votre argent.
          <Txt variant="title" style={{ color: c.red }}>
            {' '}
            Votre liberté.
          </Txt>
        </Txt>
        <Txt variant="caption">Disponible à tout moment, à votre rythme.</Txt>
      </Stack>
      <Card dark style={{ padding: space.xxl, gap: space.xxl }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="headline" style={{ color: c.surface }}>
            T · TapTaxi Wallet
          </Txt>
          <Txt variant="small" style={{ color: c.lightOnDark }}>
            TAXI N° 1287
          </Txt>
        </Row>
        <Stack gap={space.sm}>
          <Txt variant="caption" style={{ color: c.lightOnDark }}>
            Solde disponible
          </Txt>
          <Txt selectable variant="money" style={{ color: c.surface, fontSize: 43 }}>
            {money(balance(state))}
            <Txt style={{ color: c.lightOnDark }}> MAD</Txt>
          </Txt>
        </Stack>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="small" style={{ color: c.lightOnDark }}>
            YOUSSEF BENALI
          </Txt>
          <Txt variant="small" style={{ color: c.lightOnDark }}>
            +{money(today.earned)} aujourd’hui
          </Txt>
        </Row>
      </Card>
      <Txt variant="caption">{methodLabel(state.payout)} · retrait lié •••• 2208</Txt>
      <Card>
        <Txt variant="caption">Inclus aujourd’hui</Txt>
        <Row>
          <Stack style={{ flex: 1 }} gap={space.xs}>
            <Txt variant="caption">Pourboires</Txt>
            <Txt variant="heading" style={{ color: c.green }}>
              +{money(today.tips)}
            </Txt>
          </Stack>
          <Stack style={{ flex: 1 }} gap={space.xs}>
            <Txt variant="caption">Part des frais</Txt>
            <Txt variant="heading" style={{ color: c.green }}>
              +{money(today.feeShare)}
            </Txt>
          </Stack>
        </Row>
      </Card>
      <Row style={{ justifyContent: 'space-between', gap: space.xs }}>
        {(
          [
            { title: 'Retirer', icon: 'withdraw', path: '/withdraw' },
            { title: 'Propriétaire', icon: 'person', path: '/owner' },
            { title: 'Services', icon: 'sparkles', path: '/services' },
            { title: 'Historique', icon: 'history', path: '/history' },
          ] as const
        ).map(({ title, icon, path }, i) => (
          <Pressable
            key={title}
            accessibilityRole="button"
            accessibilityLabel={title}
            onPress={() => router.push(path)}
            style={({ pressed }) => ({
              alignItems: 'center',
              gap: space.sm,
              opacity: pressed ? 0.6 : 1,
              flex: 1,
            })}
          >
            <View
              style={{
                backgroundColor: i === 0 ? c.red : c.surface,
                width: 48,
                height: 48,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={icon} color={i === 0 ? c.surface : c.ink} />
            </View>
            <Txt variant="small" style={{ fontSize: 9, color: c.muted }}>
              {title}
            </Txt>
          </Pressable>
        ))}
      </Row>
      <Card style={{ paddingBottom: space.sm }}>
        <Heading title="Activité" action="Tout voir" onPress={() => router.push('/history')} />
        <Transactions items={state.transactions.slice(0, 5)} dates />
      </Card>
      <Info>Portefeuille fictif · aucun transfert réel.</Info>
    </Screen>
  );
}
