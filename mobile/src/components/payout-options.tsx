import { Option, Stack } from '@/components/ui';
import type { PayoutMethod } from '@/lib/model';
import { space } from '@/theme';
export function PayoutOptions({
  value,
  onChange,
}: {
  value: PayoutMethod;
  onChange: (v: PayoutMethod) => void;
}) {
  return (
    <Stack gap={space.sm}>
      <Option
        icon="bank"
        title="En agence"
        sub="Cash Plus, Wafacash · code de retrait"
        selected={value === 'agency'}
        onPress={() => onChange('agency')}
      />
      <Option
        icon="phone"
        title="Wallet mobile"
        sub="Instantané · +212 6 •• •• 56 78"
        selected={value === 'wallet'}
        onPress={() => onChange('wallet')}
      />
      <Option
        icon="bank"
        title="Compte bancaire"
        sub="1 à 2 jours · RIB •••• 0932"
        selected={value === 'bank'}
        onPress={() => onChange('bank')}
      />
    </Stack>
  );
}
