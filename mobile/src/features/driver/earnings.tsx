// Financial management: earnings today / 7 days / month, cash vs digital, the 10 % bonus,
// what went to the owner, wallet balance + withdraw, downloadable income statement.
import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Card,
  Chips,
  Detail,
  Divider,
  Heading,
  Info,
  Row,
  Screen,
  Stack,
  Txt,
} from '@/components/ui';
import { Transactions } from '@/components/transactions';
import { balance, money } from '@/lib/model';
import { earningsSummary, periodLabel } from '@/lib/ledger';
import type { EarningsPeriod } from '@/lib/ledger';
import { sharePdf } from '@/lib/pdf';
import { useStore } from '@/lib/store';
import { colors as c, radius, space } from '@/theme';

export function Earnings() {
  const { state, notify } = useStore();
  const [period, setPeriod] = useState<EarningsPeriod>('week');
  const [sharing, setSharing] = useState(false);
  const e = earningsSummary(state, period);

  return (
    <Screen>
      <Chips
        value={period}
        onChange={(v) => setPeriod(v as EarningsPeriod)}
        items={[
          { value: 'today', label: 'Aujourd’hui' },
          { value: 'week', label: 'Semaine' },
          { value: 'month', label: 'Mois' },
        ]}
      />
      <Card dark>
        <Txt variant="caption" style={{ color: c.lightOnDark }}>
          Revenus · {periodLabel[period].toLowerCase()}
        </Txt>
        <Txt selectable variant="money" style={{ color: c.surface, fontSize: 42 }}>
          {money(e.total)}
          <Txt style={{ color: c.red }}> MAD</Txt>
        </Txt>
        <Txt variant="caption" style={{ color: c.lightOnDark }}>
          {e.rides} courses · {e.activeDays} jour{e.activeDays > 1 ? 's' : ''} actif
          {e.activeDays > 1 ? 's' : ''}
        </Txt>
        {/* Digital vs cash */}
        <View
          style={{
            height: 12,
            borderRadius: radius.pill,
            backgroundColor: c.darkSurface,
            overflow: 'hidden',
            flexDirection: 'row',
          }}
        >
          <View style={{ width: `${e.digitalShare}%`, backgroundColor: c.red }} />
        </View>
        <Row style={{ justifyContent: 'space-between' }}>
          <Stack gap={0}>
            <Txt variant="small" style={{ color: c.lightOnDark }}>
              TapTaxi (numérique) · {e.digitalShare} %
            </Txt>
            <Txt variant="headline" style={{ color: c.surface }}>
              {money(e.digitalTotal)}
            </Txt>
          </Stack>
          <Stack gap={0} style={{ alignItems: 'flex-end' }}>
            <Txt variant="small" style={{ color: c.lightOnDark }}>
              Espèces · {e.cashCount} courses
            </Txt>
            <Txt variant="headline" style={{ color: c.surface }}>
              {money(e.cashTotal)}
            </Txt>
          </Stack>
        </Row>
      </Card>

      <Card>
        <Detail
          label="Compteurs payés avec TapTaxi"
          value={`${money(e.digitalTotal - e.tips - e.bonus)} MAD`}
        />
        <Detail label="Votre bonus 10 % des frais" value={`+${money(e.bonus)} MAD`} />
        <Detail label="Pourboires (100 % pour vous)" value={`+${money(e.tips)} MAD`} />
        <Detail label="Courses en espèces" value={`${money(e.cashTotal)} MAD`} />
        <Divider />
        <Detail label="Total gagné" value={`${money(e.total)} MAD`} strong />
        <Detail label="Versé au propriétaire" value={`−${money(e.ownerPaid)} MAD`} />
        {e.contributions > 0 && (
          <Detail label="Cotisations CNSS / AMO" value={`−${money(e.contributions)} MAD`} />
        )}
        <Divider />
        <Detail label="Il vous reste" value={`${money(e.net)} MAD`} strong />
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Stack gap={0}>
            <Txt variant="caption">Solde du portefeuille</Txt>
            <Txt variant="heading">{money(balance(state))} MAD</Txt>
          </Stack>
        </Row>
        <Row style={{ gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Button title="Retirer" icon="withdraw" onPress={() => router.push('/withdraw')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              title="Propriétaire"
              onPress={() => router.push('/owner')}
            />
          </View>
        </Row>
        <Txt variant="small">Retrait vers la banque, un wallet mobile ou un agent cash.</Txt>
      </Card>

      <Button
        variant="secondary"
        title="Télécharger mon relevé de revenus (PDF)"
        icon="share"
        loading={sharing}
        onPress={() => {
          setSharing(true);
          void sharePdf(`Relevé de revenus · ${periodLabel[period]}`, e.items)
            .catch(() => notify('Le PDF n’a pas pu être créé. Réessayez.'))
            .finally(() => setSharing(false));
        }}
      />
      <Button variant="ghost" title="Relevés mensuels" onPress={() => router.push('/statements')} />

      <Card style={{ paddingBottom: space.sm }}>
        <Heading title="Détail des courses" />
        <Transactions items={e.items.slice(0, 12)} dates={period !== 'today'} />
      </Card>
      <Info>Les courses en espèces sont comptées dans vos revenus, sans frais ni bonus.</Info>
    </Screen>
  );
}
