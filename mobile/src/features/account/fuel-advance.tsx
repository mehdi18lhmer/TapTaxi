import { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Host, Slider } from '@expo/ui';
import { Button, Card, Detail, Heading, Icon, Info, Row, Screen, Txt } from '@/components/ui';
import { todayPayments } from '@/lib/model';
import { useStore } from '@/lib/store';
import { uid } from '@/lib/ids';
import { FUEL_ADVANCE, hasFuelAdvance, requestFuelAdvance } from '@/lib/ledger';
import { colors as c } from '@/theme';
export function FuelAdvance() {
  const { state, mutate, busy } = useStore();
  const [amount, setAmount] = useState<number>(FUEL_ADVANCE.max);
  const active = hasFuelAdvance(state);
  const submit = () =>
    Alert.alert(
      'Simuler une avance',
      `Ajouter ${amount} MAD au solde fictif ? Aucun crédit ni remboursement réel ne sera créé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => {
            const id = uid();
            void mutate((s) => requestFuelAdvance(s, amount, id)).then((ok) => {
              if (ok) router.dismissTo('/(tabs)/wallet');
            });
          },
        },
      ],
    );
  return (
    <Screen>
      <Icon name="fuel" size={34} color={c.red} />
      <Txt variant="title">Faites le plein ce matin.</Txt>
      <Txt variant="caption">Un aperçu du service d’avance carburant.</Txt>
      <Card>
        <Txt variant="caption">Montant de l’avance</Txt>
        <Txt variant="money" style={{ textAlign: 'center' }}>
          {amount}
          <Txt> MAD</Txt>
        </Txt>
        <Host style={{ height: 50, width: '100%' }} seedColor={c.red} colorScheme="light">
          <Slider
            value={amount}
            onValueChange={(v) => setAmount(Math.round(v / FUEL_ADVANCE.step) * FUEL_ADVANCE.step)}
            min={FUEL_ADVANCE.min}
            max={FUEL_ADVANCE.max}
            step={FUEL_ADVANCE.step}
          />
        </Host>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="caption">{FUEL_ADVANCE.min} MAD</Txt>
          <Txt variant="caption">{FUEL_ADVANCE.max} MAD max</Txt>
        </Row>
      </Card>
      <Card>
        <Heading title="À propos de cette offre démo" />
        <Detail label="Paiements aujourd’hui" value={String(todayPayments(state).length)} />
        <Detail label="Partenaire" value="Non connecté" />
        <Detail label="Frais et remboursement" value="À définir" />
      </Card>
      <Button
        title={active ? 'Avance démo en cours' : `Simuler ${amount} MAD`}
        disabled={active}
        loading={busy}
        onPress={submit}
      />
      <Info>
        Aucune offre financière réelle. Les conditions du partenaire devront être affichées avant
        toute souscription.
      </Info>
    </Screen>
  );
}
