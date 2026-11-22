import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Icon, Row, Stack, Txt } from '@/components/ui';
import { colors as c, radius, space } from '@/theme';
import { dateLabel, methodLabel, money, timeLabel } from '@/lib/model';
import type { Transaction } from '@/lib/model';
export function Transactions({ items, dates = false }: { items: Transaction[]; dates?: boolean }) {
  return (
    <Stack gap={0}>
      {items.map((t, i) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t.label} ${t.id}, ${money(t.credit)} MAD`}
          key={t.id}
          onPress={() =>
            router.push(
              t.kind === 'payment' || t.kind === 'cash'
                ? `/transaction/${t.id}`
                : t.kind === 'withdrawal'
                  ? `/withdrawal/${t.id}`
                  : t.kind === 'contribution'
                    ? '/coverage'
                    : '/owner',
            )
          }
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            paddingVertical: space.lg,
            borderBottomWidth: i < items.length - 1 ? 1 : 0,
            borderBottomColor: c.line,
          })}
        >
          <Row>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: radius.pill,
                backgroundColor:
                  t.kind === 'cash' ? c.warm : t.credit > 0 ? c.redSoft : c.background,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon
                name={
                  t.kind === 'payment'
                    ? t.split
                      ? 'users'
                      : t.tip
                        ? 'gift'
                        : 'taxi'
                    : t.kind === 'cash'
                      ? 'cash'
                      : t.kind === 'contribution'
                        ? 'shield'
                        : 'withdraw'
                }
                size={20}
              />
            </View>
            <Stack gap={space.xs} style={{ flex: 1 }}>
              <Txt variant="headline" style={{ fontSize: 13 }}>
                {t.label}
                {t.kind === 'payment' || t.kind === 'cash' ? ` #${t.id}` : ''}
              </Txt>
              <Txt variant="caption" style={{ fontSize: 10 }}>
                {dates ? `${dateLabel(t.at)} · ` : ''}
                {timeLabel(t.at)} · {methodLabel(t.method)}
              </Txt>
              {t.kind === 'payment' && (
                <Txt variant="small" style={{ fontSize: 10, color: c.green }}>
                  Course {money(t.fare)} + votre bonus 10 % {money(t.fee)}
                  {t.tip ? ` + pourboire ${money(t.tip)}` : ''}
                </Txt>
              )}
            </Stack>
            {t.kind === 'cash' ? (
              <Stack gap={0} style={{ alignItems: 'flex-end' }}>
                <Txt variant="headline" style={{ fontSize: 14, fontVariant: ['tabular-nums'] }}>
                  {money(t.fare)}
                </Txt>
                <Txt variant="small" style={{ fontSize: 9 }}>
                  espèces
                </Txt>
              </Stack>
            ) : (
              <Txt
                selectable
                variant="headline"
                style={{
                  color: t.credit >= 0 ? c.green : c.ink,
                  fontSize: 14,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {t.credit >= 0 ? '+' : '−'}
                {money(Math.abs(t.credit))}
              </Txt>
            )}
          </Row>
        </Pressable>
      ))}
    </Stack>
  );
}
