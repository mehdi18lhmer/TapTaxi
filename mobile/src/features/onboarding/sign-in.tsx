import { useState } from 'react';
import { router } from 'expo-router';
import { Badge, Button, Card, Icon, Info, Input, Row, Screen, Stack, Txt } from '@/components/ui';
import { formatPhone, normalizePhone } from '@/lib/onboarding';
import { useStore } from '@/lib/store';
import { colors as c, space } from '@/theme';

export function SignIn() {
  const { state, mutate, busy } = useStore();
  const [phone, setPhone] = useState(formatPhone(state.phone));
  const [error, setError] = useState<string | undefined>();
  const [showPrivacy, setShowPrivacy] = useState(false);

  const submit = () => {
    const digits = normalizePhone(phone);
    if (!digits) {
      setError('Saisissez un numéro marocain valide (9 chiffres après +212).');
      return;
    }
    setError(undefined);
    void mutate((s) => ({ ...s, phone: digits })).then((ok) => ok && router.push('/sms'));
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'flex-end' }}>
        <Badge neutral>Démo</Badge>
      </Row>
      <Stack gap={space.sm}>
        <Icon name="qr" size={34} color={c.red} />
        <Txt variant="title">
          Encaissez sans cash
          <Txt variant="title" style={{ color: c.red }}>
            .
          </Txt>
        </Txt>
        <Txt style={{ writingDirection: 'rtl', color: c.red, fontSize: 18 }}>خلّص بلا كاش</Txt>
        <Txt variant="caption">
          Vos passagers paient par carte ou wallet. Votre argent, en toute simplicité.
        </Txt>
      </Stack>
      <Card>
        <Row>
          <Icon name="check" size={18} color={c.green} />
          <Txt>Paiement reçu · +23,50 MAD</Txt>
        </Row>
        <Row>
          <Icon name="file" size={18} color={c.green} />
          <Txt>Un historique de revenus chaque mois</Txt>
        </Row>
      </Card>
      <Input
        label="Votre numéro de téléphone (+212)"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        placeholder="6 12 34 56 78"
        maxLength={16}
        returnKeyType="next"
        onSubmitEditing={submit}
        error={error}
      />
      <Txt variant="caption">Démo : aucun SMS n’est envoyé. Le code de test sera affiché.</Txt>
      <Button
        title="Recevoir le code de démonstration"
        icon="arrow"
        loading={busy}
        onPress={submit}
      />
      <Button
        title={showPrivacy ? 'Masquer la confidentialité' : 'Confidentialité'}
        variant="ghost"
        onPress={() => setShowPrivacy((v) => !v)}
      />
      {showPrivacy && (
        <Info>
          Seuls le numéro de démonstration, les préférences et les transactions fictives sont
          enregistrés sur cet appareil. Aucune donnée n’est envoyée à un serveur.
        </Info>
      )}
    </Screen>
  );
}
