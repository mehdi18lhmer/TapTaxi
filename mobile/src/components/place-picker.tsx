import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Card, Divider, Icon, Row, Stack, Txt } from '@/components/ui';
import type { IconName } from '@/components/ui';
import type { Place, PlaceKind } from '@/lib/places';
import { colors as c, radius, space } from '@/theme';

const kindIcon: Record<PlaceKind, IconName> = {
  airport: 'plane',
  station: 'train',
  hotel: 'bed',
  university: 'file',
  district: 'pin',
  mall: 'gift',
};

/** A short list of places with a radio mark; shows `initial` items until "Voir plus". */
export function PlacePicker({
  places,
  value,
  onChange,
  initial = 5,
  exclude,
}: {
  places: readonly Place[];
  value: string | null;
  onChange: (id: string) => void;
  initial?: number;
  exclude?: string;
}) {
  const [all, setAll] = useState(false);
  const list = places.filter((p) => p.id !== exclude);
  // Keep the selected place visible even when the list is folded.
  const shown = all
    ? list
    : [...list.slice(0, initial), ...list.slice(initial).filter((p) => p.id === value)];
  return (
    <Card style={{ gap: 0, paddingVertical: space.xs }}>
      {shown.map((p, i) => (
        <Pressable
          key={p.id}
          accessibilityRole="radio"
          accessibilityState={{ checked: p.id === value }}
          accessibilityLabel={`${p.name}, ${p.area}`}
          onPress={() => onChange(p.id)}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          {i > 0 && <Divider />}
          <Row style={{ paddingVertical: space.md }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.md,
                backgroundColor: p.id === value ? c.redSoft : c.background,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={kindIcon[p.kind]} size={18} color={p.id === value ? c.red : c.ink} />
            </View>
            <Stack gap={0} style={{ flex: 1 }}>
              <Txt variant="headline" style={{ fontSize: 14 }}>
                {p.name}
              </Txt>
              <Txt variant="caption" style={{ fontSize: 11 }}>
                {p.area}
              </Txt>
            </Stack>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: radius.pill,
                borderWidth: 1.5,
                borderColor: p.id === value ? c.red : c.line,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {p.id === value && (
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: radius.pill,
                    backgroundColor: c.red,
                  }}
                />
              )}
            </View>
          </Row>
        </Pressable>
      ))}
      {list.length > initial && (
        <>
          <Divider />
          <Pressable
            accessibilityRole="button"
            onPress={() => setAll((v) => !v)}
            style={{ paddingVertical: space.md }}
          >
            <Txt variant="caption" style={{ textAlign: 'center', color: c.ink }}>
              {all ? 'Voir moins' : `Voir les ${list.length} lieux`}
            </Txt>
          </Pressable>
        </>
      )}
    </Card>
  );
}
