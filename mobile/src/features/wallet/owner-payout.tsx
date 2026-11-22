import { useState } from 'react';
import { Alert, View } from 'react-native';
import {
  Avatar,
  Button,
  Card,
  Detail,
  Divider,
  Heading,
  Info,
  Input,
  NativeToggle,
  Row,
  Screen,
  Stack,
  Txt,
  Badge,
  Chips,
  Icon,
} from '@/components/ui';
import { dateLabel, money, parseMoney } from '@/lib/model';
import { useStore } from '@/lib/store';
import { uid } from '@/lib/ids';
import { ownerPaidToday, ownerSettlement, payOwner, settlementHistory } from '@/lib/ledger';
import { colors as c, radius, space } from '@/theme';
export function OwnerPayout() {
  const { state, mutate, busy } = useStore();
  const [value, setValue] = useState((state.ownerAmount / 100).toFixed(2).replace('.', ','));
  const amount = parseMoney(value);
  const [view, setView] = useState<'driver' | 'owner'>('driver');
  const settlement = ownerSettlement(state);
  const earned = settlement.earned;
  const paid = ownerPaidToday(state);
  const scheduled = settlement.ownerAmount;
  const history = settlementHistory(state, 7);
  const send = () =>
    Alert.alert(
      'Versement de démonstration',
      `Déduire ${money(state.ownerAmount)} MAD du solde démo pour Hassan M. ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => {
            const id = uid();
            void mutate((s) => payOwner(s, id));
          },
        },
      ],
    );
  return (
    <Screen>
      <Txt variant="heading">Une chose de moins à penser.</Txt>
      {/* Owner – driver link: both are linked to the taxi; the app settles what each is owed. */}
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="headline">Taxi n° 1287</Txt>
          <Badge>Lien actif</Badge>
        </Row>
        <Row style={{ justifyContent: 'space-around' }}>
          <Stack gap={space.xs} style={{ alignItems: 'center' }}>
            <Avatar owner />
            <Txt variant="caption" style={{ color: c.ink }}>
              Hassan M.
            </Txt>
            <Txt variant="small">Propriétaire</Txt>
          </Stack>
          <Icon name="taxi" color={c.red} size={28} />
          <Stack gap={space.xs} style={{ alignItems: 'center' }}>
            <Avatar />
            <Txt variant="caption" style={{ color: c.ink }}>
              Youssef B.
            </Txt>
            <Txt variant="small">Chauffeur</Txt>
          </Stack>
        </Row>
        <Txt variant="caption" style={{ textAlign: 'center' }}>
          Partage du jour : un montant fixe pour le propriétaire, le reste pour le chauffeur.
        </Txt>
      </Card>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="headline">Partage d’aujourd’hui</Txt>
          <Txt variant="small">{paid ? 'Réglé' : 'À régler'}</Txt>
        </Row>
        <View
          style={{
            height: 14,
            borderRadius: radius.pill,
            overflow: 'hidden',
            backgroundColor: c.background,
            flexDirection: 'row',
          }}
        >
          <View style={{ width: `${settlement.ownerPercent}%`, backgroundColor: c.ink }} />
          <View style={{ flex: 1, backgroundColor: c.red }} />
        </View>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="caption">Propriétaire · {money(settlement.ownerAmount)} MAD</Txt>
          <Txt variant="caption" style={{ color: c.red }}>
            Chauffeur · {money(settlement.driverShare)} MAD
          </Txt>
        </Row>
        <Txt variant="small">Gains du jour (TapTaxi + espèces) : {money(earned)} MAD</Txt>
      </Card>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="headline" style={{ flex: 1 }}>
            Versement quotidien
          </Txt>
          <NativeToggle
            label="Versement quotidien"
            value={state.ownerEnabled}
            onChange={(v) => {
              void mutate((s) => ({ ...s, ownerEnabled: v }));
            }}
          />
        </Row>
        <Txt selectable variant="money" style={{ fontSize: 38 }}>
          {money(state.ownerAmount)}
          <Txt> MAD / jour</Txt>
        </Txt>
        <Txt variant="caption">Horaire prévu : 23:00 · simulation</Txt>
      </Card>
      <Card>
        <Detail label="Gains d’aujourd’hui" value={`${money(earned)} MAD`} />
        <Detail label="Versement prévu" value={`−${money(scheduled)} MAD`} />
        <Divider />
        <Detail
          label="Il vous reste"
          value={`${money(Math.max(0, earned - scheduled))} MAD`}
          strong
        />
      </Card>
      <Card>
        <Row>
          <Avatar owner />
          <Stack style={{ flex: 1 }} gap={space.xs}>
            <Txt variant="headline">Hassan M.</Txt>
            <Txt variant="caption">Propriétaire · taxi n° 1287</Txt>
          </Stack>
        </Row>
        <Detail label="Reçoit sur" value="Banque •••• 0931" />
      </Card>
      <Input
        label="Modifier le montant quotidien (MAD)"
        value={value}
        keyboardType="decimal-pad"
        onChangeText={setValue}
      />
      <Button
        variant="secondary"
        title="Enregistrer le montant"
        disabled={!amount}
        loading={busy}
        onPress={() => {
          if (amount) void mutate((s) => ({ ...s, ownerAmount: amount }));
        }}
      />
      <Button
        title={paid ? 'Versement déjà effectué aujourd’hui' : 'Simuler le versement du jour'}
        disabled={paid || !state.ownerEnabled}
        loading={busy}
        onPress={send}
      />
      <Info>
        Les versements automatiques nécessitent un serveur. Aucun transfert automatique à 23:00 dans
        cette démo.
      </Info>
      <Heading title="Historique partagé" />
      <Chips
        value={view}
        onChange={(v) => setView(v as 'driver' | 'owner')}
        items={[
          { value: 'driver', label: 'Vue chauffeur' },
          { value: 'owner', label: 'Vue propriétaire' },
        ]}
      />
      <Card>
        {history.map((d) => (
          <Stack key={d.key} gap={2}>
            <Detail
              label={dateLabel(d.at, { weekday: 'short', day: 'numeric', month: 'short' })}
              value={
                view === 'owner'
                  ? `${d.owner ? `+${money(d.owner)}` : 'en attente'} MAD`
                  : `${money(d.driver)} MAD pour vous`
              }
            />
            <Txt variant="small">
              Gains {money(d.earned)} · propriétaire {money(d.owner)} · chauffeur {money(d.driver)}
            </Txt>
          </Stack>
        ))}
        <Txt variant="small">Le propriétaire et le chauffeur voient le même historique.</Txt>
      </Card>
    </Screen>
  );
}
