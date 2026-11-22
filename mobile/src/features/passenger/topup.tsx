// Top up the TapTaxi wallet by saved card (instant) or in cash at an agent (code).
import { useState } from 'react';
import { router } from 'expo-router';
import {
  Button,
  Card,
  Chips,
  Detail,
  Heading,
  Info,
  Input,
  Option,
  Screen,
  Stack,
  Txt,
} from '@/components/ui';
import { money, parseMoney } from '@/lib/model';
import { cardLabel, isCardExpired } from '@/lib/passenger';
import { usePassenger } from '@/lib/passenger-store';
import {
  AGENTS,
  startAgentTopUp,
  TOPUP,
  TOPUP_AMOUNTS,
  topUpByCard,
  walletBalance,
} from '@/lib/passenger-wallet';
import { uid } from '@/lib/ids';
import { successFeedback } from '@/lib/haptics';
import { colors as c, space } from '@/theme';

type Choice = { kind: 'card'; id: string } | { kind: 'agent' };

export function TopUp() {
  const { passenger, update } = usePassenger();
  const cards = passenger.cards.filter((card) => !isCardExpired(card));
  const [value, setValue] = useState('100');
  const [choice, setChoice] = useState<Choice>(() =>
    cards[0] ? { kind: 'card', id: passenger.defaultCardId ?? cards[0].id } : { kind: 'agent' },
  );
  const [agent, setAgent] = useState<string>(AGENTS[0]);
  const [busy, setBusy] = useState(false);
  const amount = parseMoney(value);
  const error =
    amount === null
      ? 'Saisissez un montant valide.'
      : amount < TOPUP.min
        ? `Minimum ${TOPUP.min / 100} MAD.`
        : amount > TOPUP.max
          ? `Maximum ${TOPUP.max / 100} MAD.`
          : undefined;
  const card = choice.kind === 'card' ? cards.find((x) => x.id === choice.id) : undefined;

  const confirm = async () => {
    if (!amount || error) return;
    setBusy(true);
    const id = uid();
    const ok = await update((s) =>
      choice.kind === 'card' && card
        ? topUpByCard(s, amount, cardLabel(card), id)
        : startAgentTopUp(s, amount, agent, id),
    );
    setBusy(false);
    if (!ok) return;
    void successFeedback();
    router.replace('/passenger/wallet');
  };

  return (
    <Screen>
      <Stack gap={space.xs}>
        <Txt variant="title">Recharger mon solde</Txt>
        <Txt variant="caption">Solde actuel : {money(walletBalance(passenger))} MAD</Txt>
      </Stack>
      <Input
        label="Montant (MAD)"
        value={value}
        onChangeText={setValue}
        keyboardType="decimal-pad"
        error={error}
        selectTextOnFocus
      />
      <Chips
        value={String(amount)}
        onChange={(v) => setValue(String(Number(v) / 100))}
        items={TOPUP_AMOUNTS.map((n) => ({ value: String(n), label: `${n / 100} MAD` }))}
      />
      <Heading title="Payer avec" />
      <Stack gap={space.sm}>
        {cards.map((x) => (
          <Option
            key={x.id}
            icon="card"
            title={cardLabel(x)}
            sub="Crédité immédiatement"
            selected={choice.kind === 'card' && choice.id === x.id}
            onPress={() => setChoice({ kind: 'card', id: x.id })}
          />
        ))}
        {!cards.length && (
          <Option
            icon="card"
            title="Ajouter une carte"
            sub="Enregistrez une carte pour recharger en un geste"
            selected={false}
            onPress={() => router.push('/passenger/add-card')}
          />
        )}
        <Option
          icon="cash"
          title="En espèces chez un agent"
          sub="Cash Plus, Wafacash… · avec un code"
          selected={choice.kind === 'agent'}
          onPress={() => setChoice({ kind: 'agent' })}
        />
      </Stack>
      {choice.kind === 'agent' && (
        <Chips
          value={agent}
          onChange={setAgent}
          items={AGENTS.map((a) => ({ value: a, label: a }))}
        />
      )}
      <Card>
        <Detail label="Frais de recharge" value="Offerts" />
        <Detail label="Vous recevez" value={`${money(amount ?? 0)} MAD`} strong />
      </Card>
      <Button
        title={choice.kind === 'agent' ? 'Obtenir mon code' : `Recharger ${money(amount ?? 0)} MAD`}
        icon="lock"
        disabled={!!error || (choice.kind === 'card' && !card)}
        loading={busy}
        onPress={() => void confirm()}
      />
      <Info>
        Démo : aucun débit réel. Les données de carte restent chez le partenaire de paiement agréé.
      </Info>
      <Txt variant="small" style={{ textAlign: 'center', color: c.subtle }}>
        Le solde paie vos courses, « Offrir une course » et votre part d’une note partagée.
      </Txt>
    </Screen>
  );
}
