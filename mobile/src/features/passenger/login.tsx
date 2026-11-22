import { useState } from 'react';
import { router } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  Icon,
  Info,
  Input,
  Logo,
  Row,
  Screen,
  Stack,
  Txt,
} from '@/components/ui';
import { normalizePhone } from '@/lib/onboarding';
import { useRole } from '@/lib/role-store';
import { colors as c, space } from '@/theme';

/** Passenger login, step 1: first name and phone. The code is checked on the next screen. */
export function PassengerLogin() {
  const { setRole } = useRole();
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const submit = () => {
    const digits = normalizePhone(phone);
    const next = {
      name: firstName.trim().length < 2 ? 'Saisissez votre prénom.' : undefined,
      phone: digits ? undefined : 'Saisissez un numéro marocain valide (9 chiffres après +212).',
    };
    setErrors(next);
    if (next.name || !digits) return;
    router.push({
      pathname: '/passenger/code',
      params: { firstName: firstName.trim(), phone: digits },
    });
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Logo />
        <Badge neutral>Passager</Badge>
      </Row>
      <Stack gap={space.sm}>
        <Txt variant="title">
          Payez votre taxi sans cash
          <Txt variant="title" style={{ color: c.red }}>
            .
          </Txt>
        </Txt>
        <Txt style={{ writingDirection: 'rtl', textAlign: 'left', color: c.red, fontSize: 18 }}>
          خلّص الطاكسي بلا كاش
        </Txt>
        <Txt variant="caption">
          Connectez-vous pour enregistrer votre carte et retrouver vos reçus.
        </Txt>
      </Stack>
      <Card>
        <Row>
          <Icon name="card" size={18} color={c.green} />
          <Txt style={{ flex: 1 }}>Payez en un geste avec votre carte enregistrée</Txt>
        </Row>
        <Row>
          <Icon name="file" size={18} color={c.green} />
          <Txt style={{ flex: 1 }}>Tous vos reçus au même endroit</Txt>
        </Row>
      </Card>
      <Input
        label="Prénom"
        value={firstName}
        onChangeText={setFirstName}
        autoComplete="given-name"
        textContentType="givenName"
        placeholder="Leila"
        maxLength={40}
        error={errors.name}
      />
      <Input
        label="Numéro de téléphone (+212)"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        placeholder="6 12 34 56 78"
        maxLength={16}
        onSubmitEditing={submit}
        error={errors.phone}
      />
      <Button title="Recevoir le code" icon="arrow" onPress={submit} />
      <Info>Démo : aucun SMS n’est envoyé. Le code de test est affiché à l’étape suivante.</Info>
      <Button title="Je suis chauffeur" variant="ghost" onPress={() => setRole('driver')} />
    </Screen>
  );
}
