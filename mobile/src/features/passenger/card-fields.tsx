// Card picture and card form, shared by "Ajouter une carte" and the checkout.
import { View } from 'react-native';
import { Button, Input, Row, Txt } from '@/components/ui';
import { formatCardNumber, formatExpiry, TEST_CARD } from '@/lib/checkout';
import type { CardInput } from '@/lib/checkout';
import { brandOf, cardExpiry } from '@/lib/passenger';
import type { SavedCard } from '@/lib/passenger';
import { colors as c, radius, space } from '@/theme';

export const EMPTY_CARD: CardInput = { number: '', expiry: '', cvv: '', name: '' };

/** A bank card drawing: a saved card (masked) or the card being typed. */
export function CardVisual({ saved, input }: { saved?: SavedCard; input?: CardInput }) {
  const brand = saved?.brand ?? (input?.number ? brandOf(input.number) : 'Carte');
  const number = saved ? `•••• •••• •••• ${saved.last4}` : input?.number || '•••• •••• •••• ••••';
  const holder = saved?.holder ?? (input?.name.toUpperCase() || 'NOM PRÉNOM');
  const expiry = saved ? cardExpiry(saved) : input?.expiry || 'MM/AA';
  return (
    <View
      accessibilityLabel={
        saved ? `${saved.brand} se terminant par ${saved.last4}` : 'Aperçu de la carte'
      }
      style={{
        backgroundColor: brand === 'Mastercard' ? '#2B2B3A' : c.ink,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        padding: space.xl,
        gap: space.lg,
        aspectRatio: 1.7,
        justifyContent: 'space-between',
      }}
    >
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="small" style={{ color: c.lightOnDark }}>
          TapTaxi
        </Txt>
        <Txt variant="headline" style={{ color: c.surface, fontStyle: 'italic' }}>
          {brand}
        </Txt>
      </Row>
      <Txt variant="heading" style={{ color: c.surface, letterSpacing: 2, fontSize: 20 }}>
        {number}
      </Txt>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="small" style={{ color: c.lightOnDark }} numberOfLines={1}>
          {holder}
        </Txt>
        <Txt variant="small" style={{ color: c.lightOnDark }}>
          {expiry}
        </Txt>
      </Row>
    </View>
  );
}

/** Number, expiry, CVV and holder, with a shortcut that fills a test card. */
export function CardFields({
  value,
  onChange,
  error,
}: {
  value: CardInput;
  onChange: (next: CardInput) => void;
  error?: string;
}) {
  return (
    <>
      <CardVisual input={value} />
      <Button
        title="Utiliser la carte de test"
        variant="secondary"
        icon="arrow"
        onPress={() => onChange(TEST_CARD)}
      />
      <Input
        label="Numéro de carte"
        value={value.number}
        onChangeText={(v) => onChange({ ...value, number: formatCardNumber(v) })}
        keyboardType="number-pad"
        placeholder="4242 4242 4242 4242"
        autoComplete="off"
        maxLength={19}
      />
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Input
            label="Expiration"
            value={value.expiry}
            onChangeText={(v) => onChange({ ...value, expiry: formatExpiry(v) })}
            keyboardType="number-pad"
            placeholder="MM/AA"
            maxLength={5}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="CVV"
            value={value.cvv}
            onChangeText={(v) => onChange({ ...value, cvv: v.replace(/\D/g, '').slice(0, 3) })}
            keyboardType="number-pad"
            placeholder="123"
            secureTextEntry
            maxLength={3}
          />
        </View>
      </Row>
      <Input
        label="Nom sur la carte"
        value={value.name}
        onChangeText={(v) => onChange({ ...value, name: v })}
        placeholder="NOM PRÉNOM"
        autoCapitalize="characters"
        maxLength={70}
        error={error}
      />
    </>
  );
}
