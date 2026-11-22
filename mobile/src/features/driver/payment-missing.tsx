import { router } from 'expo-router';
import { Button, Card, Screen, Txt } from '@/components/ui';
export function PaymentMissing() {
  return (
    <Screen center>
      <Card>
        <Txt variant="heading">Paiement introuvable</Txt>
        <Txt variant="caption">
          Les paiements de cette démo sont enregistrés uniquement sur l’appareil où ils sont créés.
        </Txt>
        <Button title="Créer un paiement" onPress={() => router.replace('/amount')} />
      </Card>
    </Screen>
  );
}
