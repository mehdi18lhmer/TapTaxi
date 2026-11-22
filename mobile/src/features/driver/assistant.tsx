// TapTaxi Assistant (driver tab): chat and voice in Darija about the driver's money.
// It can prepare a payment, but nothing moves until the driver taps "Confirmer".
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import {
  Badge,
  Button,
  Card,
  Chips,
  Detail,
  Divider,
  Icon,
  Notice,
  Option,
  Row,
  Stack,
  Txt,
} from '@/components/ui';
import { Bubble, ChatScroll, Composer, Suggestions, Typing } from '@/components/chat';
import { balance, money, withdraw } from '@/lib/model';
import type { PayoutMethod } from '@/lib/model';
import { proactiveReminders, replyTo, SAMPLE_PROMPTS, WITHDRAW_OPTIONS } from '@/lib/assistant';
import type { AssistantCard, AssistantReply } from '@/lib/assistant';
import { payContribution } from '@/lib/coverage';
import { payOwner } from '@/lib/ledger';
import { createRequest } from '@/lib/support';
import { useSupport } from '@/lib/support-store';
import { useStore } from '@/lib/store';
import { uid } from '@/lib/ids';
import { successFeedback } from '@/lib/haptics';
import { colors as c, radius, space } from '@/theme';

type CardState = 'open' | 'done' | 'cancelled';

interface Message {
  id: string;
  from: 'me' | 'bot';
  text?: string;
  voice?: boolean;
  reply?: AssistantReply;
  cardState?: CardState;
  result?: string;
}

const WELCOME: AssistantReply = {
  intent: 'greeting',
  darija:
    'Salam Youssef! Ana l’assistant dyal TapTaxi. Swelni b darija 3la flousek: chhal dkhelti, l’AMO, l’owner wla l’retrait.',
  arabic: 'سلام يوسف! أنا المساعد ديال تاب تاكسي. سولني على فلوسك.',
  french:
    'Bonjour Youssef ! Posez vos questions en darija : vos gains, l’AMO, le propriétaire ou les retraits.',
};

function speak(reply: AssistantReply) {
  void Speech.stop().finally(() => Speech.speak(reply.arabic, { language: 'ar', rate: 0.95 }));
}

export function Assistant() {
  const { state, mutate } = useStore();
  const { update: updateSupport } = useSupport();
  const inset = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([
    { id: 'hello', from: 'bot', reply: WELCOME },
  ]);
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [showFrench, setShowFrench] = useState(true);
  const nextPrompt = useRef(0);
  const reminders = proactiveReminders(state);

  const patch = (id: string, changes: Partial<Message>) =>
    setMessages((m) => m.map((x) => (x.id === id ? { ...x, ...changes } : x)));
  const say = (darija: string, french: string, arabic = darija) =>
    setMessages((m) => [
      ...m,
      { id: uid(), from: 'bot', reply: { intent: 'thanks', darija, french, arabic } },
    ]);

  const send = (text: string, voice = false) => {
    setMessages((m) => [...m, { id: uid(), from: 'me', text, voice }]);
    setTyping(true);
    setTimeout(() => {
      const reply = replyTo(text, state);
      setTyping(false);
      setMessages((m) => [
        ...m,
        { id: uid(), from: 'bot', reply, cardState: reply.card ? 'open' : undefined },
      ]);
      if (voice) speak(reply);
    }, 800);
  };

  // Simulated Darija voice input: plays the next sample question.
  const mic = () => {
    if (listening) return;
    setListening(true);
    setTimeout(() => {
      setListening(false);
      const prompt = SAMPLE_PROMPTS[nextPrompt.current % SAMPLE_PROMPTS.length];
      nextPrompt.current += 1;
      send(prompt.text, true);
    }, 1600);
  };

  const confirm = async (m: Message, card: Extract<AssistantCard, { type: 'confirm' }>) => {
    const id = uid();
    const ok = await mutate((s) =>
      card.action === 'amo' ? payContribution(s, id) : payOwner(s, id),
    );
    if (!ok) return;
    void successFeedback();
    patch(m.id, { cardState: 'done', result: `${money(card.amount)} MAD payés · réf. ${id}` });
    say(
      card.action === 'amo'
        ? 'Safi, tkhelset l’AMO dyal had chhar ✅'
        : 'Safi, wsel l’owner flousou ✅',
      card.action === 'amo'
        ? 'C’est fait : l’AMO du mois est payée.'
        : 'C’est fait : le propriétaire a reçu son montant.',
      card.action === 'amo' ? 'صافي، تخلصات أمو ديال هاد الشهر' : 'صافي، وصل المول فلوسو',
    );
  };

  const handoff = async (m: Message) => {
    const id = uid();
    await updateSupport(
      (s) =>
        createRequest(
          s,
          {
            role: 'driver',
            category: 'account',
            subject: 'Rappel demandé depuis l’assistant',
            body: `Le chauffeur demande à parler à une personne (question : ${m.reply?.intent ?? 'autre'}).`,
          },
          id,
        ).state,
    );
    patch(m.id, { cardState: 'done', result: `Demande ${id} créée` });
    say(
      'Wa7ed men l’équipe ghadi y3eyet lik.',
      'Un membre de l’équipe va vous rappeler.',
      'واحد من الفريق غادي يعيط ليك',
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
    >
      <ChatScroll deps={messages.length + (typing ? 1 : 0) + (listening ? 1 : 0)}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Stack gap={0}>
            <Txt variant="title">Assistant</Txt>
            <Txt variant="caption">Darija · voix et texte · المساعد</Txt>
          </Stack>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: showFrench }}
            onPress={() => setShowFrench((v) => !v)}
            hitSlop={10}
          >
            <Badge neutral={!showFrench}>{showFrench ? 'Traduction FR' : 'Darija seul'}</Badge>
          </Pressable>
        </Row>
        {reminders.map((r) => (
          <Notice
            key={r.id}
            icon={r.icon}
            title={r.title}
            onPress={r.id === 'amo' ? () => send('Khelles AMO dyal had chhar') : undefined}
          >
            {r.body}
          </Notice>
        ))}
        {messages.map((m) =>
          m.from === 'me' ? (
            <Bubble key={m.id} from="me">
              <Row style={{ gap: space.sm }}>
                {m.voice && <Icon name="mic" size={14} color={c.lightOnDark} />}
                <Txt style={{ color: c.surface, flexShrink: 1 }}>{m.text}</Txt>
              </Row>
            </Bubble>
          ) : (
            <Bubble
              key={m.id}
              from="bot"
              footer={
                <>
                  {m.reply?.card && (
                    <CardView
                      card={m.reply.card}
                      state={m.cardState ?? 'open'}
                      result={m.result}
                      balance={balance(state)}
                      onConfirm={(card) => void confirm(m, card)}
                      onCancel={() => {
                        patch(m.id, { cardState: 'cancelled' });
                        say('Mafihach mochkil, ma dert walou.', 'Pas de souci, rien n’a été fait.');
                      }}
                      onWithdraw={(amount, method) => {
                        const id = uid();
                        void mutate((s) => withdraw(s, amount, method, id)).then((ok) => {
                          if (!ok) return;
                          void successFeedback();
                          patch(m.id, {
                            cardState: 'done',
                            result: `${money(amount)} MAD · retrait ${id}`,
                          });
                          router.push(`/withdrawal/${id}`);
                        });
                      }}
                      onHandoff={() => void handoff(m)}
                    />
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Lire à voix haute"
                    onPress={() => m.reply && speak(m.reply)}
                    hitSlop={8}
                  >
                    <Row style={{ gap: space.xs }}>
                      <Icon name="volume" size={14} color={c.muted} />
                      <Txt variant="small">Écouter</Txt>
                    </Row>
                  </Pressable>
                </>
              }
            >
              <Stack gap={space.xs}>
                <Txt selectable>{m.reply?.darija}</Txt>
                {showFrench && (
                  <Txt selectable variant="caption" style={{ fontStyle: 'italic' }}>
                    {m.reply?.french}
                  </Txt>
                )}
              </Stack>
            </Bubble>
          ),
        )}
        {typing && <Typing />}
        {listening && (
          <Row style={{ gap: space.sm, alignSelf: 'flex-end' }}>
            <Icon name="mic" color={c.red} size={16} />
            <Txt variant="caption" style={{ color: c.red }}>
              J’écoute… (voix simulée)
            </Txt>
          </Row>
        )}
      </ChatScroll>
      <View
        style={{
          paddingHorizontal: space.xl,
          paddingTop: space.sm,
          paddingBottom: Math.max(inset.bottom, space.lg),
          gap: space.sm,
        }}
      >
        <Suggestions items={SAMPLE_PROMPTS} onPick={(t) => send(t)} />
        <Composer
          placeholder="Ktab b darija…"
          onSend={(t) => send(t)}
          onMic={mic}
          listening={listening}
          disabled={typing}
        />
        <Txt variant="small" style={{ textAlign: 'center' }}>
          Aucun paiement sans votre « Confirmer ». En cas de doute, une personne prend le relais.
        </Txt>
      </View>
    </KeyboardAvoidingView>
  );
}

function CardView({
  card,
  state,
  result,
  balance: available,
  onConfirm,
  onCancel,
  onWithdraw,
  onHandoff,
}: {
  card: AssistantCard;
  state: CardState;
  result?: string;
  balance: number;
  onConfirm: (card: Extract<AssistantCard, { type: 'confirm' }>) => void;
  onCancel: () => void;
  onWithdraw: (amount: number, method: PayoutMethod) => void;
  onHandoff: () => void;
}) {
  const [method, setMethod] = useState<PayoutMethod>('wallet');
  const [amount, setAmount] = useState(card.type === 'withdraw' ? card.suggested : 0);

  if (card.type === 'earnings')
    return (
      <View
        style={{
          backgroundColor: c.background,
          borderRadius: radius.md,
          padding: space.md,
          gap: space.xs,
        }}
      >
        <Detail label="Total 7 jours" value={`${money(card.total)} MAD`} strong />
        <Detail label="TapTaxi (numérique)" value={money(card.digital)} />
        <Detail label="Espèces" value={money(card.cash)} />
        <Detail label="Bonus 10 %" value={`+${money(card.bonus)}`} />
        <Detail label="Pourboires" value={`+${money(card.tips)}`} />
        <Detail label="Versé au propriétaire" value={`−${money(card.owner)}`} />
        <Detail
          label="Dû au propriétaire aujourd’hui"
          value={card.ownerDueToday ? `${money(card.ownerDueToday)} MAD` : 'Réglé'}
        />
        <Pressable onPress={() => router.push('/earnings')}>
          <Txt variant="small" style={{ color: c.red }}>
            Ouvrir le tableau de bord ›
          </Txt>
        </Pressable>
      </View>
    );

  if (state !== 'open')
    return (
      <Row style={{ gap: space.xs }}>
        <Icon
          name={state === 'done' ? 'check' : 'close'}
          size={14}
          color={state === 'done' ? c.green : c.muted}
        />
        <Txt variant="small" style={{ color: state === 'done' ? c.green : c.muted }}>
          {state === 'done' ? result : 'Annulé · rien n’a été fait'}
        </Txt>
      </Row>
    );

  if (card.type === 'handoff')
    return (
      <Button variant="secondary" title="Parler à une personne" icon="person" onPress={onHandoff} />
    );

  if (card.type === 'confirm')
    return (
      <Card style={{ backgroundColor: c.background, padding: space.lg, gap: space.md }}>
        <Row>
          <Icon name="lock" color={c.red} size={18} />
          <Txt variant="headline" style={{ fontSize: 14, flex: 1 }}>
            {card.title}
          </Txt>
        </Row>
        <Txt variant="heading">{money(card.amount)} MAD</Txt>
        <Txt variant="caption">{card.detail}</Txt>
        <Txt variant="small">Depuis le portefeuille · solde {money(available)} MAD</Txt>
        <Divider />
        <Row style={{ gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Button variant="secondary" title="Annuler" onPress={onCancel} />
          </View>
          <View style={{ flex: 1.3 }}>
            <Button title="Confirmer" icon="check" onPress={() => onConfirm(card)} />
          </View>
        </Row>
      </Card>
    );

  // Withdraw: method with its fee, amount, then confirm.
  return (
    <Card style={{ backgroundColor: c.background, padding: space.lg, gap: space.md }}>
      <Txt variant="headline" style={{ fontSize: 14 }}>
        Retrait · disponible {money(card.available)} MAD
      </Txt>
      {WITHDRAW_OPTIONS.map((o) => (
        <Option
          key={o.method}
          icon={o.method === 'bank' ? 'bank' : o.method === 'wallet' ? 'phone' : 'cash'}
          title={o.label}
          sub={`${o.delay} · frais ${o.fee ? `${money(o.fee)} MAD` : 'offerts'}`}
          selected={method === o.method}
          onPress={() => setMethod(o.method)}
        />
      ))}
      <Chips
        value={String(amount)}
        onChange={(v) => setAmount(Number(v))}
        items={[10000, 20000, 50000, card.available]
          .filter((n, i, all) => n <= card.available && all.indexOf(n) === i)
          .map((n) => ({ value: String(n), label: n === card.available ? 'Tout' : `${n / 100}` }))}
      />
      <Row style={{ gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button variant="secondary" title="Annuler" onPress={onCancel} />
        </View>
        <View style={{ flex: 1.3 }}>
          <Button
            title={`Confirmer ${money(amount)}`}
            icon="check"
            disabled={amount <= 0}
            onPress={() => onWithdraw(amount, method)}
          />
        </View>
      </Row>
    </Card>
  );
}
