import { PaymentMissing } from './payment-missing';
import { useEffect, useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import * as Linking from 'expo-linking';
import QRCode from 'react-native-qrcode-svg';
import { Badge, Button, Card, Info, Plate, Row, Screen, Stack, Txt } from '@/components/ui';
import { cancelRequest, createRequest, money, paymentBreakdown } from '@/lib/model';
import { useStore } from '@/lib/store';
import { useRides } from '@/lib/rides-store';
import { linkPayment, rideForPayment } from '@/lib/rides';
import { uid } from '@/lib/ids';
import { colors as c, space } from '@/theme';
export function PaymentQR() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, mutate, notify, busy } = useStore();
  const { rides, update: updateRides } = useRides();
  const r = state.requests.find((r) => r.id === id);
  const [now, setNow] = useState(() => Date.now());
  const focused = useIsFocused();
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (focused && r?.status === 'paid') router.replace(`/received/${id}`);
  }, [r?.status, focused, id]);
  if (!r) return <PaymentMissing />;
  const expired = r.status === 'cancelled' || now >= r.expiresAt;
  const seconds = Math.max(0, Math.ceil((r.expiresAt - now) / 1000));
  const b = paymentBreakdown(r.fare);
  const url = Linking.createURL(`pay/${id}`);
  const renew = async () => {
    const next = uid();
    if (await mutate((s) => createRequest(cancelRequest(s, id), r.fare, next))) {
      // Keep the ride linked to the new code (fare check on the passenger side).
      const ride = rideForPayment(rides, id);
      if (ride) await updateRides((x) => linkPayment(x, ride.id, next, r.fare));
      router.replace(`/qr/${next}`);
    }
  };
  return (
    <Screen>
      <Stack style={{ alignItems: 'center' }} gap={space.sm}>
        <Txt variant="heading" style={{ textAlign: 'center' }}>
          {expired
            ? 'Ce code a expiré'
            : r.status === 'connected'
              ? 'Passager connecté'
              : 'Montrez ce code au passager'}
        </Txt>
        <Txt style={{ writingDirection: 'rtl', color: c.red, fontSize: 18 }}>
          أظهر هذا الرمز للراكب
        </Txt>
      </Stack>
      <Card style={{ alignItems: 'center' }}>
        <Txt variant="small">PETIT TAXI N° 1287 · #{id}</Txt>
        <Plate />
        <View
          style={{ padding: space.md, backgroundColor: c.surface, opacity: expired ? 0.18 : 1 }}
        >
          <QRCode value={url} size={220} color={c.ink} backgroundColor={c.surface} />
        </View>
        <Row style={{ alignItems: 'baseline' }}>
          <Txt selectable variant="money" style={{ fontSize: 38 }}>
            {money(b.total)}
          </Txt>
          <Txt>MAD</Txt>
        </Row>
        <Txt variant="caption" style={{ fontSize: 11 }}>
          Compteur {money(r.fare)} + frais {money(b.fee)}
          {b.night ? ' (nuit)' : ''}
        </Txt>
        <Badge>
          Vous recevez {money(b.credit)} MAD · bonus 10 % {money(b.driverFee)}
        </Badge>
      </Card>
      <Txt variant="caption" style={{ textAlign: 'center', color: expired ? c.red : c.muted }}>
        {expired
          ? 'Code expiré'
          : r.status === 'connected'
            ? 'Le passager vérifie son paiement…'
            : `En attente du passager · ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`}
      </Txt>
      {!expired && (
        <Button
          title="Tester le parcours passager"
          icon="arrow"
          onPress={() => router.push(`/pay/${id}`)}
        />
      )}
      <Row>
        <View style={{ flex: 1 }}>
          <Button
            variant="secondary"
            title="Annuler"
            onPress={() =>
              Alert.alert('Annuler ce paiement ?', 'Le code ne pourra plus être utilisé.', [
                { text: 'Garder', style: 'cancel' },
                {
                  text: 'Annuler le paiement',
                  style: 'destructive',
                  onPress: () => {
                    void mutate((s) => cancelRequest(s, id)).then((ok) => {
                      if (ok) router.dismissTo('/(tabs)');
                    });
                  },
                },
              ])
            }
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            variant="secondary"
            title="Nouveau code"
            loading={busy}
            onPress={() => {
              void renew();
            }}
          />
        </View>
      </Row>
      {!expired && (
        <Button
          title="Partager le lien démo"
          variant="ghost"
          icon="share"
          onPress={() => {
            void Share.share({
              message: `TapTaxi · lien de paiement de démonstration (même appareil) : ${url}`,
            }).catch(() => notify('Le partage est indisponible.'));
          }}
        />
      )}
      <Info>
        Démo locale : utilisez le parcours passager sur cet appareil. Aucun paiement réel.
      </Info>
    </Screen>
  );
}
