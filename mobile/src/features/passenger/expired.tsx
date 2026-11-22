import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Icon, Row, Screen, Stack, Txt } from '@/components/ui';
import { useStore } from '@/lib/store';
import { colors as c, radius, space } from '@/theme';
import { useRole } from '@/lib/role-store';

/** Shown when a payment code is expired, cancelled or unknown on this device. */
export function Expired() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useStore();
  const { role } = useRole();
  const paid = state.transactions.some((t) => t.kind === 'payment' && t.id === id);
  return (
    <Screen>
      <Stack style={{ alignItems: 'center', paddingTop: space.xl }} gap={space.md}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: radius.pill,
            backgroundColor: c.redSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="expired" size={40} color={c.red} />
        </View>
        <Txt variant="heading">Ce code a expiré.</Txt>
        <Txt variant="caption" style={{ textAlign: 'center' }}>
          Pour votre sécurité, chaque code ne sert qu’une fois et seulement quelques minutes.
        </Txt>
      </Stack>
      <Card>
        {[
          'Demandez au chauffeur d’afficher un nouveau code dans son application.',
          'Vous avez déjà payé ? Votre reçu reste disponible sur cet appareil.',
        ].map((text, i) => (
          <Row key={text} style={{ alignItems: 'flex-start' }}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: radius.pill,
                backgroundColor: c.background,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt variant="headline" style={{ fontSize: 13 }}>
                {i + 1}
              </Txt>
            </View>
            <Txt style={{ flex: 1 }}>{text}</Txt>
          </Row>
        ))}
      </Card>
      {paid && (
        <Button
          title="Voir mon reçu"
          icon="file"
          onPress={() => router.replace(`/receipt/${id}`)}
        />
      )}
      {role === 'driver' ? (
        <Button
          title="Afficher un nouveau code"
          variant={paid ? 'secondary' : 'primary'}
          icon="qr"
          onPress={() => router.replace('/amount')}
        />
      ) : (
        <Button
          title="Scanner un nouveau QR"
          variant={paid ? 'secondary' : 'primary'}
          icon="camera"
          onPress={() => router.dismissTo('/scan')}
        />
      )}
      <Button title="Aide et assistance" variant="ghost" onPress={() => router.push('/help')} />
    </Screen>
  );
}
