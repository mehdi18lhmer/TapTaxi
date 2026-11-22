import { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Chips, Detail, Heading, Info, Input, Screen, Txt } from '@/components/ui';
import { balance, methodLabel, money, parseMoney, withdraw } from '@/lib/model';
import type { PayoutMethod } from '@/lib/model';
import { useStore } from '@/lib/store';
import { PayoutOptions } from '@/components/payout-options';
import { uid } from '@/lib/ids';
import { withdrawalError } from '@/lib/ledger';
export function Withdraw() {
  const { state, mutate, busy } = useStore();
  const [value, setValue] = useState('500,00');
  const [method, setMethod] = useState<PayoutMethod>(state.payout);
  const [id] = useState(uid);
  const amount = parseMoney(value);
  const error = withdrawalError(amount, state);
  const confirm = () =>
    Alert.alert(
      'Confirmer le retrait démo',
      `${money(amount || 0)} MAD · ${methodLabel(method)}\nAucun transfert réel n’aura lieu.`,
      [
        { text: 'Modifier', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => {
            void mutate((s) => withdraw(s, amount || 0, method, id)).then((ok) => {
              if (ok) router.replace(`/withdrawal/${id}`);
            });
          },
        },
      ],
    );
  return (
    <Screen>
      <Txt variant="heading">Montant à retirer</Txt>
      <Input
        label="Montant en MAD"
        value={value}
        onChangeText={setValue}
        keyboardType="decimal-pad"
        error={error}
        selectTextOnFocus
      />
      <Txt variant="caption">Solde disponible : {money(balance(state))} MAD</Txt>
      <Chips
        value={String(amount)}
        onChange={(v) => setValue((Number(v) / 100).toFixed(2).replace('.', ','))}
        items={[10000, 20000, 50000, balance(state)].map((n, i) => ({
          value: String(n),
          label: i === 3 ? 'Tout' : String(n / 100),
        }))}
      />
      <Heading title="Recevoir via" />
      <PayoutOptions value={method} onChange={setMethod} />
      <Card>
        <Detail label="Frais de retrait" value="Offerts" />
        <Detail label="Vous recevez" value={`${money(amount || 0)} MAD`} strong />
      </Card>
      <Button
        title="Confirmer le retrait"
        disabled={!!error}
        loading={busy}
        icon="arrow"
        onPress={confirm}
      />
      <Info>Simulation uniquement. Aucun SMS ou virement réel.</Info>
    </Screen>
  );
}
