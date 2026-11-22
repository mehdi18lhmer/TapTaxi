import type { TextStyle } from 'react-native';
// The source design intentionally uses a fixed light brand palette.
export const colors = {
  background: '#F5F4F2',
  surface: '#FFFFFF',
  ink: '#121212',
  muted: '#727269',
  subtle: '#9A988D',
  red: '#D91E24',
  redSoft: '#FCEBEC',
  green: '#0E6B3B',
  greenSoft: '#E8F3EA',
  line: '#ECEBE5',
  darkSurface: '#2A2A27',
  lightOnDark: '#C9C9C2',
  warm: '#EFEADD',
  purple: '#EAE7F5',
} as const;
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
  hero: 40,
} as const;
export const radius = { sm: 8, md: 14, lg: 20, card: 26, pill: 999 } as const;
export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  heading: 'Poppins_700Bold',
} as const;
export const typography = {
  title: {
    fontFamily: fonts.heading,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: colors.ink,
  },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 23,
    lineHeight: 29,
    letterSpacing: -0.5,
    color: colors.ink,
  },
  headline: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 23, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.ink },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted },
  small: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 16, color: colors.subtle },
  money: {
    fontFamily: fonts.heading,
    fontSize: 48,
    lineHeight: 58,
    letterSpacing: -1.5,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
} satisfies Record<string, TextStyle>;
