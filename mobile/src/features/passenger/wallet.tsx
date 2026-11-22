// Passenger TapTaxi wallet: balance, top-ups (pending agent codes), gifts, ride payments.
import { Alert, View } from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Card,
  Divider,
  Heading,
  Icon,
  Info,
  Notice,
  Row,
  Screen,
  Shortcut,
  Stack,
  Txt,
} from '@/components/ui';
import type { IconName } from '@/components/ui';
import { dateLabel, money, timeLabel } from '@/lib/model';
import { usePassenger } from '@/lib/passenger-store';
import { confirmAgentTopUp, pendingTopups, walletBalance } from '@/lib/passenger-wallet';
import type { WalletEntryKind } from '@/lib/passenger-wallet';
import { colors as c, radius, space } from '@/theme';

const icons: Record<WalletEntryKind, IconName> = {
  topup: 'plus',
  ride: 'taxi',
  split: 'users',
  'gift-sent': 'gift',
  'gift-received': 'gift',
};

export function PassengerWallet() {
  const { passenger, update } = usePassenger();
  const pending = pendingTopups(passenger);
  return (
    <Screen>
      <Card dark style={{ gap: space.md }}>
        <Txt variant="caption" style={{ color: c.lightOnDark }}>
          Solde TapTaxi disponible
        </Txt>
        <Txt selectable variant="money" style={{ color: c.surface }}>
          {money(walletBalance(passenger))}
          <Txt style={{ color: c.lightOnDark }}> MAD</Txt>
        </Txt>
        <Txt variant="caption" style={{ color: c.lightOnDark }}>
          Payez vos courses, offrez une course ou partagez une note.
        </Txt>
      </Card>
      <Row style={{ gap: space.xs }}>
        <Shortcut
          icon="plus"
          label="Recharger"
          primary
          onPress={() => router.push('/passenger/topup')}
        />
        <Shortcut
          icon="gift"
          label="Offrir une course"
          onPress={() => router.push('/passenger/gift')}
        />
        <Shortcut
          icon="taxi"
          label="Demander un taxi"
          onPress={() => router.push('/passenger/request')}
        />
      </Row>

      {pending.map((e) => (
        <Card key={e.id}>
          <Notice icon="cash" title={`Recharge en attente · ${money(e.amount)} MAD`}>
            Présentez ce code chez {e.agent} et payez en espèces.
          </Notice>
          <Txt
            selectable
            variant="money"
            style={{ textAlign: 'center', letterSpacing: 6, fontSize: 40 }}
          >
            {e.code}
          </Txt>
          <Button
            variant="secondary"
            title="Démo : l’agent a reçu l’argent"
            onPress={() =>
              void update((s) => confirmAgentTopUp(s, e.id)).then(
                (ok) =>
                  ok &&
                  Alert.alert('Solde rechargé', `${money(e.amount)} MAD ajoutés à votre wallet.`),
              )
            }
          />
        </Card>
      ))}

      <Card style={{ paddingVertical: space.sm, gap: 0 }}>
        <View style={{ paddingVertical: space.md }}>
          <Heading title="Historique" />
        </View>
        {passenger.wallet.length ? (
          passenger.wallet.map((e, i) => (
            <View key={e.id}>
              {i > 0 && <Divider />}
              <Row style={{ paddingVertical: space.md }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: radius.pill,
                    backgroundColor: e.amount > 0 ? c.greenSoft : c.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={icons[e.kind]} size={18} color={e.amount > 0 ? c.green : c.ink} />
                </View>
                <Stack gap={0} style={{ flex: 1 }}>
                  <Txt variant="headline" style={{ fontSize: 13 }}>
                    {e.label}
                  </Txt>
                  <Txt variant="caption" style={{ fontSize: 11 }} numberOfLines={2}>
                    {dateLabel(e.at)} · {timeLabel(e.at)}
                    {e.status === 'pending' ? ' · en attente' : ''}
                    {e.message ? ` · « ${e.message} »` : ''}
                  </Txt>
                </Stack>
                <Txt
                  variant="headline"
                  style={{
                    fontSize: 14,
                    color: e.status === 'pending' ? c.subtle : e.amount > 0 ? c.green : c.ink,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {e.amount > 0 ? '+' : '−'}
                  {money(Math.abs(e.amount))}
                </Txt>
              </Row>
            </View>
          ))
        ) : (
          <Txt variant="caption" style={{ paddingBottom: space.md }}>
            Aucun mouvement pour le moment.
          </Txt>
        )}
      </Card>
      <Info>
        Démo : le solde reste sur cet appareil. En réel, l’argent est conservé par le partenaire de
        paiement agréé, jamais par TapTaxi.
      </Info>
    </Screen>
  );
}
