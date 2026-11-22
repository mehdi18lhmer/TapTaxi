import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Button, Card, Icon, Info, Input, Screen, Stack, Txt } from '@/components/ui';
import { DEMO_SMS_CODE, formatPhone, isValidSmsCode, RESEND_SECONDS } from '@/lib/onboarding';
import { useStore } from '@/lib/store';
import { colors as c, space } from '@/theme';
import { StepProgress } from './step-progress';

export function Sms() {
  const { state, notify } = useStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [seconds, setSeconds] = useState(RESEND_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  const verify = (value = code) => {
    if (!isValidSmsCode(value)) {
      setError(`Code incorrect. Le code de démonstration est ${DEMO_SMS_CODE}.`);
      return;
    }
    setError(undefined);
    router.push('/documents');
  };

  return (
    <Screen>
      <StepProgress step={1} />
      <Stack gap={space.sm}>
        <Icon name="phone" size={30} color={c.red} />
        <Txt variant="title">Entrez le code.</Txt>
        <Txt variant="caption">Numéro de test : +212 {formatPhone(state.phone)}</Txt>
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
          if (digits.length === 6) verify(digits); // like SMS autofill: check as soon as complete
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
      <Button title="Vérifier" icon="arrow" disabled={code.length !== 6} onPress={() => verify()} />
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
      <Info>
        Ne partagez jamais un vrai code reçu par SMS. TapTaxi ne vous le demandera jamais par
        téléphone.
      </Info>
      <Button title="Changer de numéro" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
