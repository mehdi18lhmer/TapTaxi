import { router } from 'expo-router';
import { Button, Heading, Icon, Info, Screen, Stack, Txt } from '@/components/ui';
import { PayoutOptions } from '@/components/payout-options';
import { documentProgress } from '@/lib/onboarding';
import { useStore } from '@/lib/store';
import { colors as c, space } from '@/theme';
import { StepProgress } from './step-progress';

/** Step 3: where the driver receives withdrawals. Finishing marks the sign-up as done. */
export function PayoutSetup() {
  const { state, mutate, busy } = useStore();
  return (
    <Screen>
      <StepProgress step={3} />
      <Stack gap={space.sm}>
        <Icon name="bank" size={30} color={c.red} />
        <Txt variant="title">Où recevoir votre argent ?</Txt>
        <Txt variant="caption">Vous pourrez changer à tout moment dans votre profil.</Txt>
      </Stack>
      <Heading title="Méthode de retrait" />
      <PayoutOptions
        value={state.payout}
        onChange={(payout) => {
          void mutate((s) => ({ ...s, payout }));
        }}
      />
      <Info>
        Les comptes de cette démonstration sont fictifs. Aucun compte de paiement réel n’est créé.
      </Info>
      <Button
        title="Terminer l’inscription démo"
        icon="arrow"
        loading={busy}
        onPress={() => {
          void mutate((s) => {
            // Guard: the documents step must be complete before finishing.
            if (!documentProgress(s.documents).complete)
              throw new Error('Ajoutez d’abord les quatre documents.');
            return { ...s, onboarded: true };
          }).then((ok) => ok && router.replace('/verification'));
        }}
      />
    </Screen>
  );
}
