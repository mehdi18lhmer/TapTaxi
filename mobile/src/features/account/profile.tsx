import { Alert } from 'react-native';
import { router } from 'expo-router';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  MenuRow,
  NativeToggle,
  Row,
  Screen,
  Stack,
  Txt,
} from '@/components/ui';
import { useStore } from '@/lib/store';
import { space } from '@/theme';
import { useRole } from '@/lib/role-store';
export function Profile() {
  const { state, mutate } = useStore();
  const { setRole } = useRole();
  return (
    <Screen>
      <Txt variant="title">Profil</Txt>
      <Card style={{ alignItems: 'center' }}>
        <Avatar />
        <Txt variant="heading">Youssef Benali</Txt>
        <Badge>Chauffeur vérifié · démo</Badge>
        <Divider />
        <Row style={{ width: '100%', justifyContent: 'space-between' }}>
          <Stack gap={space.xs}>
            <Txt variant="headline">1287</Txt>
            <Txt variant="caption">N° de taxi</Txt>
          </Stack>
          <Stack gap={space.xs}>
            <Txt variant="headline">4,9 / 5</Txt>
            <Txt variant="caption">Note</Txt>
          </Stack>
          <Stack gap={space.xs}>
            <Txt variant="headline">Sept. 2026</Txt>
            <Txt variant="caption">Depuis</Txt>
          </Stack>
        </Row>
      </Card>
      <Card style={{ gap: 0, paddingVertical: space.xs }}>
        <MenuRow
          title="Mes gains"
          sub="Aujourd’hui, semaine, mois · espèces et TapTaxi"
          icon="chart"
          onPress={() => router.push('/earnings')}
        />
        <Divider />
        <MenuRow
          title="Couverture sociale"
          sub="CNSS · AMO · cotisations"
          icon="shield"
          onPress={() => router.push('/coverage')}
        />
        <Divider />
        <MenuRow
          title="Propriétaire du taxi"
          sub="Hassan M. · partage quotidien"
          icon="users"
          onPress={() => router.push('/owner')}
        />
        <Divider />
        <MenuRow
          title="Relevés mensuels"
          sub="PDF de vos revenus"
          icon="file"
          onPress={() => router.push('/statements')}
        />
        <Divider />
        <MenuRow
          title="Mes documents"
          sub="CIN, permis de confiance, carte grise"
          icon="file"
          onPress={() => router.push('/documents')}
        />
        <Divider />
        <MenuRow
          title="Comptes de retrait"
          sub="Cash Plus •••• 2208 · RIB •••• 0932"
          icon="wallet"
          onPress={() => router.push('/settings?section=payout')}
        />
        <Divider />
        <MenuRow
          title="Langue"
          sub="Français · indications en arabe"
          icon="settings"
          onPress={() => router.push('/settings?section=language')}
        />
        <Divider />
        <MenuRow
          title="Retour haptique"
          sub="Vibration à la réception d’un paiement"
          icon="volume"
          accessory={
            <NativeToggle
              label="Retour haptique"
              value={state.sound}
              onChange={(v) => {
                void mutate((s) => ({ ...s, sound: v }));
              }}
            />
          }
        />
        <Divider />
        <MenuRow
          title="Aide et assistance"
          sub="Les réponses à vos questions"
          icon="help"
          onPress={() => router.push('/help')}
        />
        <Divider />
        <MenuRow
          title="Je suis passager"
          sub="Passer à l’espace passager"
          icon="card"
          onPress={() =>
            Alert.alert('Passer en mode passager ?', 'Vos revenus restent sur cet appareil.', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Continuer', onPress: () => setRole('passenger') },
            ])
          }
        />
      </Card>
      <Button
        variant="ghost"
        title="Pourquoi TapTaxi ?"
        icon="arrow"
        onPress={() => router.push('/why')}
      />
      <Button
        variant="ghost"
        title="Découvrir l’inscription"
        icon="arrow"
        onPress={() => router.push('/welcome')}
      />
      <Button
        variant="ghost"
        title="Se déconnecter"
        icon="logout"
        onPress={() =>
          Alert.alert(
            'Quitter la session démo ?',
            'L’historique fictif de cet appareil sera conservé. Vous choisirez à nouveau votre espace.',
            [
              { text: 'Rester', style: 'cancel' },
              {
                text: 'Se déconnecter',
                style: 'destructive',
                // Forgetting the role brings back the "Qui êtes-vous ?" screen.
                onPress: () => setRole(null),
              },
            ],
          )
        }
      />
      <Txt variant="small" style={{ textAlign: 'center' }}>
        TapTaxi · v1.0.0 · Fait au Maroc
      </Txt>
    </Screen>
  );
}
