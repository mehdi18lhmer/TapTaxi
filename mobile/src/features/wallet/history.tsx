import { useState } from 'react';
import { Card, Chips, Input, Screen, Txt } from '@/components/ui';
import { Transactions } from '@/components/transactions';
import { money } from '@/lib/model';
import { useStore } from '@/lib/store';
import { colors as c, space } from '@/theme';
import { filterHistory, sumCredit } from '@/lib/ledger';
import type { HistoryPeriod } from '@/lib/ledger';
export function History() {
  const { state } = useStore();
  const [period, setPeriod] = useState<HistoryPeriod>('week');
  const [query, setQuery] = useState('');
  const items = filterHistory(state, period, query);
  return (
    <Screen>
      <Chips
        value={period}
        onChange={(v) => setPeriod(v as HistoryPeriod)}
        items={[
          { value: 'week', label: 'Cette semaine' },
          { value: 'month', label: 'Ce mois' },
          { value: 'all', label: 'Tout' },
        ]}
      />
      <Input
        label="Rechercher un paiement"
        placeholder="Référence ou type de paiement"
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
      />
      <Card dark>
        <Txt variant="caption" style={{ color: c.lightOnDark }}>
          Revenus sur la période
        </Txt>
        <Txt selectable variant="money" style={{ fontSize: 38, color: c.surface }}>
          {money(sumCredit(items.filter((t) => t.kind === 'payment')))}
          <Txt style={{ color: c.lightOnDark }}> MAD</Txt>
        </Txt>
      </Card>
      {items.length ? (
        <Card style={{ paddingVertical: space.xs }}>
          <Transactions items={items} dates />
        </Card>
      ) : (
        <Card>
          <Txt variant="heading">Aucun paiement trouvé</Txt>
          <Txt variant="caption">Essayez une autre référence ou une autre période.</Txt>
        </Card>
      )}
    </Screen>
  );
}
