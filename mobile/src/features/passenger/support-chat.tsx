// Multilingual support agent for passengers, opened from a ride ("Signaler un problème") or
// from Help. The language is picked from each message; the ride details are attached.
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, Card, Detail, Icon, Row, Stack, Txt } from '@/components/ui';
import { Bubble, ChatScroll, Composer, Suggestions, Typing } from '@/components/chat';
import { dateLabel, methodLabel, money, passengerFeeOf, passengerPaid } from '@/lib/model';
import { checkFare, rangeLabel } from '@/lib/fare';
import { rideForPayment } from '@/lib/rides';
import { useRides } from '@/lib/rides-store';
import { useStore } from '@/lib/store';
import { agentReply, followUpText, GREETING, langLabel } from '@/lib/support-agent';
import type { AgentReply, Lang, RideContext } from '@/lib/support-agent';
import { createRequest } from '@/lib/support';
import { useSupport } from '@/lib/support-store';
import { uid } from '@/lib/ids';
import { colors as c, space } from '@/theme';

interface Message {
  id: string;
  from: 'me' | 'bot' | 'team';
  text: string;
  reply?: AgentReply;
  ticket?: string;
}

const EXAMPLES = [
  { text: 'J’ai oublié mon téléphone dans le taxi' },
  { text: 'I think I was overcharged' },
  { text: 'كيف أقسم ثمن الرحلة مع أصدقائي؟' },
  { text: 'Bghit nrecharge l’wallet, kifach?' },
  { text: 'Je veux un remboursement' },
];

export function SupportChat() {
  const { ride: rideParam } = useLocalSearchParams<{ ride?: string }>();
  const { state } = useStore();
  const { rides } = useRides();
  const { update: updateSupport } = useSupport();
  const inset = useSafeAreaInsets();
  const t = rideParam ? state.transactions.find((x) => x.id === rideParam) : undefined;
  const linked = t ? rideForPayment(rides, t.split?.ride ?? t.id) : undefined;
  const context: RideContext | undefined = useMemo(
    () =>
      t && {
        id: `TT-${t.split?.ride ?? t.id}`,
        taxi: '1287',
        driver: 'Youssef B.',
        date: dateLabel(t.at, {
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        }),
        fare: `${money(t.fare)} MAD`,
        fee: `${money(passengerFeeOf(t))} MAD`,
        tip: `${money(t.tip)} MAD`,
        total: `${money(passengerPaid(t))} MAD`,
        method: methodLabel(t.method),
        estimate: linked ? rangeLabel(linked.estimate) : undefined,
        fareOk: linked
          ? checkFare(linked.meterFare ?? t.fare, linked.estimate) !== 'high'
          : undefined,
      },
    [t, linked],
  );
  const [lang, setLang] = useState<Lang>('fr');
  const [messages, setMessages] = useState<Message[]>([
    { id: 'hello', from: 'bot', text: GREETING.fr },
  ]);
  const [typing, setTyping] = useState(false);

  const handOff = async (text: string, reply: AgentReply) => {
    const id = uid();
    const body = text.length >= 10 ? text : `${text} (signalé à l’assistant)`;
    let ticket: string | undefined;
    await updateSupport((s) => {
      const result = createRequest(
        s,
        {
          role: 'passenger',
          category: reply.topic === 'refund' || reply.topic === 'dispute' ? 'payment' : 'other',
          subject:
            reply.topic === 'safety'
              ? 'Signalement de sécurité'
              : reply.topic === 'refund'
                ? 'Demande de remboursement'
                : reply.topic === 'dispute'
                  ? 'Litige sur une course'
                  : 'Parler à une personne',
          body: context ? `${body}\n\nCourse ${context.id} · taxi n° ${context.taxi}` : body,
          paymentId: t?.id,
        },
        id,
      );
      ticket = result.request.id;
      return result.state;
    });
    return ticket;
  };

  const send = (text: string) => {
    setMessages((m) => [...m, { id: uid(), from: 'me', text }]);
    setTyping(true);
    setTimeout(() => {
      const reply = agentReply(text, context, lang);
      setLang(reply.lang);
      void (async () => {
        const ticket = reply.handoff ? await handOff(text, reply) : undefined;
        setTyping(false);
        setMessages((m) => [
          ...m,
          { id: uid(), from: reply.handoff ? 'team' : 'bot', text: reply.text, reply, ticket },
        ]);
      })();
    }, 700);
  };

  const askPerson = () =>
    send(
      lang === 'en'
        ? 'I want to talk to a person'
        : lang === 'ar'
          ? 'أريد التحدث مع موظف'
          : lang === 'darija'
            ? 'Bghit nhder m3a chi wa7ed men l’équipe'
            : 'Je veux parler à une personne',
    );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ChatScroll deps={messages.length + (typing ? 1 : 0)}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Badge neutral>Langue détectée : {langLabel[lang]}</Badge>
          <Txt variant="small">FR · AR · Darija · EN</Txt>
        </Row>
        {context && (
          <Card style={{ gap: space.sm, padding: space.lg }}>
            <Row>
              <Icon name="taxi" size={18} />
              <Txt variant="headline" style={{ fontSize: 14, flex: 1 }}>
                Course jointe · {context.id}
              </Txt>
            </Row>
            <Detail label="Taxi · chauffeur" value={`n° ${context.taxi} · ${context.driver}`} />
            <Detail label="Date" value={context.date} />
            <Detail label="Total payé" value={`${context.total} · ${context.method}`} />
          </Card>
        )}
        {messages.map((m) => (
          <Bubble
            key={m.id}
            from={m.from}
            footer={
              <>
                {m.reply?.action && (
                  <Row style={{ gap: space.xs }}>
                    <Icon name="check" size={14} color={c.green} />
                    <Txt variant="small" style={{ color: c.green }}>
                      {m.reply.action}
                    </Txt>
                  </Row>
                )}
                {m.ticket && (
                  <Stack gap={space.xs}>
                    <Txt variant="small" style={{ color: c.green }}>
                      {followUpText(m.reply?.lang ?? 'fr')} · demande {m.ticket}
                    </Txt>
                    <Button
                      variant="secondary"
                      title="Suivre ma demande"
                      onPress={() => router.push(`/requests/${m.ticket}`)}
                    />
                  </Stack>
                )}
                {m.reply?.unsure && (
                  <Button
                    variant="secondary"
                    title="Parler à une personne"
                    icon="person"
                    onPress={askPerson}
                  />
                )}
              </>
            }
          >
            {m.text}
          </Bubble>
        ))}
        {typing && <Typing />}
      </ChatScroll>
      <View
        style={{
          paddingHorizontal: space.xl,
          paddingTop: space.sm,
          paddingBottom: Math.max(inset.bottom, space.lg),
          gap: space.sm,
          backgroundColor: c.background,
        }}
      >
        <Suggestions items={EXAMPLES} onPick={send} />
        <Composer placeholder="Écrivez dans votre langue…" onSend={send} disabled={typing} />
        <Txt variant="small" style={{ textAlign: 'center' }}>
          Assistant IA (démo). Remboursements, litiges et sécurité : toujours une personne.
        </Txt>
      </View>
    </KeyboardAvoidingView>
  );
}
