import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import {
  Badge,
  Card,
  Heading,
  Icon,
  IconButton,
  Info,
  Logo,
  Row,
  Screen,
  Stack,
  Txt,
  Notice,
  Shortcut,
} from '@/components/ui';
import { Transactions } from '@/components/transactions';
import { balance, dateLabel, money } from '@/lib/model';
import { useStore } from '@/lib/store';
import { tapFeedback } from '@/lib/haptics';
import { colors as c, radius, space } from '@/theme';
import { DAILY_GOAL, dailyGoalProgress, todaySummary } from '@/lib/ledger';
import { IncomingRequest } from './incoming-request';
import { useRides } from '@/lib/rides-store';
import { activeDriverRide, incomingRequests, statusLabel } from '@/lib/rides';
import { hotspot } from '@/lib/demand';
import { place } from '@/lib/places';
export function Home() {
  const { state } = useStore();
  const { rides } = useRides();
  const [openedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const active = activeDriverRide(rides);
  const incoming = incomingRequests(rides)[0];
  const hot = hotspot(now);
  const { payments: today, earned } = todaySummary(state);
  const goal = dailyGoalProgress(earned);
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Logo />
        <Badge neutral>Mode démo</Badge>
        <IconButton
          label="Notifications"
          icon="bell"
          badge={state.readNotifications ? undefined : '2'}
          onPress={() => router.push('/notifications')}
        />
      </Row>
      <Txt variant="caption">Petit taxi n° 1287 · Casablanca</Txt>
      {active ? (
        <Notice
          tone="dark"
          icon="taxi"
          title={statusLabel[active.status]}
          onPress={() => router.push(`/job/${active.id}`)}
        >
          {active.passengerName} · {place(active.pickup).name} → {place(active.destination).name}
        </Notice>
      ) : incoming ? (
        <IncomingRequest ride={incoming} />
      ) : null}
      <Notice
        icon="flame"
        tone={hot.zone.score >= 60 ? 'warning' : 'neutral'}
        title={hot.message}
        onPress={() => router.push('/demand')}
      >
        {hot.zone.reason} · voir la carte de la demande
      </Notice>
      <Card dark>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="caption" style={{ color: c.lightOnDark }}>
            Gains d’aujourd’hui
          </Txt>
          <View
            style={{
              backgroundColor: c.red,
              paddingHorizontal: space.sm,
              paddingVertical: space.xs,
              borderRadius: radius.pill,
            }}
          >
            <Txt variant="small" style={{ color: c.surface }}>
              {dateLabel(openedAt, { weekday: 'short', day: 'numeric', month: 'short' })}
            </Txt>
          </View>
        </Row>
        <Row style={{ alignItems: 'baseline' }}>
          <Txt selectable variant="money" style={{ color: c.surface }}>
            {money(earned)}
          </Txt>
          <Txt style={{ color: c.red }}>MAD</Txt>
        </Row>
        <Row>
          <View
            style={{
              flex: 1,
              backgroundColor: c.darkSurface,
              padding: space.md,
              borderRadius: radius.md,
              gap: space.xs,
            }}
          >
            <Txt variant="small" style={{ color: c.lightOnDark }}>
              Paiements reçus
            </Txt>
            <Txt variant="headline" style={{ color: c.surface }}>
              {today.length}
            </Txt>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ouvrir le portefeuille"
            onPress={() => router.navigate('/(tabs)/wallet')}
            style={{
              flex: 1,
              backgroundColor: c.darkSurface,
              padding: space.md,
              borderRadius: radius.md,
              gap: space.xs,
            }}
          >
            <Txt variant="small" style={{ color: c.lightOnDark }}>
              Solde portefeuille
            </Txt>
            <Txt variant="headline" style={{ color: c.surface }}>
              {money(balance(state))}
            </Txt>
          </Pressable>
        </Row>
      </Card>
      <Pressable
        testID="collect-payment"
        accessibilityRole="button"
        accessibilityLabel="Encaisser un paiement"
        onPress={() => {
          void tapFeedback();
          router.push('/amount');
        }}
        style={({ pressed }) => ({
          backgroundColor: c.red,
          borderRadius: radius.card,
          padding: space.xl,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Row>
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: radius.pill,
              backgroundColor: c.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="qr" color={c.red} size={29} />
          </View>
          <Stack gap={0} style={{ flex: 1 }}>
            <Txt variant="heading" style={{ color: c.surface, fontSize: 25 }}>
              Encaisser
            </Txt>
            <Txt
              style={{ color: c.surface, fontSize: 16, textAlign: 'left', writingDirection: 'rtl' }}
            >
              استلام الدفع
            </Txt>
          </Stack>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.pill,
              backgroundColor: c.surface,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Icon name="arrow" color={c.red} />
          </View>
        </Row>
      </Pressable>
      <Row style={{ gap: space.xs }}>
        <Shortcut icon="chart" label="Mes gains" onPress={() => router.push('/earnings')} />
        <Shortcut icon="map" label="Demande" onPress={() => router.push('/demand')} />
        <Shortcut icon="taxi" label="Courses" onPress={() => router.navigate('/rides')} />
        <Shortcut icon="shield" label="CNSS · AMO" onPress={() => router.push('/coverage')} />
      </Row>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="headline" style={{ fontSize: 14 }}>
            Objectif du jour
          </Txt>
          <Txt variant="small">
            {money(earned)} / {money(DAILY_GOAL)} MAD
          </Txt>
        </Row>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Objectif du jour"
          accessibilityValue={{ min: 0, max: 100, now: goal.percent }}
          style={{
            height: 12,
            backgroundColor: c.background,
            borderRadius: radius.pill,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${goal.percent}%`,
              height: '100%',
              backgroundColor: c.ink,
              borderRadius: radius.pill,
            }}
          />
        </View>
        <Txt variant="caption" style={{ fontSize: 11 }}>
          {goal.reached
            ? 'Bravo, votre objectif est atteint !'
            : `Encore environ ${goal.paymentsLeft} paiements pour l’atteindre`}
        </Txt>
      </Card>
      <Card style={{ paddingBottom: space.sm }}>
        <Heading
          title="Paiements récents"
          action="Tout voir"
          onPress={() => router.push('/history')}
        />
        <Transactions items={state.transactions.filter((t) => t.kind === 'payment').slice(0, 3)} />
      </Card>
      <Info>Démo sur cet appareil · aucun paiement réel.</Info>
    </Screen>
  );
}
