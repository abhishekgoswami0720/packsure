/**
 * Design tokens — the single source of truth for the visual language.
 *
 * These values are mirrored in tailwind.config.js so that NativeWind utility
 * classes (`bg-background`, `text-ink`, `rounded-card`, …) and any imperative
 * styling (Reanimated, SVG, StatusBar) stay perfectly in sync.
 *
 * The palette is intentionally tight and calm — inspired by Apple Health,
 * Linear, Arc, Headspace and Cash App: minimal, spacious, premium.
 */

export const palette = {
  background: '#FBF9F5',
  surface: '#FFFFFF',

  ink: '#1E221F',
  inkSecondary: '#5A635B',
  inkTertiary: '#9A9A95',

  hairline: '#ECEBE6',

  /** TruthLens brand deep forest green — the logo colour, for brand moments and accents. */
  brand: '#1B4332',
  /** Deeper green for a logo on a light background, or any accent needing contrast. */
  brandStrong: '#143628',
  brandSoft: '#E8F1EC',

  success: '#2D6A4F',
  successSoft: '#D8F3DC',

  warning: '#D97706',
  warningSoft: '#FEF3C7',

  danger: '#DC2626',
  dangerSoft: '#FEE2E2',

  white: '#FFFFFF',
  black: '#000000',
} as const;

/** 4-based spacing scale. */
export const spacing = {
  1: 4,
  2: 8,
  4: 16,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  card: 24,
  button: 16,
  pill: 999,
} as const;

export const typography = {
  hero: { fontSize: 32, lineHeight: 38 },
  heading: { fontSize: 24, lineHeight: 30 },
  section: { fontSize: 20, lineHeight: 27 },
  body: { fontSize: 17, lineHeight: 25 },
  secondary: { fontSize: 15, lineHeight: 22 },
  caption: { fontSize: 13, lineHeight: 18 },
} as const;

/** Font family keys map 1:1 to the @expo-google-fonts/inter exports. */
export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export type FontWeightToken = keyof typeof fontFamily;
export type TypographyToken = keyof typeof typography;

/** Semantic colour mapping for the three verdict states. */
export const verdictColors = {
  success: {
    fg: palette.success,
    soft: palette.successSoft,
  },
  warning: {
    fg: palette.warning,
    soft: palette.warningSoft,
  },
  danger: {
    fg: palette.danger,
    soft: palette.dangerSoft,
  },
} as const;

export type VerdictTone = keyof typeof verdictColors;
