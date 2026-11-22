import { Alert, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Divider, MenuRow, Screen, Stack, Txt } from '@/components/ui';
import { dateLabel } from '@/lib/model';
import { formatPhone } from '@/lib/onboarding';
import { cardLabel, preferredCard, signOut } from '@/lib/passenger';
import { usePassenger } from '@/lib/passenger-store';
import { useRole } from '@/lib/role-store';
import { colors as c, radius, space } from '@/theme';

export function PassengerProfile() {
  const { passenger, update } = usePassenger();
  const { setRole } = useRole();
  const account = passenger.account;
  if (!account) return null; // logged out: the root layout redirects to login
  const card = preferredCard(passenger);

  return (
    <Screen>
      <Txt variant="title">Profil</Txt>
      <Card style={{ alignItems: 'center' }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: radius.pill,
            backgroundColor: c.red,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt variant="heading" style={{ color: c.surface }}>
            {account.firstName.slice(0, 1).toUpperCase()}
          </Txt>
        </View>
        <Stack gap={0} style={{ alignItems: 'center' }}>
          <Txt variant="heading">{account.firstName}</Txt>
          <Txt variant="caption">+212 {formatPhone(account.phone)}</Txt>
          <Txt variant="small">
            Passager depuis le{' '}
            {dateLabel(account.since, { day: 'numeric', month: 'long', year: 'numeric' })}
          </Txt>
        </Stack>
      </Card>
      <Card style={{ gap: 0, paddingVertical: space.xs }}>
        <MenuRow
          title="Modifier mon profil"
          sub="Prénom et numéro de téléphone"
          icon="person"
          onPress={() => router.push('/passenger/edit-profile')}
        />
        <Divider />
        <MenuRow
          title="Mes cartes"
          sub={card ? `${cardLabel(card)} par défaut` : 'Aucune carte enregistrée'}
          icon="card"
          onPress={() => router.push('/passenger/cards')}
        />
        <Divider />
        <MenuRow
          title="Solde TapTaxi"
          sub="Recharger, offrir une course, historique"
          icon="wallet"
          onPress={() => router.push('/passenger/wallet')}
        />
        <Divider />
        <MenuRow
          title="Mes courses"
          sub="Historique, reçus, signaler un problème"
          icon="file"
          onPress={() => router.navigate('/receipts')}
        />
        <Divider />
        <MenuRow
          title="Pourquoi TapTaxi ?"
          sub="Taxis agréés, frais fixes, sans surprise"
          icon="shield"
          onPress={() => router.push('/why')}
        />
        <Divider />
        <MenuRow
          title="Aide et assistance"
          sub="Les réponses à vos questions"
          icon="help"
          onPress={() => router.navigate('/assistance')}
        />
        <Divider />
        <MenuRow
          title="Je suis chauffeur"
          sub="Passer à l’espace chauffeur"
          icon="taxi"
          onPress={() =>
            Alert.alert('Passer en mode chauffeur ?', 'Votre compte passager reste connecté.', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Continuer', onPress: () => setRole('driver') },
            ])
          }
        />
      </Card>
      <Button
        title="Se déconnecter"
        variant="ghost"
        icon="logout"
        onPress={() =>
          Alert.alert(
            'Se déconnecter ?',
            'Vos cartes enregistrées seront retirées de cet appareil. Vos reçus restent disponibles.',
            [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Se déconnecter', style: 'destructive', onPress: () => void update(signOut) },
            ],
          )
        }
      />
    </Screen>
  );
}
