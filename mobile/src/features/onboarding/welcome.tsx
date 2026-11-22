import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Icon, Logo, Row, Screen, Stack, Txt } from '@/components/ui';
import { colors as c, radius, space } from '@/theme';

const BARS = [28, 45, 35, 65, 48, 85, 100];

export function Welcome() {
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Logo />
        <Button title="Passer" variant="ghost" onPress={() => router.dismissTo('/(tabs)')} />
      </Row>

      <Stack gap={space.md} style={{ paddingVertical: space.lg }}>
        <Card dark>
          <Txt variant="caption" style={{ color: c.lightOnDark }}>
            Gains d’aujourd’hui
          </Txt>
          <Txt variant="money" style={{ color: c.surface, fontSize: 40 }}>
            186,50
            <Txt style={{ color: c.red }}> MAD</Txt>
          </Txt>
          <Row style={{ alignItems: 'flex-end', height: 56, gap: space.sm }}>
            {BARS.map((h, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  borderRadius: 4,
                  backgroundColor: i === BARS.length - 1 ? c.red : c.darkSurface,
                }}
              />
            ))}
          </Row>
        </Card>
        <Card>
          <Row>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.pill,
                backgroundColor: c.greenSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="check" color={c.green} size={20} />
            </View>
            <Stack gap={0} style={{ flex: 1 }}>
              <Txt variant="headline">+23,50 MAD</Txt>
              <Txt variant="caption">Carte · il y a 1 min</Txt>
            </Stack>
            <Icon name="bank" size={20} color={c.muted} />
          </Row>
        </Card>
      </Stack>

      <Stack gap={space.sm}>
        <Txt variant="small" style={{ letterSpacing: 1 }}>
          LE QUOTIDIEN, EN PLUS SIMPLE
        </Txt>
        <Txt variant="title">
          Chaque paiement compte
          <Txt variant="title" style={{ color: c.red }}>
            .
          </Txt>
        </Txt>
        <Txt style={{ writingDirection: 'rtl', color: c.red, fontSize: 18 }}>
          خلّص الطاكسي بلا كاش
        </Txt>
        <Txt variant="caption">
          Encaissez par carte ou wallet, sans frais pour vous, et construisez votre historique de
          revenus.
        </Txt>
      </Stack>
      <Button title="Commencer" icon="arrow" onPress={() => router.push('/sign-in')} />
      <Button
        title="J’ai déjà un compte · Se connecter"
        variant="ghost"
        onPress={() => router.push('/sign-in')}
      />
    </Screen>
  );
}
