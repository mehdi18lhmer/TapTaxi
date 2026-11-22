import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Button,
  Card,
  Detail,
  Divider,
  Icon,
  Row,
  Screen,
  Stack,
  Success,
  Txt,
} from '@/components/ui';
import { balance, dateLabel, methodLabel, money, timeLabel } from '@/lib/model';
import { paymentSms, sharesOf } from '@/lib/ledger';
import { sharePdf } from '@/lib/pdf';
import { useStore } from '@/lib/store';
import { colors as c, space } from '@/theme';
import { PaymentMissing } from './payment-missing';

/**
 * Driver view of one payment. Right after a payment it is a confirmation
 * ("Paiement reçu"); opened from a list (`detail`) it is the payment's record.
 */
export function PaymentReceived({ detail = false }: { detail?: boolean }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, notify } = useStore();
  const [sharing, setSharing] = useState(false);
  const t = state.transactions.find(
    (t) => (t.kind === 'payment' || t.kind === 'cash') && t.id === id,
  );
  if (!t) return <PaymentMissing />;
  if (t.kind === 'cash') return <CashRide id={t.id} />;
  const driverFee = t.fee;
  // Split ride: one confirmation per payment.
  const shares = t.split ? sharesOf(state, t.split.ride) : [t];
  return (
    <Screen>
      <Stack style={{ alignItems: 'center' }} gap={space.sm}>
        <Success />
        <Txt variant="heading">{detail ? `Paiement #${t.id}` : 'Paiement reçu'}</Txt>
        <Txt style={{ writingDirection: 'rtl', fontSize: 19, color: c.green }}>تم استلام الدفع</Txt>
        <Txt selectable variant="money" style={{ fontSize: 42, color: c.green }}>
          +{money(detail ? t.credit : shares.reduce((n, x) => n + x.credit, 0))}{' '}
          <Txt style={{ color: c.green }}>MAD</Txt>
        </Txt>
        <Txt variant="caption">
          {detail
            ? dateLabel(t.at, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })
            : timeLabel(t.at)}{' '}
          · Crédité au portefeuille démo
        </Txt>
      </Stack>
      <Card>
        <Detail label="Course (compteur)" value={`${money(t.fare)} MAD`} />
        <Detail label="Votre bonus 10 % des frais" value={`+${money(driverFee)} MAD`} />
        {t.tip > 0 && <Detail label="Pourboire · 100 % pour vous" value={`+${money(t.tip)} MAD`} />}
        <Divider />
        <Detail label="Crédité au portefeuille" value={`${money(t.credit)} MAD`} strong />
        {detail && <Detail label="Référence" value={`TT-${t.id}`} />}
        <Txt variant="caption" style={{ textAlign: 'center' }}>
          {methodLabel(t.method)} · simulation enregistrée
        </Txt>
      </Card>
      {!detail && (
        <Card>
          <Row>
            <Icon name="sms" size={18} color={c.green} />
            <Txt variant="headline" style={{ fontSize: 14, flex: 1 }}>
              {shares.length > 1
                ? `${shares.length} SMS envoyés au chauffeur`
                : 'SMS envoyé au chauffeur'}
            </Txt>
          </Row>
          {shares.map((x) => (
            <Txt
              key={x.id}
              selectable
              variant="caption"
              style={{ backgroundColor: c.background, padding: space.md, borderRadius: 12 }}
            >
              {paymentSms(x)}
            </Txt>
          ))}
          <Txt variant="small">Simulation · aucun SMS réel.</Txt>
        </Card>
      )}
      {detail ? (
        <Button
          title="Partager le reçu (PDF)"
          icon="share"
          loading={sharing}
          onPress={() => {
            setSharing(true);
            void sharePdf(`Paiement #${t.id}`, [t], true)
              .catch(() => notify('Le PDF n’a pas pu être créé. Réessayez.'))
              .finally(() => setSharing(false));
          }}
        />
      ) : (
        <Button title="Nouvel encaissement" icon="qr" onPress={() => router.replace('/amount')} />
      )}
      <Button
        variant="secondary"
        title="Voir le portefeuille"
        onPress={() => router.dismissTo('/(tabs)/wallet')}
      />
      <Txt variant="caption" style={{ textAlign: 'center' }}>
        Solde disponible : {money(balance(state))} MAD
      </Txt>
    </Screen>
  );
}

/** A ride paid in cash: recorded, no wallet credit. */
function CashRide({ id }: { id: string }) {
  const { state } = useStore();
  const t = state.transactions.find((x) => x.id === id)!;
  return (
    <Screen>
      <Stack style={{ alignItems: 'center' }} gap={space.sm}>
        <Icon name="cash" size={40} color={c.green} />
        <Txt variant="heading">Course en espèces</Txt>
        <Txt selectable variant="money" style={{ fontSize: 42 }}>
          {money(t.fare)} <Txt>MAD</Txt>
        </Txt>
        <Txt variant="caption">
          {dateLabel(t.at, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Txt>
      </Stack>
      <Card>
        <Detail label="Compteur (payé en espèces)" value={`${money(t.fare)} MAD`} />
        <Detail label="Frais TapTaxi" value="Aucun" />
        <Detail label="Référence" value={`TT-${t.id}`} />
        <Txt variant="caption">
          Enregistrée dans vos revenus (espèces) : elle compte dans vos relevés et votre tableau de
          bord.
        </Txt>
      </Card>
      <Button variant="secondary" title="Mes gains" onPress={() => router.push('/earnings')} />
    </Screen>
  );
}

/** Route `transaction/[id]`: a payment opened from a list. */
export function PaymentDetail() {
  return <PaymentReceived detail />;
}
