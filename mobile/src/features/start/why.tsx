// Positioning ("Pourquoi TapTaxi"): licensed taxis, small fixed fee, no surprises.
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Divider, Icon, Info, Logo, Row, Screen, Stack, Txt } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { colors as c, fonts, radius, space } from '@/theme';

const LINES: { icon: IconName; title: string; arabic: string }[] = [
  { icon: 'shield', title: 'Taxis agréés uniquement', arabic: 'طاكسيات مرخصة فقط' },
  { icon: 'taxi', title: 'Compteur officiel + 1 à 3 MAD', arabic: 'العداد الرسمي + 1 إلى 3 دراهم' },
  {
    icon: 'wallet',
    title: 'Payez comme vous voulez : wallet, carte, Apple/Google Pay ou espèces',
    arabic: 'خلص كيف بغيتي',
  },
];

const ROWS: [string, string, string, string][] = [
  ['Petits taxis agréés', 'Oui', 'À confirmer', 'Non, chauffeurs privés'],
  ['Statut légal', 'Avec des taxis agréés', 'À confirmer', 'Non autorisés (pas de cadre légal)'],
  [
    'Ce que paie le passager',
    'Compteur officiel + 1–3 MAD',
    'À confirmer',
    'Prix de l’app, souvent bien plus élevé',
  ],
  ['Offrir une course, partager la note', 'Oui', 'À confirmer', 'Non'],
  ['Couverture sociale chauffeur (CNSS/AMO)', 'Oui', 'À confirmer', 'Non'],
  ['Assistant IA en darija pour chauffeurs', 'Oui', 'À confirmer', 'Non'],
];

export function Why() {
  return (
    <Screen>
      <Logo />
      <Txt variant="title">
        Le taxi que vous connaissez,
        <Txt variant="title" style={{ color: c.red }}>
          {' '}
          sans surprise.
        </Txt>
      </Txt>
      <Stack gap={space.sm}>
        {LINES.map((l) => (
          <Card key={l.title} style={{ padding: space.lg }}>
            <Row>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.md,
                  backgroundColor: c.redSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={l.icon} color={c.red} />
              </View>
              <Stack gap={0} style={{ flex: 1 }}>
                <Txt variant="headline" style={{ fontSize: 15 }}>
                  {l.title}
                </Txt>
                <Txt variant="caption" style={{ writingDirection: 'rtl', textAlign: 'left' }}>
                  {l.arabic}
                </Txt>
              </Stack>
            </Row>
          </Card>
        ))}
      </Stack>

      <Txt variant="headline">TapTaxi face aux autres</Txt>
      <Card style={{ gap: 0, padding: space.md }}>
        <Row style={{ gap: space.xs, paddingBottom: space.sm }}>
          <Txt variant="small" style={{ flex: 1.3 }} />
          {['TapTaxi', 'Taxi Sahbi', 'inDrive, Careem, Uber'].map((h, i) => (
            <Txt
              key={h}
              variant="small"
              style={{
                flex: 1,
                color: i === 0 ? c.red : c.ink,
                fontFamily: fonts.semibold,
                fontSize: 10,
              }}
            >
              {h}
            </Txt>
          ))}
        </Row>
        {ROWS.map(([label, us, sahbi, others]) => (
          <View key={label}>
            <Divider />
            <Row style={{ gap: space.xs, paddingVertical: space.sm, alignItems: 'flex-start' }}>
              <Txt variant="caption" style={{ flex: 1.3, fontSize: 10, color: c.ink }}>
                {label}
              </Txt>
              <Txt
                variant="caption"
                style={{ flex: 1, fontSize: 10, color: c.green, fontFamily: fonts.medium }}
              >
                {us}
              </Txt>
              <Txt variant="caption" style={{ flex: 1, fontSize: 10 }}>
                {sahbi}
              </Txt>
              <Txt variant="caption" style={{ flex: 1, fontSize: 10 }}>
                {others}
              </Txt>
            </Row>
          </View>
        ))}
      </Card>
      <Info>
        Le Maroc n’a pas encore de cadre légal autorisant les applications de VTC (annonce de
        légalisation en janvier 2025, non encore appliquée). La colonne Taxi Sahbi sera complétée
        avec des informations vérifiées.
      </Info>
      <Button
        title="Voir nos frais"
        variant="secondary"
        icon="file"
        onPress={() => router.push('/fees')}
      />
    </Screen>
  );
}
