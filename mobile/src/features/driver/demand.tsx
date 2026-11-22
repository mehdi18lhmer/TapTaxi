// Demand prediction map: areas coloured low → high for now, +30 and +60 minutes.
import { useState } from 'react';
import { View } from 'react-native';
import {
  Badge,
  Card,
  Chips,
  Divider,
  Heading,
  Icon,
  Info,
  Notice,
  Row,
  Screen,
  Stack,
  Txt,
} from '@/components/ui';
import { CityMap } from '@/components/city-map';
import { forecast, hotspot, INPUTS, levelLabel, rainExpected } from '@/lib/demand';
import type { DemandLevel } from '@/lib/demand';
import { timeLabel } from '@/lib/model';
import { colors as c, radius, space } from '@/theme';

const COLORS: Record<DemandLevel, string> = {
  low: '#9DB8A0',
  medium: '#E8B23A',
  high: '#E8742A',
  peak: '#D91E24',
};
export const demandColor = (level: DemandLevel) => COLORS[level];

export function DemandMap() {
  const [ahead, setAhead] = useState(0);
  const [now] = useState(() => Date.now());
  const [selected, setSelected] = useState<string | null>(null);
  const zones = forecast(now, ahead);
  const hot = hotspot(now);
  const pick = zones.find((z) => z.id === selected) ?? zones[0];

  return (
    <Screen>
      <Notice tone={hot.zone.score >= 60 ? 'warning' : 'neutral'} icon="bell" title={hot.message}>
        {hot.zone.reason}. Placez-vous à proximité pour recevoir plus de courses garanties.
      </Notice>
      <Chips
        value={String(ahead)}
        onChange={(v) => {
          setAhead(Number(v));
          setSelected(null);
        }}
        items={[
          { value: '0', label: `Maintenant · ${timeLabel(now)}` },
          { value: '30', label: '+30 min' },
          { value: '60', label: '+60 min' },
        ]}
      />
      <CityMap
        height={330}
        onZonePress={setSelected}
        zones={zones.map((z) => ({
          id: z.id,
          x: z.x,
          y: z.y,
          r: z.r,
          color: COLORS[z.level],
          label: z.score >= 60 || z.id === pick.id ? z.name : undefined,
          strong: z.id === pick.id,
        }))}
        markers={[{ id: 'me', kind: 'taxi', x: 46, y: 45, label: 'Vous' }]}
      />
      <Row style={{ justifyContent: 'space-between' }}>
        {(Object.keys(COLORS) as DemandLevel[]).map((l) => (
          <Row key={l} style={{ gap: space.xs }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: radius.pill,
                backgroundColor: COLORS[l],
              }}
            />
            <Txt variant="small">{levelLabel[l]}</Txt>
          </Row>
        ))}
      </Row>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="headline" style={{ flex: 1 }}>
            {pick.name}
          </Txt>
          <Badge
            neutral={pick.level === 'low'}
          >{`${levelLabel[pick.level]} · ${pick.score}/100`}</Badge>
        </Row>
        <Txt variant="caption">
          {pick.reason}
          {pick.peakIn ? ` · pic dans ${pick.peakIn} min` : ''}
        </Txt>
      </Card>

      <Heading title="Classement des zones" />
      <Card style={{ gap: 0, paddingVertical: space.xs }}>
        {zones.map((z, i) => (
          <View key={z.id}>
            {i > 0 && <Divider />}
            <Row style={{ paddingVertical: space.md }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: radius.pill,
                  backgroundColor: COLORS[z.level],
                }}
              />
              <Stack gap={0} style={{ flex: 1 }}>
                <Txt variant="headline" style={{ fontSize: 13 }}>
                  {z.name}
                </Txt>
                <Txt variant="caption" style={{ fontSize: 11 }}>
                  {z.reason}
                </Txt>
              </Stack>
              <Txt variant="headline" style={{ fontSize: 14, fontVariant: ['tabular-nums'] }}>
                {z.score}
              </Txt>
            </Row>
          </View>
        ))}
      </Card>

      <Card>
        <Row>
          <Icon name="sparkles" color={c.red} />
          <Txt variant="headline" style={{ flex: 1 }}>
            Comment l’IA prédit la demande
          </Txt>
        </Row>
        {INPUTS.map((input) => (
          <Row key={input} style={{ gap: space.sm }}>
            <Icon name="check" size={14} color={c.green} />
            <Txt variant="caption" style={{ flex: 1 }}>
              {input}
            </Txt>
          </Row>
        ))}
        <Txt variant="small">
          Résultat : un score par zone pour les 30 à 60 prochaines minutes.
          {rainExpected(now) ? ' Pluie prévue : demande plus forte.' : ''}
        </Txt>
      </Card>
      <Info>Démo : données fictives pour Casablanca (aéroport, gares, universités).</Info>
    </Screen>
  );
}
