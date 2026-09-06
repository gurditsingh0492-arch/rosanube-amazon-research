/**
 * Rosanube brand palette. "Rosa" (rose) accent on a cool neutral base so that
 * money figures and status badges stay the loudest thing on every screen.
 */
export const colors = {
  bg: '#F5F6FA',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFAFC',
  border: '#E4E6ED',
  text: '#111827',
  textMuted: '#6B7280',
  textFaint: '#9CA3AF',

  primary: '#D6336C',
  primaryDark: '#A61E4D',
  primarySoft: '#FDE8F0',

  success: '#15803D',
  successSoft: '#DCFCE7',
  warn: '#B45309',
  warnSoft: '#FEF3C7',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  info: '#1D4ED8',
  infoSoft: '#DBEAFE',
  neutralSoft: '#EEF0F4',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const font = {
  h1: { fontSize: 26, fontWeight: '700' },
  h2: { fontSize: 19, fontWeight: '700' },
  h3: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  small: { fontSize: 13, fontWeight: '400' },
  tiny: { fontSize: 11, fontWeight: '600' },
} as const;

export const shadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
} as const;
