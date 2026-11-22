import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Icon, Info, Input, Screen, Stack, Txt } from '@/components/ui';
import {
  DEMO_SMS_CODE,
  formatPhone,
  isValidSmsCode,
  normalizePhone,
  RESEND_SECONDS,
} from '@/lib/onboarding';
import { signIn } from '@/lib/passenger';
import { usePassenger } from '@/lib/passenger-store';
import { useStore } from '@/lib/store';
import { colors as c, space } from '@/theme';

/**
 * Passenger login, step 2: the SMS code. Signing in makes the login screens off-limits,
 * so the app moves to the passenger home by itself (see the root layout).
 */
export function PassengerCode() {
  const params = useLocalSearchParams<{ firstName?: string; phone?: string }>();
  const { update } = usePassenger();
  const { notify } = useStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const phone = normalizePhone(params.phone ?? '');

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  // Opened without valid details (e.g. a stale link): start the login again.
  if (!phone || !params.firstName) {
    return (
      <Screen center>
        <Txt variant="heading">Recommencez la connexion.</Txt>
        <Button title="Retour" onPress={() => router.replace('/passenger/login')} />
      </Screen>
    );
  }

  const verify = (value = code) => {
    if (!isValidSmsCode(value)) {
      setError(`Code incorrect. Le code de démonstration est ${DEMO_SMS_CODE}.`);
      return;
    }
    setError(undefined);
    void update((s) => signIn(s, params.firstName ?? '', phone));
  };

  return (
    <Screen>
      <Stack gap={space.sm}>
        <Icon name="phone" size={30} color={c.red} />
        <Txt variant="title">Entrez le code.</Txt>
        <Txt variant="caption">Envoyé au +212 {formatPhone(phone)}</Txt>
      </Stack>
      <Card style={{ alignItems: 'center' }}>
        <Txt variant="caption">Code de démonstration</Txt>
        <Txt selectable variant="money" style={{ fontSize: 36, letterSpacing: 6 }}>
          {DEMO_SMS_CODE}
        </Txt>
        <Txt variant="small">Aucun SMS réel n’a été envoyé.</Txt>
      </Card>
      <Input
        label="Code à 6 chiffres"
        value={code}
        onChangeText={(v) => {
          const digits = v.replace(/\D/g, '').slice(0, 6);
          setCode(digits);
          if (digits.length === 6) verify(digits);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        placeholder="• • • • • •"
        maxLength={6}
        autoFocus
        error={error}
        style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center' }}
      />
      <Button
        title="Se connecter"
        icon="arrow"
        disabled={code.length !== 6}
        onPress={() => verify()}
      />
      <Button
        title={
          seconds > 0
            ? `Renvoyer le code dans 00:${String(seconds).padStart(2, '0')}`
            : 'Renvoyer le code démo'
        }
        variant="ghost"
        disabled={seconds > 0}
        onPress={() => {
          setSeconds(RESEND_SECONDS);
          notify(`Code de démo : ${DEMO_SMS_CODE}`);
        }}
      />
      <Info>TapTaxi ne vous demandera jamais ce code par téléphone.</Info>
      <Button title="Changer de numéro" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
