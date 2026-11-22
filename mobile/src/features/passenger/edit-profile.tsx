import { useState } from 'react';
import { router } from 'expo-router';
import { Button, Card, Info, Input, Screen, Txt } from '@/components/ui';
import { successFeedback } from '@/lib/haptics';
import { DEMO_SMS_CODE, formatPhone, isValidSmsCode, normalizePhone } from '@/lib/onboarding';
import { updateProfile } from '@/lib/passenger';
import { usePassenger } from '@/lib/passenger-store';
import { useStore } from '@/lib/store';

/**
 * Passenger "Modifier mon profil". A new phone number must be confirmed with the code
 * sent to it before it is saved; changing only the first name saves directly.
 */
export function EditProfile() {
  const { passenger, update } = usePassenger();
  const { notify } = useStore();
  const account = passenger.account;
  const [firstName, setFirstName] = useState(account?.firstName ?? '');
  const [phone, setPhone] = useState(formatPhone(account?.phone ?? ''));
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string; code?: string }>({});
  if (!account) return null;

  const digits = normalizePhone(phone);
  const phoneChanged = digits !== null && digits !== account.phone;
  const unchanged = firstName.trim() === account.firstName && digits === account.phone;

  const save = async () => {
    const next = {
      name: firstName.trim().length < 2 ? 'Saisissez votre prénom.' : undefined,
      phone: digits ? undefined : 'Saisissez un numéro marocain valide (9 chiffres après +212).',
      code:
        phoneChanged && !isValidSmsCode(code)
          ? `Code incorrect. Le code de démonstration est ${DEMO_SMS_CODE}.`
          : undefined,
    };
    setErrors(next);
    if (next.name || next.phone || next.code || !digits) return;
    if (await update((s) => updateProfile(s, firstName, digits))) {
      void successFeedback();
      notify('Profil mis à jour.');
      // Opened from a link (no previous screen): go to the page it belongs to.
      if (router.canGoBack()) router.back();
      else router.navigate('/account');
    }
  };

  return (
    <Screen>
      <Input
        label="Prénom"
        value={firstName}
        onChangeText={setFirstName}
        autoComplete="given-name"
        textContentType="givenName"
        maxLength={40}
        error={errors.name}
      />
      <Input
        label="Numéro de téléphone (+212)"
        value={phone}
        onChangeText={(v) => {
          setPhone(v);
          setCode('');
        }}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        maxLength={16}
        error={errors.phone}
      />
      {phoneChanged && (
        <Card>
          <Txt variant="headline">Confirmez votre nouveau numéro</Txt>
          <Txt variant="caption">
            Code envoyé au +212 {formatPhone(digits)}. Démo : le code est {DEMO_SMS_CODE}.
          </Txt>
          <Input
            label="Code à 6 chiffres"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            placeholder="• • • • • •"
            maxLength={6}
            error={errors.code}
          />
        </Card>
      )}
      <Button title="Enregistrer" icon="check" disabled={unchanged} onPress={() => void save()} />
      <Info>Vos cartes et vos reçus ne changent pas.</Info>
    </Screen>
  );
}
