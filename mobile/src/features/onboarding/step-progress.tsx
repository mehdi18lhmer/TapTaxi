import { View } from 'react-native';
import { colors as c, radius, space } from '@/theme';

/** Three bars showing the sign-up step (1 SMS, 2 documents, 3 payout). */
export function StepProgress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <View
      style={{ flexDirection: 'row', gap: space.sm }}
      accessibilityRole="progressbar"
      accessibilityLabel={`Étape ${step} sur 3`}
      accessibilityValue={{ min: 1, max: 3, now: step }}
    >
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 5,
            borderRadius: radius.pill,
            backgroundColor: i <= step ? c.red : c.line,
          }}
        />
      ))}
    </View>
  );
}
