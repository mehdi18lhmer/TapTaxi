import { Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Badge, Button, Card, Empty, Info, Row, Screen, Stack, Txt } from '@/components/ui';
import { cardLabel, isCardExpired, MAX_CARDS, removeCard, setDefaultCard } from '@/lib/passenger';
import { usePassenger } from '@/lib/passenger-store';
import { colors as c, space } from '@/theme';
import { CardVisual } from './card-fields';

/** "Mes cartes": saved cards, the default one first. */
export function Cards() {
  const { passenger, update } = usePassenger();
  const cards = [...passenger.cards].sort(
    (a, b) => Number(b.id === passenger.defaultCardId) - Number(a.id === passenger.defaultCardId),
  );

  return (
    <Screen>
      <Txt variant="caption">
        La carte par défaut est proposée automatiquement au moment de payer.
      </Txt>
      {cards.length ? (
        cards.map((card) => {
          const isDefault = card.id === passenger.defaultCardId;
          const expired = isCardExpired(card);
          return (
            <Card key={card.id}>
              <CardVisual saved={card} />
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="headline">{cardLabel(card)}</Txt>
                {expired ? (
                  <Badge neutral>Expirée</Badge>
                ) : isDefault ? (
                  <Badge>Par défaut</Badge>
                ) : null}
              </Row>
              <Row style={{ gap: space.sm }}>
                {!isDefault && !expired && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void update((s) => setDefaultCard(s, card.id))}
                    style={{ flex: 1 }}
                  >
                    <Txt variant="caption" style={{ fontWeight: '600' }}>
                      Utiliser par défaut
                    </Txt>
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Supprimer ${cardLabel(card)}`}
                  onPress={() =>
                    Alert.alert('Supprimer cette carte ?', cardLabel(card), [
                      { text: 'Annuler', style: 'cancel' },
                      {
                        text: 'Supprimer',
                        style: 'destructive',
                        onPress: () => void update((s) => removeCard(s, card.id)),
                      },
                    ])
                  }
                >
                  <Txt variant="caption" style={{ color: c.red, fontWeight: '600' }}>
                    Supprimer
                  </Txt>
                </Pressable>
              </Row>
            </Card>
          );
        })
      ) : (
        <Card>
          <Empty
            title="Aucune carte enregistrée"
            body="Ajoutez une carte pour payer votre taxi en un geste."
          />
        </Card>
      )}
      <Stack gap={space.sm}>
        <Button
          title="Ajouter une carte"
          icon="card"
          disabled={passenger.cards.length >= MAX_CARDS}
          onPress={() => router.push('/passenger/add-card')}
        />
        <Info>
          Seuls la marque, les 4 derniers chiffres et la date d’expiration sont gardés sur cet
          appareil. Le numéro complet et le CVV ne sont jamais enregistrés.
        </Info>
      </Stack>
    </Screen>
  );
}
