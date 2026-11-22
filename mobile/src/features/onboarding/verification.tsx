import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Icon, Screen, Stack, Success, Txt } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { formatPhone } from '@/lib/onboarding';
import { methodLabel } from '@/lib/model';
import { useStore } from '@/lib/store';
import { colors as c, radius, space } from '@/theme';

/** Sign-up finished. The partner check (real identity verification) is not connected yet. */
export function Verification() {
  const { state } = useStore();
  const steps: { title: string; sub: string; done: boolean; icon: IconName }[] = [
    {
      title: 'Compte démo créé',
      sub: `+212 ${formatPhone(state.phone)}`,
      done: true,
      icon: 'check',
    },
    {
      title: 'Documents fictifs prêts',
      sub: `${state.documents.length} documents · démonstration`,
      done: true,
      icon: 'check',
    },
    { title: 'Retraits', sub: methodLabel(state.payout), done: true, icon: 'check' },
    {
      title: 'Vérification partenaire',
      sub: 'À connecter lors de la mise en service',
      done: false,
      icon: 'shield',
    },
  ];
  return (
    <Screen>
      <Stack style={{ alignItems: 'center' }} gap={space.sm}>
        <Success />
        <Txt variant="title" style={{ textAlign: 'center' }}>
          Dossier démo envoyé.
        </Txt>
        <Txt style={{ writingDirection: 'rtl', color: c.green, fontSize: 18 }}>تم إرسال ملفك</Txt>
        <Txt variant="caption" style={{ textAlign: 'center' }}>
          Vous avez terminé le parcours d’inscription. Aucun dossier réel n’a été transmis.
        </Txt>
      </Stack>
      <Card>
        {steps.map((s) => (
          <View key={s.title} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: radius.pill,
                backgroundColor: s.done ? c.greenSoft : c.background,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={s.icon} size={17} color={s.done ? c.green : c.muted} />
            </View>
            <Stack gap={0} style={{ flex: 1 }}>
              <Txt variant="headline" style={{ fontSize: 14 }}>
                {s.title}
              </Txt>
              <Txt variant="caption">{s.sub}</Txt>
            </Stack>
          </View>
        ))}
      </Card>
      <Button title="Découvrir mon espace" icon="qr" onPress={() => router.dismissTo('/(tabs)')} />
      <Button title="Besoin d’aide ?" variant="ghost" onPress={() => router.push('/help')} />
    </Screen>
  );
}
