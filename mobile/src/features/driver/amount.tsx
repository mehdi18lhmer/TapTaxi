import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Button,
  Card,
  Detail,
  Divider,
  Icon,
  Info,
  Row,
  Screen,
  Stack,
  Txt,
} from '@/components/ui';
import { createRequest, money, parseMoney, paymentBreakdown } from '@/lib/model';
import { useStore } from '@/lib/store';
import { useRides } from '@/lib/rides-store';
import { linkPayment } from '@/lib/rides';
import { uid } from '@/lib/ids';
import { tapFeedback } from '@/lib/haptics';
import { colors as c, radius, space } from '@/theme';
export function Amount() {
  const { mutate, busy } = useStore();
  const { update: updateRides } = useRides();
  // Opened from a finished ride: the meter fare is pre-filled (the driver can correct it).
  const params = useLocalSearchParams<{ ride?: string; fare?: string }>();
  const [value, setValue] = useState(() => {
    const fare = Number(params.fare);
    return Number.isSafeInteger(fare) && fare > 0
      ? (fare / 100).toFixed(2).replace('.', ',').replace(/,00$/, '')
      : '0';
  });
  const cents = parseMoney(value) || 0;
  const b = paymentBreakdown(cents);
  const key = (k: string) => {
    void tapFeedback();
    setValue((v) => {
      if (k === 'delete') return v.length > 1 ? v.slice(0, -1) : '0';
      if (k === ',') return v.includes(',') ? v : v + ',';
      if (v.split(',')[1]?.length === 2 || v.replace(',', '').length >= 6) return v;
      return v === '0' ? k : v + k;
    });
  };
  return (
    <Screen>
      <Stack style={{ alignItems: 'center', paddingTop: space.lg }} gap={space.sm}>
        <Txt variant="heading">Montant du compteur</Txt>
        <Txt style={{ color: c.red, fontSize: 20, writingDirection: 'rtl' }}>المبلغ في العداد</Txt>
        <Txt variant="caption">Tapez le montant affiché au compteur</Txt>
      </Stack>
      <Row style={{ justifyContent: 'center', alignItems: 'baseline', paddingVertical: space.xl }}>
        <Txt selectable testID="fare-display" variant="money">
          {value}
        </Txt>
        <Txt variant="body" style={{ color: c.muted }}>
          MAD
        </Txt>
      </Row>
      <Card>
        <Detail label="Le passager paie" value={`${money(cents ? b.total : 0)} MAD`} />
        <Detail label="Vous recevez" value={`${money(cents ? b.credit : 0)} MAD`} strong />
        <Divider />
        <Txt variant="small">
          Frais passager {b.night ? '(nuit) ' : ''}: {money(cents ? b.fee : 0)} MAD · votre bonus 10
          % : {money(cents ? b.driverFee : 0)} MAD · compteur intégral pour vous
        </Txt>
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'delete'].map((k) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={k === 'delete' ? 'Effacer' : k === ',' ? 'Virgule' : k}
            key={k}
            onPress={() => key(k)}
            style={({ pressed }) => ({
              flexBasis: '30%',
              flexGrow: 1,
              minHeight: 58,
              borderRadius: radius.md,
              backgroundColor: pressed
                ? c.line
                : k === 'delete' || k === ','
                  ? 'transparent'
                  : c.surface,
              justifyContent: 'center',
              alignItems: 'center',
            })}
          >
            {k === 'delete' ? (
              <Icon name="delete" size={26} />
            ) : (
              <Txt variant="heading" style={{ fontSize: 27 }}>
                {k}
              </Txt>
            )}
          </Pressable>
        ))}
      </View>
      <Button
        title="Afficher le QR"
        icon="qr"
        testID="create-qr"
        disabled={!cents}
        loading={busy}
        onPress={() => {
          const id = uid();
          void mutate((s) => createRequest(s, cents, id)).then(async (ok) => {
            if (!ok) return;
            if (params.ride) await updateRides((r) => linkPayment(r, params.ride!, id, cents));
            router.push(`/qr/${id}`);
          });
        }}
      />
      <Info>Le passager voit le montant et les frais avant de payer.</Info>
    </Screen>
  );
}
