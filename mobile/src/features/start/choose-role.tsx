import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Icon, Info, Logo, Row, Screen, Stack, Txt } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { tapFeedback } from '@/lib/haptics';
import { useRole } from '@/lib/role-store';
import type { Role } from '@/lib/roles';
import { colors as c, radius, space } from '@/theme';

const CHOICES: { role: Role; title: string; arabic: string; sub: string; icon: IconName }[] = [
  {
    role: 'driver',
    title: 'Je suis chauffeur',
    arabic: 'أنا سائق',
    sub: 'Recevez des courses garanties, encaissez sans cash, suivez vos revenus.',
    icon: 'taxi',
  },
  {
    role: 'passenger',
    title: 'Je suis passager',
    arabic: 'أنا راكب',
    sub: 'Demandez un taxi agréé à moins de 1 km, payez comme vous voulez.',
    icon: 'card',
  },
];

/** First screen: choosing a role sends the user to that role's home (see RootStack). */
export function ChooseRole() {
  const { setRole } = useRole();
  return (
    <Screen center>
      <Logo />
      <Stack gap={space.xs}>
        <Txt variant="title">
          Qui êtes-vous
          <Txt variant="title" style={{ color: c.red }}>
            {' '}
            ?
          </Txt>
        </Txt>
        <Txt variant="caption">Choisissez votre espace. Vous pourrez changer à tout moment.</Txt>
      </Stack>
      {CHOICES.map((choice, i) => (
        <Pressable
          key={choice.role}
          accessibilityRole="button"
          accessibilityLabel={choice.title}
          accessibilityHint={choice.sub}
          onPress={() => {
            void tapFeedback();
            setRole(choice.role);
          }}
          style={({ pressed }) => ({
            backgroundColor: i === 0 ? c.red : c.surface,
            borderRadius: radius.card,
            borderCurve: 'continuous',
            padding: space.xl,
            gap: space.md,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Row style={{ justifyContent: 'space-between' }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: radius.pill,
                backgroundColor: i === 0 ? c.surface : c.background,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={choice.icon} size={26} color={i === 0 ? c.red : c.ink} />
            </View>
            <Icon name="arrow" color={i === 0 ? c.surface : c.ink} />
          </Row>
          <Stack gap={space.xs}>
            <Txt variant="heading" style={{ color: i === 0 ? c.surface : c.ink }}>
              {choice.title}
            </Txt>
            <Txt
              style={{
                writingDirection: 'rtl',
                textAlign: 'left',
                fontSize: 16,
                color: i === 0 ? c.surface : c.red,
              }}
            >
              {choice.arabic}
            </Txt>
            <Txt variant="caption" style={{ color: i === 0 ? c.redSoft : c.muted }}>
              {choice.sub}
            </Txt>
          </Stack>
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/why')}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingVertical: space.sm })}
      >
        <Txt variant="caption" style={{ textAlign: 'center', color: c.ink }}>
          Taxis agréés · compteur officiel + 1–3 MAD · payez comme vous voulez ›
        </Txt>
      </Pressable>
      <Info>Démo : aucun compte réel n’est créé.</Info>
    </Screen>
  );
}
