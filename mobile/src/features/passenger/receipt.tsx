import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  Detail,
  Divider,
  Info,
  Screen,
  Stack,
  Success,
  Txt,
} from '@/components/ui';
import { dateLabel, methodLabel, money, passengerFeeOf, passengerPaid } from '@/lib/model';
import { sharesOf } from '@/lib/ledger';
import { sharePdf } from '@/lib/pdf';
import { useStore } from '@/lib/store';
import { space } from '@/theme';
import { Expired } from './expired';
import { useRole } from '@/lib/role-store';

export function Receipt() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, notify } = useStore();
  const { role } = useRole();
  const [sharing, setSharing] = useState(false);
  const t = state.transactions.find(
    (x) => (x.kind === 'payment' || x.kind === 'cash') && x.id === id,
  );
  if (!t) return <Expired />;
  const total = passengerPaid(t);
  const fee = passengerFeeOf(t);
  const cash = t.kind === 'cash';
  const shares = t.split ? sharesOf(state, t.split.ride) : [];

  return (
    <Screen>
      <Stack style={{ alignItems: 'center' }} gap={space.sm}>
        <Success />
        <Txt variant="heading">
          {cash ? 'Course enregistrée' : t.split ? 'Votre part est payée' : 'Paiement réussi'}
        </Txt>
        <Txt>
          <Txt variant="headline">{money(total)} MAD</Txt> {cash ? 'payés en espèces à' : 'payé à'}{' '}
          Youssef B.
        </Txt>
        <Txt variant="caption">Taxi n° 1287 · Casablanca</Txt>
      </Stack>
      <Card>
        <Txt variant="headline">Reçu de paiement</Txt>
        <Divider />
        <Detail
          label="Date"
          value={dateLabel(t.at, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        />
        <Detail
          label={t.split ? 'Ma part du compteur' : 'Course (compteur)'}
          value={`${money(t.fare)} MAD`}
        />
        {!cash && <Detail label="Frais TapTaxi" value={`${money(fee)} MAD`} />}
        {!cash && <Detail label="Pourboire" value={`${money(t.tip)} MAD`} />}
        <Detail label="Payé par" value={methodLabel(t.method)} />
        <Divider />
        <Detail label="Total payé" value={`${money(total)} MAD`} strong />
        <Detail label="Référence" value={`TT-${t.id}`} />
        <Badge neutral>{cash ? 'Espèces · aucun paiement numérique' : 'Paiement démo'}</Badge>
      </Card>
      {shares.length > 1 && (
        <Card>
          <Txt variant="headline">Note partagée · {shares.length} personnes</Txt>
          {shares.map((x) => (
            <Detail
              key={x.id}
              label={`${x.split?.payer ?? ''} · ${methodLabel(x.method)}`}
              value={`${money(passengerPaid(x))} MAD`}
            />
          ))}
          <Txt variant="small">Le chauffeur a reçu une confirmation pour chaque part.</Txt>
        </Card>
      )}
      {!cash && (
        <Button
          title="Partager le reçu (PDF)"
          icon="share"
          loading={sharing}
          onPress={() => {
            setSharing(true);
            void sharePdf('Reçu de paiement', [t], true)
              .catch(() => notify('Impossible de générer le reçu. Réessayez.'))
              .finally(() => setSharing(false));
          }}
        />
      )}
      <Button
        title="Mes courses"
        variant="secondary"
        icon="file"
        onPress={() =>
          role === 'passenger' ? router.dismissTo('/receipts') : router.push('/my-payments')
        }
      />
      <Info>
        {cash
          ? 'Course enregistrée dans votre historique et celui du chauffeur.'
          : `Le chauffeur a reçu un SMS de confirmation (montant + référence TT-${t.split?.ride ?? t.id}). Simulation.`}
      </Info>
      <Button
        title="Signaler un problème"
        variant="ghost"
        // Passengers get the AI support agent with this ride attached; drivers the form.
        onPress={() =>
          role === 'passenger'
            ? router.push({ pathname: '/passenger/support-chat', params: { ride: t.id } })
            : router.push({
                pathname: '/requests/new',
                params: { paymentId: t.id, category: 'payment' },
              })
        }
      />
      {role === 'driver' && !cash && (
        <Button
          title="Voir la confirmation chauffeur"
          variant="ghost"
          onPress={() => router.replace(`/received/${t.id}`)}
        />
      )}
    </Screen>
  );
}
