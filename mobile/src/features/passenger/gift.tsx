// Gift a ride: send part of the wallet balance to someone, with a message.
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Card,
  Chips,
  Heading,
  Icon,
  Info,
  Input,
  Logo,
  Row,
  Screen,
  Stack,
  Success,
  Txt,
} from '@/components/ui';
import { money, parseMoney } from '@/lib/model';
import { usePassenger } from '@/lib/passenger-store';
import {
  DEMO_CONTACTS,
  GIFT_AMOUNTS,
  giftError,
  giftNotification,
  sendGift,
  walletBalance,
} from '@/lib/passenger-wallet';
import type { WalletEntry } from '@/lib/passenger-wallet';
import { uid } from '@/lib/ids';
import { successFeedback } from '@/lib/haptics';
import { colors as c, radius, space } from '@/theme';

export function GiftRide() {
  const { passenger, update } = usePassenger();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [value, setValue] = useState('50');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState<WalletEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const amount = parseMoney(value) ?? 0;
  const input = { name, phone, amount, message };
  const problem = giftError(passenger, input);

  if (sent)
    return (
      <Screen>
        <Success />
        <Txt variant="heading" style={{ textAlign: 'center' }}>
          Course offerte à {sent.contact?.name}
        </Txt>
        <Txt variant="caption" style={{ textAlign: 'center' }}>
          {money(-sent.amount)} MAD envoyés · nouveau solde {money(walletBalance(passenger))} MAD
        </Txt>
        <Heading title={`Ce que reçoit ${sent.contact?.name}`} />
        <Card style={{ backgroundColor: c.ink }}>
          <Row>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.sm,
                backgroundColor: c.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="gift" color={c.red} size={18} />
            </View>
            <Stack gap={0} style={{ flex: 1 }}>
              <Txt variant="small" style={{ color: c.lightOnDark }}>
                TAPTAXI · MAINTENANT
              </Txt>
              <Txt style={{ color: c.surface }}>
                {giftNotification(passenger.account?.firstName ?? 'Un proche', sent)}
              </Txt>
            </Stack>
          </Row>
        </Card>
        <Txt variant="caption" style={{ textAlign: 'center' }}>
          Le montant s’ajoute à son solde TapTaxi pour payer ses prochaines courses.
        </Txt>
        <Button title="Retour au wallet" onPress={() => router.replace('/passenger/wallet')} />
      </Screen>
    );

  return (
    <Screen>
      <Logo height={24} />
      <Txt variant="title">
        Offrez une course
        <Txt variant="title" style={{ color: c.red }}>
          .
        </Txt>
      </Txt>
      <Txt variant="caption">Solde disponible : {money(walletBalance(passenger))} MAD</Txt>
      <Heading title="À qui ?" />
      <Row style={{ gap: space.sm, flexWrap: 'wrap' }}>
        {DEMO_CONTACTS.map((contact) => {
          const selected = contact.phone === phone;
          return (
            <Pressable
              key={contact.phone}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                setName(contact.name);
                setPhone(contact.phone);
              }}
              style={({ pressed }) => ({
                alignItems: 'center',
                gap: space.xs,
                width: 70,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: radius.pill,
                  backgroundColor: selected ? c.red : c.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Txt variant="headline" style={{ color: selected ? c.surface : c.ink }}>
                  {contact.name.slice(0, 1)}
                </Txt>
              </View>
              <Txt variant="small" style={{ color: c.ink }}>
                {contact.name}
              </Txt>
            </Pressable>
          );
        })}
      </Row>
      <Input label="Prénom" value={name} onChangeText={setName} placeholder="Ex. Salma" />
      <Input
        label="Numéro (+212)"
        value={phone}
        onChangeText={(v) => setPhone(v.replace(/[^\d]/g, ''))}
        keyboardType="phone-pad"
        placeholder="6 12 34 56 78"
        maxLength={9}
      />
      <Heading title="Montant" />
      <Chips
        value={String(amount)}
        onChange={(v) => setValue(String(Number(v) / 100))}
        items={GIFT_AMOUNTS.map((n) => ({ value: String(n), label: `${n / 100} MAD` }))}
      />
      <Input
        label="Autre montant (MAD)"
        value={value}
        onChangeText={setValue}
        keyboardType="decimal-pad"
      />
      <Input
        label="Message (facultatif)"
        value={message}
        onChangeText={setMessage}
        placeholder="Bon retour à la maison !"
        maxLength={140}
      />
      {problem && (name || phone) ? <Txt style={{ color: c.red }}>{problem}</Txt> : null}
      <Button
        title={`Offrir ${money(amount)} MAD`}
        icon="gift"
        disabled={!!problem}
        loading={busy}
        onPress={() => {
          setBusy(true);
          const id = uid();
          void update((s) => sendGift(s, input, id)).then((ok) => {
            setBusy(false);
            if (!ok) return;
            void successFeedback();
            setSent({
              id,
              kind: 'gift-sent',
              amount: -amount,
              at: Date.now(),
              label: '',
              status: 'done',
              contact: { name: name.trim(), phone },
              message: message.trim(),
            });
          });
        }}
      />
      <Info>
        Démo : aucun SMS ni transfert réel. Le destinataire reçoit une notification TapTaxi.
      </Info>
    </Screen>
  );
}
