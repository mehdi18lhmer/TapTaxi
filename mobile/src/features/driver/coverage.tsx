// Social coverage (CNSS & AMO): status, monthly contribution, pay from the wallet, history.
import { Alert, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  Detail,
  Divider,
  Heading,
  Icon,
  Info,
  Row,
  Screen,
  Stack,
  Txt,
} from '@/components/ui';
import { balance, dateLabel, money } from '@/lib/model';
import {
  contributionLabel,
  contributions,
  COVERAGE,
  daysUntilDue,
  dueDate,
  paidThisMonth,
  payContribution,
} from '@/lib/coverage';
import { useStore } from '@/lib/store';
import { uid } from '@/lib/ids';
import { successFeedback } from '@/lib/haptics';
import { colors as c, space } from '@/theme';

export function Coverage() {
  const { state, mutate, busy } = useStore();
  const paid = paidThisMonth(state);
  const history = contributions(state);
  const pay = () =>
    Alert.alert(
      'Payer la cotisation ?',
      `${money(COVERAGE.monthly)} MAD seront prélevés sur votre portefeuille (solde ${money(balance(state))} MAD). Simulation.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => {
            const id = uid();
            void mutate((s) => payContribution(s, id)).then((ok) => ok && void successFeedback());
          },
        },
      ],
    );
  return (
    <Screen>
      <Card dark>
        <Icon name="shield" color={c.red} size={32} />
        <Txt variant="heading" style={{ color: c.surface }}>
          Vous et votre famille, couverts.
        </Txt>
        <Txt variant="caption" style={{ color: c.lightOnDark }}>
          TapTaxi vous aide à vous inscrire à la CNSS et à l’AMO, et à payer vos cotisations depuis
          votre portefeuille.
        </Txt>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="headline">Statut</Txt>
          <Badge>Inscrit · AMO active</Badge>
        </Row>
        <Detail label="N° CNSS" value={COVERAGE.cnssNumber} />
        <Detail label="Régime" value={COVERAGE.regime} />
        <Detail label="Bénéficiaires" value={COVERAGE.beneficiaries} />
        <Detail label="Inscrit depuis" value={COVERAGE.registeredSince} />
        <Divider />
        {['Dossier d’inscription envoyé', 'Immatriculation CNSS validée', 'Droits AMO ouverts'].map(
          (step) => (
            <Row key={step} style={{ gap: space.sm }}>
              <Icon name="check" size={16} color={c.green} />
              <Txt variant="caption" style={{ flex: 1, color: c.ink }}>
                {step}
              </Txt>
            </Row>
          ),
        )}
      </Card>

      <Card>
        <Txt variant="caption">Cotisation mensuelle</Txt>
        <Txt selectable variant="money" style={{ fontSize: 38 }}>
          {money(COVERAGE.monthly)}
          <Txt> MAD</Txt>
        </Txt>
        <Detail
          label="Ce mois-ci"
          value={paid ? 'Payée ✓' : `À payer avant le ${dateLabel(dueDate())}`}
        />
        {!paid && <Detail label="Échéance" value={`Dans ${daysUntilDue()} jours`} />}
        <Button
          title={paid ? 'Cotisation du mois payée' : 'Payer depuis mon portefeuille'}
          icon="wallet"
          disabled={paid}
          loading={busy}
          onPress={pay}
        />
        <Txt variant="small">
          {contributionLabel()} · solde disponible {money(balance(state))} MAD
        </Txt>
      </Card>

      <Heading title="Historique des paiements" />
      <Card style={{ gap: 0, paddingVertical: space.xs }}>
        {history.length ? (
          history.map((t, i) => (
            <View key={t.id}>
              {i > 0 && <Divider />}
              <Row style={{ paddingVertical: space.md }}>
                <Icon name="shield" size={18} color={c.green} />
                <Stack gap={0} style={{ flex: 1 }}>
                  <Txt variant="headline" style={{ fontSize: 13 }}>
                    {t.label}
                  </Txt>
                  <Txt variant="caption" style={{ fontSize: 11 }}>
                    Payée le {dateLabel(t.at, { day: 'numeric', month: 'long' })} · portefeuille
                  </Txt>
                </Stack>
                <Txt variant="headline" style={{ fontSize: 14 }}>
                  {money(-t.credit)}
                </Txt>
              </Row>
            </View>
          ))
        ) : (
          <Txt variant="caption" style={{ paddingVertical: space.md }}>
            Aucune cotisation payée pour le moment.
          </Txt>
        )}
      </Card>
      <Info>
        Démo : écrans seulement. Le partenaire qui gère l’inscription et les cotisations reste à
        choisir.
      </Info>
    </Screen>
  );
}
