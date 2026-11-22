// Passenger payment flow: check the taxi → fare check, fee and tip → pay with the TapTaxi
// balance, a saved card, Apple Pay / Google Pay or cash, or split with friends → processing.
// All of it is a local simulation. Amounts are integer centimes.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  BackToDriver,
  Badge,
  Button,
  Card,
  Chips,
  Detail,
  Divider,
  Heading,
  Icon,
  Info,
  Input,
  Notice,
  Option,
  Plate,
  Row,
  Screen,
  Stack,
  TaxiIdentity,
  Txt,
} from '@/components/ui';
import {
  cancelRequest,
  completePayment,
  connectRequest,
  money,
  paymentBreakdown,
} from '@/lib/model';
import type { Method } from '@/lib/model';
import {
  isPayable,
  PROCESSING_MS,
  TIP_OPTIONS,
  validateTestCard,
  type CardInput,
} from '@/lib/checkout';
import { successFeedback } from '@/lib/haptics';
import { useStore } from '@/lib/store';
import { colors as c, radius, space } from '@/theme';
import { Expired } from './expired';
import { useRole } from '@/lib/role-store';
import { usePassenger } from '@/lib/passenger-store';
import {
  addCard,
  cardExpiry,
  cardLabel,
  isCardExpired,
  MAX_CARDS,
  preferredCard,
} from '@/lib/passenger';
import { payFromWallet, walletBalance } from '@/lib/passenger-wallet';
import { completeCashPayment, completeSplitPayment, MAX_SPLIT, splitPreview } from '@/lib/ledger';
import type { SplitShare } from '@/lib/ledger';
import { checkFare, rangeLabel } from '@/lib/fare';
import { markPaid, rideForPayment } from '@/lib/rides';
import { useRides } from '@/lib/rides-store';
import { uid } from '@/lib/ids';
import { CardFields, EMPTY_CARD } from './card-fields';

type Step = 'verify' | 'amount' | 'card' | 'native' | 'cash' | 'split' | 'processing';
/** How the passenger pays. */
type Choice =
  | { kind: 'saved'; cardId: string }
  | { kind: 'card' }
  | { kind: 'balance' }
  | { kind: 'native' }
  | { kind: 'cash' };

/** Apple Pay on iPhone, Google Pay on Android (and web). */
const NATIVE: { method: Extract<Method, 'applepay' | 'googlepay'>; label: string } =
  process.env.EXPO_OS === 'ios'
    ? { method: 'applepay', label: 'Apple Pay' }
    : { method: 'googlepay', label: 'Google Pay' };

interface Friend {
  id: string;
  name: string;
  status: 'pending' | 'confirmed';
}

export function Checkout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, mutate } = useStore();
  const { rides, update: updateRides } = useRides();
  const { role } = useRole();
  const request = state.requests.find((r) => r.id === id);
  const ride = rideForPayment(rides, id);
  const [step, setStep] = useState<Step>('verify');
  const [tip, setTip] = useState(0);
  const [split, setSplit] = useState<Friend[] | null>(null);
  // Stable, so the split step's confirmation timers survive the one-second re-renders.
  const updateFriends = useCallback(
    (fn: (current: Friend[]) => Friend[]) => setSplit((cur) => fn(cur ?? [])),
    [],
  );
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const { passenger, update: updatePassenger } = usePassenger();
  const signedIn = !!passenger.account;
  const savedCards = passenger.cards.filter((card) => !isCardExpired(card));
  const [choice, setChoice] = useState<Choice>(() => {
    const preferred = preferredCard(passenger);
    return preferred ? { kind: 'saved', cardId: preferred.id } : { kind: 'card' };
  });
  const selectedCard =
    choice.kind === 'saved' ? savedCards.find((card) => card.id === choice.cardId) : undefined;
  // A card may expire or be removed while this screen remains open.
  const current: Choice = choice.kind === 'saved' && !selectedCard ? { kind: 'card' } : choice;
  const [now, setNow] = useState(() => Date.now());

  // Tick every second so the screen switches to "expired" on time.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Already paid (e.g. reopened link): show the receipt instead of charging twice.
  useEffect(() => {
    if (request?.status === 'paid' && step !== 'processing') router.replace(`/receipt/${id}`);
  }, [request?.status, step, id]);

  if (request?.status === 'paid') return null;
  if (!isPayable(request, now) && step !== 'processing') return <Expired />;
  const fare = request?.fare ?? 0;
  const b = paymentBreakdown(fare, tip, now);
  const people = split ? split.length + 1 : 1;
  // Before any friend is added, the passenger's "share" is the whole ride.
  const shares = split ? (split.length ? splitPreview(fare, people, tip, now) : [b]) : null;
  const myTotal = shares ? shares[0].total : b.total;
  const balance = walletBalance(passenger);
  const verdict = ride ? checkFare(fare, ride.estimate) : null;
  const method: Exclude<Method, 'cash'> =
    current.kind === 'balance' ? 'balance' : current.kind === 'native' ? NATIVE.method : 'card';

  const finish = async (ok: boolean) => {
    if (!ok) {
      setStep('amount');
      return;
    }
    await updateRides((s) => markPaid(s, id));
    void successFeedback();
    router.replace(`/receipt/${id}`);
  };

  /** Records the payment once "processing" ends. */
  const pay = async () => {
    if (current.kind === 'balance') {
      if (!signedIn || balance < myTotal) {
        setPaymentError('Solde TapTaxi insuffisant. Rechargez ou choisissez un autre moyen.');
        setStep(split ? 'split' : 'amount');
        return;
      }
    }
    if (choice.kind === 'saved' && (!selectedCard || isCardExpired(selectedCard))) {
      setPaymentError('Cette carte n’est plus disponible. Choisissez un autre moyen de paiement.');
      setChoice({ kind: 'card' });
      setStep('amount');
      return;
    }
    const ok = split
      ? await mutate((s) =>
          completeSplitPayment(
            s,
            id,
            [
              { payer: passenger.account?.firstName ?? 'Moi', method },
              ...split.map<SplitShare>((f) => ({ payer: f.name, method: 'card' })),
            ],
            tip,
          ),
        )
      : await mutate((s) => completePayment(s, id, tip, method));
    if (ok && current.kind === 'balance')
      await updatePassenger((s) => payFromWallet(s, myTotal, id, `W${id}`, { split: !!split }));
    await finish(ok);
  };

  const payCash = async () => finish(await mutate((s) => completeCashPayment(s, id)));

  /** Pay button: some methods need one more screen. */
  const next = () => {
    setPaymentError(null);
    if (current.kind === 'balance' && balance < myTotal) {
      setPaymentError(
        `Solde insuffisant (${money(balance)} MAD). Rechargez ou choisissez un autre moyen.`,
      );
      return;
    }
    if (choice.kind === 'saved' && (!selectedCard || isCardExpired(selectedCard))) {
      setChoice({ kind: 'card' });
      setStep('card');
      return;
    }
    if (current.kind === 'card') setStep('card');
    else if (current.kind === 'native') setStep('native');
    else if (current.kind === 'cash') setStep('cash');
    else setStep('processing');
  };

  const methods = (allowCash: boolean) => (
    <Stack gap={space.sm}>
      {signedIn && (
        <Option
          icon="wallet"
          title="Solde TapTaxi"
          sub={`${money(balance)} MAD disponibles${balance < myTotal ? ' · insuffisant' : ''}`}
          selected={current.kind === 'balance'}
          onPress={() => setChoice({ kind: 'balance' })}
        />
      )}
      {savedCards.map((card) => (
        <Option
          key={card.id}
          icon="card"
          title={cardLabel(card)}
          sub={`Expire ${cardExpiry(card)}${card.id === passenger.defaultCardId ? ' · par défaut' : ''} · en un geste`}
          selected={current.kind === 'saved' && current.cardId === card.id}
          onPress={() => setChoice({ kind: 'saved', cardId: card.id })}
        />
      ))}
      <Option
        icon="card"
        title={savedCards.length ? 'Nouvelle carte' : 'Carte bancaire'}
        sub="Carte de test · Visa ou Mastercard"
        selected={current.kind === 'card'}
        onPress={() => setChoice({ kind: 'card' })}
      />
      <Option
        icon="phone"
        title={NATIVE.label}
        sub="Avec le wallet de votre téléphone"
        selected={current.kind === 'native'}
        onPress={() => setChoice({ kind: 'native' })}
      />
      {allowCash && (
        <Option
          icon="cash"
          title="Payer en espèces"
          sub="Au chauffeur · course enregistrée, sans frais"
          selected={current.kind === 'cash'}
          onPress={() => setChoice({ kind: 'cash' })}
        />
      )}
    </Stack>
  );

  const payButton = (amount: number, label = 'Payer') =>
    current.kind === 'native' ? (
      <NativePayButton label={NATIVE.label} onPress={next} />
    ) : (
      <Button
        title={
          current.kind === 'cash'
            ? `Payer ${money(fare)} MAD en espèces`
            : `${label} ${money(amount)} MAD`
        }
        icon={current.kind === 'cash' ? 'cash' : 'lock'}
        testID="pay-button"
        onPress={next}
      />
    );

  return (
    <Screen>
      {step !== 'verify' && step !== 'processing' && (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            setStep(
              step === 'amount'
                ? 'verify'
                : step === 'card' || step === 'native'
                  ? split
                    ? 'split'
                    : 'amount'
                  : 'amount',
            )
          }
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}
        >
          <Icon name="back" size={18} />
          <Txt variant="caption" style={{ color: c.ink }}>
            {step === 'amount' ? 'Votre taxi' : 'Montant et paiement'}
          </Txt>
        </Pressable>
      )}

      {step === 'verify' && (
        <VerifyTaxi
          id={id}
          onConfirm={() => {
            void mutate((s) => connectRequest(s, id)).then((ok) => ok && setStep('amount'));
          }}
          onWrongTaxi={() =>
            Alert.alert(
              'Vérifiez votre taxi',
              'Ne payez pas si la plaque ou le chauffeur ne correspond pas. Demandez au chauffeur d’afficher son propre code.',
              [
                { text: 'Revenir à la vérification', style: 'cancel' },
                {
                  text: 'Quitter ce paiement',
                  style: 'destructive',
                  onPress: () => {
                    void mutate((s) => cancelRequest(s, id)).then(
                      (ok) => ok && router.replace(`/expired/${id}`),
                    );
                  },
                },
              ],
            )
          }
        />
      )}

      {step === 'amount' && (
        <>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Badge>Taxi agréé · démo</Badge>
              <Txt variant="small">#{id}</Txt>
            </Row>
            <TaxiIdentity />
          </Card>
          <Stack gap={space.xs} style={{ alignItems: 'center' }}>
            <Txt variant="caption">Montant du compteur</Txt>
            <Txt selectable variant="money">
              {money(fare)}
              <Txt variant="body" style={{ color: c.muted }}>
                {' '}
                MAD
              </Txt>
            </Txt>
            <Txt variant="caption" style={{ textAlign: 'center' }}>
              Vérifiez : même montant que sur le compteur du taxi.
            </Txt>
          </Stack>

          {/* Fare check against the estimate shown when the taxi was requested */}
          {ride && verdict && (
            <Notice
              icon={verdict === 'high' ? 'alert' : 'check'}
              tone={verdict === 'high' ? 'warning' : 'success'}
              title={
                verdict === 'high'
                  ? 'Plus élevé que l’estimation'
                  : verdict === 'low'
                    ? 'Moins cher que prévu'
                    : 'Conforme à l’estimation'
              }
            >
              Estimation pour ce trajet : {rangeLabel(ride.estimate)}.
              {verdict === 'high'
                ? ' Vérifiez le compteur avant de payer, ou signalez-le après la course.'
                : ''}
            </Notice>
          )}

          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt variant="headline">Ajouter un pourboire ?</Txt>
              <Txt variant="small">100 % pour le chauffeur</Txt>
            </Row>
            <Chips
              value={String(tip)}
              onChange={(v) => setTip(Number(v))}
              items={TIP_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
            />
          </Card>
          <Card>
            <Detail label="Course (compteur)" value={`${money(fare)} MAD`} />
            <Detail
              label={`Frais TapTaxi${b.night ? ' · nuit' : ''}`}
              value={`${money(b.fee)} MAD`}
            />
            {tip > 0 && <Detail label="Pourboire" value={`${money(tip)} MAD`} />}
            <Divider />
            <Detail label="Total à payer" value={`${money(b.total)} MAD`} strong />
            <Pressable accessibilityRole="link" onPress={() => router.push('/fees')}>
              <Txt variant="small">
                Frais de 0 à 3 MAD selon le compteur, +0,50 MAD la nuit · voir le détail
              </Txt>
            </Pressable>
          </Card>

          <Button
            variant="secondary"
            title="Partager la note entre amis"
            icon="users"
            testID="split-button"
            onPress={() => {
              setSplit([]);
              if (current.kind === 'cash') setChoice({ kind: 'card' });
              setStep('split');
            }}
          />

          <Heading title="Payer avec" />
          {methods(true)}
          {paymentError && <Txt style={{ color: c.red }}>{paymentError}</Txt>}
          {current.kind === 'balance' && balance < b.total && (
            <Button
              variant="ghost"
              title="Recharger mon solde"
              icon="plus"
              onPress={() => router.push('/passenger/topup')}
            />
          )}
          {payButton(b.total)}
          {current.kind === 'saved' && (
            <Info>Paiement en un geste avec votre carte enregistrée.</Info>
          )}
          <Info>Mode démo : aucun débit réel. Les frais sont affichés avant confirmation.</Info>
        </>
      )}

      {step === 'split' && split && shares && (
        <SplitStep
          friends={split}
          setFriends={updateFriends}
          shares={shares}
          tip={tip}
          onCancel={() => {
            setSplit(null);
            setStep('amount');
          }}
          methods={methods(false)}
          error={paymentError}
          payButton={payButton(shares[0].total, 'Payer ma part')}
        />
      )}

      {step === 'card' && (
        <>
          {passenger.account && passenger.cards.length >= MAX_CARDS && (
            <Info>
              Limite de {MAX_CARDS} cartes atteinte. Vous pouvez payer sans enregistrer cette carte,
              ou supprimer une carte dans « Mes cartes ».
            </Info>
          )}
          <CardForm
            total={myTotal}
            canSave={!!passenger.account && passenger.cards.length < MAX_CARDS}
            onValid={(typed, save) => {
              // Keep only the card's display details (never the number or CVV) for next time.
              if (save)
                void updatePassenger((s) => {
                  try {
                    return addCard(s, typed, uid()).state;
                  } catch {
                    return s;
                  }
                });
              setStep('processing');
            }}
          />
        </>
      )}
      {step === 'native' && (
        <NativeSheet label={NATIVE.label} total={myTotal} onConfirm={() => setStep('processing')} />
      )}
      {step === 'cash' && <CashStep fare={fare} onPaid={() => void payCash()} />}
      {step === 'processing' && (
        <Processing
          total={myTotal}
          onDone={pay}
          onCancel={() => setStep(split ? 'split' : 'amount')}
        />
      )}

      {/* Demo shortcut back to the driver screen, only when this device is the driver's. */}
      {step !== 'processing' && role === 'driver' && <BackToDriver id={id} />}
    </Screen>
  );
}

/** Split payment: add 1–3 friends (phone or QR); each confirms their share. */
function SplitStep({
  friends,
  setFriends,
  shares,
  tip,
  onCancel,
  methods,
  error,
  payButton,
}: {
  friends: Friend[];
  setFriends: (fn: (current: Friend[]) => Friend[]) => void;
  shares: ReturnType<typeof splitPreview>;
  tip: number;
  onCancel: () => void;
  methods: ReactNode;
  error: string | null;
  payButton: ReactNode;
}) {
  const [phone, setPhone] = useState('');
  const [requested, setRequested] = useState(false);
  const full = friends.length >= MAX_SPLIT - 1;
  const allConfirmed = friends.length > 0 && friends.every((f) => f.status === 'confirmed');

  // Demo: each friend confirms their share on their own phone, one after the other.
  useEffect(() => {
    if (!requested) return;
    const pending = friends.find((f) => f.status === 'pending');
    if (!pending) return;
    const t = setTimeout(() => {
      setFriends((all) =>
        all.map((f) => (f.id === pending.id ? { ...f, status: 'confirmed' } : f)),
      );
      void successFeedback();
    }, 1300);
    return () => clearTimeout(t);
  }, [requested, friends, setFriends]);

  const add = (name: string) => {
    if (full) return;
    setRequested(false);
    setFriends((all) => [...all, { id: uid(), name, status: 'pending' }]);
  };

  return (
    <>
      <Stack gap={space.xs}>
        <Txt variant="heading">Partager la note</Txt>
        <Txt variant="caption">
          Chacun paie sa part depuis son téléphone. Les frais s’appliquent à chaque part.
        </Txt>
      </Stack>
      <Card>
        <Input
          label="Numéro d’un ami (+212)"
          value={phone}
          onChangeText={(v) => setPhone(v.replace(/[^\d]/g, ''))}
          keyboardType="phone-pad"
          placeholder="6 12 34 56 78"
          maxLength={9}
        />
        <Row style={{ gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              title="Ajouter"
              icon="plus"
              disabled={full || !/^[67]\d{8}$/.test(phone)}
              onPress={() => {
                add(`+212 ${phone.slice(0, 1)} •• •• ${phone.slice(-2)}`);
                setPhone('');
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              title="Par QR"
              icon="qr"
              disabled={full}
              onPress={() =>
                add(['Salma (QR)', 'Karim (QR)', 'Omar (QR)'][friends.length] ?? 'Ami (QR)')
              }
            />
          </View>
        </Row>
        <Txt variant="small">2 à {MAX_SPLIT} personnes en tout, vous compris.</Txt>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="headline">Moi</Txt>
          <Txt variant="headline">{money(shares[0].total)} MAD</Txt>
        </Row>
        <Txt variant="small">
          Compteur {money(shares[0].fare)} + frais {money(shares[0].fee)}
          {tip ? ` + pourboire ${money(tip)}` : ''}
        </Txt>
        {friends.map((f, i) => (
          <View key={f.id} style={{ gap: space.xs }}>
            <Divider />
            <Row style={{ justifyContent: 'space-between' }}>
              <Row style={{ flex: 1, gap: space.sm }}>
                <Icon
                  name={f.status === 'confirmed' ? 'check' : 'clock'}
                  size={16}
                  color={f.status === 'confirmed' ? c.green : c.subtle}
                />
                <Txt style={{ flexShrink: 1 }}>{f.name}</Txt>
              </Row>
              <Txt variant="headline">{money(shares[i + 1]?.total ?? 0)} MAD</Txt>
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt variant="small">
                {f.status === 'confirmed'
                  ? 'Part confirmée · payée par carte'
                  : requested
                    ? 'En attente de confirmation…'
                    : 'Demande pas encore envoyée'}
              </Txt>
              {!requested && (
                <Pressable
                  onPress={() => setFriends((all) => all.filter((x) => x.id !== f.id))}
                  hitSlop={10}
                >
                  <Txt variant="small" style={{ color: c.red }}>
                    Retirer
                  </Txt>
                </Pressable>
              )}
            </Row>
          </View>
        ))}
      </Card>

      {friends.length > 0 && !requested && (
        <Button
          title={`Envoyer les demandes (${friends.length})`}
          icon="send"
          onPress={() => setRequested(true)}
        />
      )}
      {allConfirmed && (
        <>
          <Notice tone="success" icon="check" title="Toutes les parts sont confirmées">
            Le chauffeur reçoit une confirmation par paiement.
          </Notice>
          <Heading title="Payer ma part avec" />
          {methods}
          {error && <Txt style={{ color: c.red }}>{error}</Txt>}
          {payButton}
        </>
      )}
      <Button variant="ghost" title="Ne pas partager" onPress={onCancel} />
    </>
  );
}

/** Apple Pay / Google Pay styled button (black, as the platforms require). */
function NativePayButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Payer avec ${label}`}
      testID="native-pay"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 54,
        borderRadius: radius.lg,
        backgroundColor: '#000000',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: space.sm,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Txt variant="headline" style={{ color: '#FFFFFF', fontSize: 17 }}>
        Payer avec {label === 'Apple Pay' ? ' Pay' : 'G Pay'}
      </Txt>
    </Pressable>
  );
}

/** Simulated Apple Pay / Google Pay sheet. */
function NativeSheet({
  label,
  total,
  onConfirm,
}: {
  label: string;
  total: number;
  onConfirm: () => void;
}) {
  return (
    <Card style={{ backgroundColor: '#1C1C1E' }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="headline" style={{ color: '#FFFFFF' }}>
          {label}
        </Txt>
        <Txt variant="small" style={{ color: '#9A9AA0' }}>
          SIMULATION
        </Txt>
      </Row>
      <Divider />
      <Detail label="Carte" value="Visa •••• 4242" />
      <Detail label="Marchand" value="TapTaxi · Taxi n° 1287" />
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt style={{ color: '#FFFFFF' }}>Payer TapTaxi</Txt>
        <Txt variant="heading" style={{ color: '#FFFFFF' }}>
          {money(total)} MAD
        </Txt>
      </Row>
      <Button
        title={label === 'Apple Pay' ? 'Confirmer avec Face ID' : 'Confirmer avec l’empreinte'}
        icon="lock"
        onPress={onConfirm}
      />
      <Txt variant="small" style={{ color: '#9A9AA0', textAlign: 'center' }}>
        Démo : la vraie feuille {label} s’ouvre avec un partenaire de paiement agréé.
      </Txt>
    </Card>
  );
}

function CashStep({ fare, onPaid }: { fare: number; onPaid: () => void }) {
  return (
    <>
      <Stack gap={space.xs} style={{ alignItems: 'center' }}>
        <Icon name="cash" size={40} color={c.green} />
        <Txt variant="heading">Payez en espèces</Txt>
        <Txt selectable variant="money">
          {money(fare)}
          <Txt variant="body" style={{ color: c.muted }}>
            {' '}
            MAD
          </Txt>
        </Txt>
        <Txt variant="caption" style={{ textAlign: 'center' }}>
          Le montant du compteur, à remettre au chauffeur. Pas de frais TapTaxi sur les courses en
          espèces.
        </Txt>
      </Stack>
      <Button title="J’ai payé le chauffeur" icon="check" onPress={onPaid} />
      <Info>
        La course est enregistrée dans votre historique et dans celui du chauffeur, sans paiement
        numérique.
      </Info>
    </>
  );
}

function VerifyTaxi({
  id,
  onConfirm,
  onWrongTaxi,
}: {
  id: string;
  onConfirm: () => void;
  onWrongTaxi: () => void;
}) {
  return (
    <>
      <Stack gap={space.xs}>
        <Txt variant="small" style={{ letterSpacing: 1 }}>
          PAYEZ LE TAXI SANS CASH
        </Txt>
        <Txt variant="title">
          Bienvenue à bord
          <Txt variant="title" style={{ color: c.red }}>
            .
          </Txt>
        </Txt>
        <Txt variant="caption">Vérifiez que c’est bien votre taxi.</Txt>
      </Stack>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Badge>Taxi vérifié</Badge>
          <Txt variant="small">#{id}</Txt>
        </Row>
        <TaxiIdentity />
        <Plate />
        <Txt variant="caption" style={{ textAlign: 'center' }}>
          Comparez avec la plaque du véhicule
        </Txt>
        <Divider />
        {[
          'Licence de taxi vérifiée',
          'Identité du chauffeur vérifiée',
          'Code de paiement valable',
        ].map((label) => (
          <Row key={label}>
            <Icon name="shield" size={18} color={c.green} />
            <Txt style={{ flex: 1 }}>{label}</Txt>
            <Icon name="check" size={16} color={c.green} />
          </Row>
        ))}
      </Card>
      <Button title="C’est mon taxi" icon="arrow" onPress={onConfirm} />
      <Button title="Ce n’est pas le bon taxi ?" variant="ghost" onPress={onWrongTaxi} />
      <Info>Taxi et identité fictifs de la démonstration.</Info>
    </>
  );
}

function CardForm({
  total,
  canSave,
  onValid,
}: {
  total: number;
  /** Only a logged-in passenger can save a card. */
  canSave: boolean;
  onValid: (card: CardInput, save: boolean) => void;
}) {
  const [card, setCard] = useState<CardInput>(EMPTY_CARD);
  const [error, setError] = useState<string | undefined>();
  const [save, setSave] = useState(true);
  return (
    <>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="heading">Carte bancaire</Txt>
        <Txt variant="headline">{money(total)} MAD</Txt>
      </Row>
      <CardFields
        value={card}
        onChange={(next) => {
          setCard(next);
          setError(undefined);
        }}
        error={error}
      />
      {canSave && (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: save }}
          accessibilityLabel="Enregistrer cette carte pour la prochaine fois"
          onPress={() => setSave((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: save ? c.red : c.line,
              backgroundColor: save ? c.red : c.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {save && <Icon name="check" size={14} color={c.surface} />}
          </View>
          <Txt style={{ flex: 1 }}>Enregistrer cette carte pour la prochaine fois</Txt>
        </Pressable>
      )}
      <Button
        title={`Simuler le paiement de ${money(total)} MAD`}
        icon="lock"
        onPress={() => {
          const problem = validateTestCard(card);
          if (problem) {
            setError(problem);
            return;
          }
          setCard(EMPTY_CARD); // the typed number leaves memory right away
          onValid(card, save && canSave);
        }}
      />
      <Info>
        Utilisez seulement les cartes de test. Le numéro complet et le CVV ne sont jamais
        enregistrés.
      </Info>
    </>
  );
}

function Processing({
  total,
  onDone,
  onCancel,
}: {
  total: number;
  onDone: () => Promise<void>;
  onCancel: () => void;
}) {
  // Keep the latest callback without restarting the timer on every render.
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    const timer = setTimeout(() => void done.current(), PROCESSING_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <Stack style={{ alignItems: 'center', paddingTop: space.hero }} gap={space.lg}>
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: radius.pill,
          backgroundColor: c.redSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="lock" size={34} color={c.red} />
      </View>
      <Txt variant="heading">Paiement en cours…</Txt>
      <Txt variant="caption">{money(total)} MAD à Youssef B.</Txt>
      <Card style={{ alignSelf: 'stretch' }}>
        <Row>
          <Icon name="check" size={18} color={c.green} />
          <Txt>Simulation démarrée</Txt>
        </Row>
        <Row>
          <Icon name="history" size={18} />
          <Txt>Confirmation du paiement démo</Txt>
        </Row>
        <Row>
          <Icon name="file" size={18} color={c.subtle} />
          <Txt style={{ color: c.muted }}>Votre reçu</Txt>
        </Row>
      </Card>
      <Button title="Annuler" variant="ghost" onPress={onCancel} />
    </Stack>
  );
}
