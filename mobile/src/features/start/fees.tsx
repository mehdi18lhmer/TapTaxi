// Fees shown in the app: 0–3 MAD by day by meter fare, +0,50 MAD at night (20:00–06:00).
// The driver pays no fee and earns 10 % of the passenger fee on digital payments.
import { useState } from 'react';
import { View } from 'react-native';
import { Card, Divider, Info, Row, Screen, Txt } from '@/components/ui';
import { driverBonus, FEE_TIERS, isNight, money, NIGHT_SURCHARGE } from '@/lib/model';
import { colors as c, fonts, space } from '@/theme';

const range = (i: number) => {
  const from = FEE_TIERS[i][0] / 100;
  const to = FEE_TIERS[i + 1]?.[0];
  if (i === 0) return `Moins de ${to! / 100}`;
  return to ? `${from}–${to / 100}` : `${from} et plus`;
};

export function Fees() {
  const [now] = useState(() => Date.now());
  const night = isNight(now);
  return (
    <Screen>
      <Txt variant="title">
        Nos frais
        <Txt variant="title" style={{ color: c.red }}>
          .
        </Txt>
      </Txt>
      <Txt variant="caption">
        Vous payez le compteur officiel du taxi, plus de petits frais de service, toujours affichés
        avant de payer. Les chauffeurs ne paient aucun frais.
      </Txt>
      <Card style={{ gap: 0, padding: space.md }}>
        <Row style={{ paddingBottom: space.sm }}>
          {['Compteur (MAD)', 'Jour', 'Nuit', 'Bonus chauffeur'].map((h) => (
            <Txt
              key={h}
              variant="small"
              style={{ flex: 1, fontFamily: fonts.semibold, color: c.ink }}
            >
              {h}
            </Txt>
          ))}
        </Row>
        {FEE_TIERS.map(([, fee], i) => (
          <View key={i}>
            <Divider />
            <Row style={{ paddingVertical: space.md }}>
              <Txt variant="caption" style={{ flex: 1, color: c.ink }}>
                {range(i)}
              </Txt>
              <Txt
                variant="caption"
                style={{
                  flex: 1,
                  color: night ? c.muted : c.ink,
                  fontFamily: night ? fonts.regular : fonts.semibold,
                }}
              >
                {money(fee)}
              </Txt>
              <Txt
                variant="caption"
                style={{
                  flex: 1,
                  color: night ? c.ink : c.muted,
                  fontFamily: night ? fonts.semibold : fonts.regular,
                }}
              >
                {money(fee + NIGHT_SURCHARGE)}
              </Txt>
              <Txt variant="caption" style={{ flex: 1, color: c.green }}>
                {money(driverBonus(fee))}
              </Txt>
            </Row>
          </View>
        ))}
      </Card>
      <Info>
        Nuit : de 20:00 à 06:00 (
        {night ? 'tarif de nuit en ce moment' : 'tarif de jour en ce moment'}). Paiement partagé :
        les frais s’appliquent à la part de chacun. Course en espèces : pas de frais.
      </Info>
    </Screen>
  );
}
