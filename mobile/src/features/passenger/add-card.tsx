import { useState } from 'react';
import { router } from 'expo-router';
import { Button, Info, Screen } from '@/components/ui';
import type { CardInput } from '@/lib/checkout';
import { successFeedback } from '@/lib/haptics';
import { uid } from '@/lib/ids';
import { addCard, cardLabel } from '@/lib/passenger';
import { usePassenger } from '@/lib/passenger-store';
import { useStore } from '@/lib/store';
import { CardFields, EMPTY_CARD } from './card-fields';

export function AddCard() {
  const { passenger, update } = usePassenger();
  const { notify } = useStore();
  const [card, setCard] = useState<CardInput>(EMPTY_CARD);
  const [error, setError] = useState<string | undefined>();

  const save = async () => {
    // Check first: a refused card shows its reason under the form, nothing is saved.
    let result: ReturnType<typeof addCard>;
    try {
      result = addCard(passenger, card, uid());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Carte refusée.');
      return;
    }
    if (await update(() => result.state)) {
      setCard(EMPTY_CARD); // the typed number leaves memory as soon as it is saved
      void successFeedback();
      notify(`${cardLabel(result.card)} enregistrée.`);
      // Opened from a link (no previous screen): go to the page it belongs to.
      if (router.canGoBack()) router.back();
      else router.navigate('/passenger/cards');
    }
  };

  return (
    <Screen>
      <CardFields
        value={card}
        onChange={(next) => {
          setCard(next);
          setError(undefined);
        }}
        error={error}
      />
      <Button title="Enregistrer la carte" icon="lock" onPress={() => void save()} />
      <Info>
        Démo : seules les cartes de test sont acceptées (4242 4242 4242 4242 ou 5555 5555 5555
        4444). Le numéro complet et le CVV ne sont jamais enregistrés.
      </Info>
    </Screen>
  );
}
