import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Badge, Card, Icon, Info, MenuRow, Screen, Txt } from '@/components/ui';
import { colors as c } from '@/theme';
export function Services() {
  return (
    <Screen>
      <Card dark>
        <Icon name="shield" color={c.red} size={36} />
        <Txt variant="title" style={{ color: c.surface }}>
          Votre travail ouvre de nouvelles portes.
        </Txt>
        <Txt variant="caption" style={{ color: c.lightOnDark }}>
          Des services pensés pour votre quotidien de chauffeur.
        </Txt>
      </Card>
      {[
        {
          title: 'Avance carburant',
          sub: 'Un coup de pouce pour démarrer la journée',
          icon: 'fuel' as const,
          path: '/fuel',
        },
        {
          title: 'Protection & assurance',
          sub: 'Roulez l’esprit tranquille',
          icon: 'shield' as const,
          path: '',
        },
        {
          title: 'Financement de véhicule',
          sub: 'Préparez votre prochain taxi',
          icon: 'taxi' as const,
          path: '',
        },
        {
          title: 'Votre dossier de revenus',
          sub: 'Votre activité dans un document clair',
          icon: 'file' as const,
          path: '/statements',
        },
      ].map((item) => (
        <Card key={item.title}>
          <MenuRow
            title={item.title}
            sub={item.sub}
            icon={item.icon}
            onPress={() =>
              item.path
                ? router.push(item.path)
                : Alert.alert(
                    item.title,
                    'Ce service sera disponible après connexion à un partenaire et présentation de ses conditions.',
                  )
            }
          />
          <Badge neutral>{item.path ? 'Découvrir' : 'Bientôt disponible'}</Badge>
        </Card>
      ))}
      <Info>
        Vous choisissez. Rien n’est activé sans votre accord. Les partenaires ne sont pas connectés
        dans la démo.
      </Info>
    </Screen>
  );
}
