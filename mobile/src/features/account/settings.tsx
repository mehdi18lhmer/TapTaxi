import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Info, Screen, Txt } from '@/components/ui';
import { useStore } from '@/lib/store';
import { PayoutOptions } from '@/components/payout-options';
export function Settings() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const { state, mutate, busy } = useStore();
  const [value, setValue] = useState(state.payout);
  return (
    <Screen>
      {section === 'payout' ? (
        <>
          <Txt variant="heading">Votre méthode de retrait</Txt>
          <PayoutOptions value={value} onChange={setValue} />
          <Button
            title="Enregistrer"
            loading={busy}
            onPress={() => {
              void mutate((s) => ({ ...s, payout: value })).then((ok) => {
                if (ok) router.back();
              });
            }}
          />
          <Info>Comptes fictifs de la démonstration.</Info>
        </>
      ) : (
        <>
          <Txt variant="heading">Langue de l’application</Txt>
          <Badge>Français activé</Badge>
          <Txt variant="body">
            Cette version reprend le français et les indications en arabe de votre design.
          </Txt>
          <Txt variant="caption">
            Les traductions complètes en arabe et en anglais seront ajoutées dans une prochaine
            version.
          </Txt>
          <Button title="Compris" onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}
