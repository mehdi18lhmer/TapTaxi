import { Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  Badge,
  Button,
  Card,
  Detail,
  Heading,
  Info,
  Row,
  Screen,
  Success,
  Txt,
} from '@/components/ui';
import { methodLabel, money } from '@/lib/model';
import { useStore } from '@/lib/store';
export function WithdrawalCode() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, notify } = useStore();
  const w = state.withdrawals.find((w) => w.id === id);
  if (!w)
    return (
      <Screen>
        <Txt>Ce retrait est introuvable.</Txt>
        <Button title="Retour au portefeuille" onPress={() => router.dismissTo('/(tabs)/wallet')} />
      </Screen>
    );
  return (
    <Screen>
      <Success />
      <Txt variant="heading" style={{ textAlign: 'center' }}>
        {w.method === 'agency' ? 'Votre retrait est prêt' : 'Demande enregistrée'}
      </Txt>
      <Txt variant="caption" style={{ textAlign: 'center' }}>
        {money(w.amount)} MAD · {methodLabel(w.method)} · démo
      </Txt>
      {w.method === 'agency' ? (
        <>
          <Card style={{ alignItems: 'center' }}>
            <Txt variant="caption">Code de retrait de démonstration</Txt>
            <Txt variant="small">Cash Plus · Wafacash</Txt>
            <Txt selectable variant="money" style={{ fontSize: 36, letterSpacing: 3 }}>
              {w.code.slice(0, 4)} {w.code.slice(4)}
            </Txt>
            <Txt variant="caption" style={{ textAlign: 'center' }}>
              Ce code est fictif et ne permet pas de retirer d’argent.
            </Txt>
            <Button
              title="Copier le code"
              variant="secondary"
              icon="copy"
              onPress={() => {
                void Clipboard.setStringAsync(w.code)
                  .then(() => notify('Code de démonstration copié.'))
                  .catch(() => notify('La copie est indisponible.'));
              }}
            />
          </Card>
          <Heading title="Agences de l’exemple" />
          {['Cash Plus Maârif', 'Wafacash Bd Zerktouni'].map((name) => (
            <Card key={name}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="headline" style={{ flex: 1 }}>
                  {name}
                </Txt>
                <Button
                  title="Itinéraire"
                  variant="ghost"
                  onPress={() => {
                    void Linking.openURL(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' Casablanca')}`,
                    ).catch(() => notify('Impossible d’ouvrir la carte.'));
                  }}
                />
              </Row>
            </Card>
          ))}
        </>
      ) : (
        <Card>
          <Detail label="Montant" value={`${money(w.amount)} MAD`} />
          <Badge>Simulation enregistrée</Badge>
          <Info>Aucun transfert réel n’a été initié.</Info>
        </Card>
      )}
      <Button title="Retour au portefeuille" onPress={() => router.dismissTo('/(tabs)/wallet')} />
    </Screen>
  );
}
