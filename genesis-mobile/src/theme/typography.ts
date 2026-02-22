/**
 * GENESIS 2.0 - Typography System
 * Futuristic fonts matching web UI
 */

import { TextStyle } from 'react-native';

// Font families (loaded via expo-font)
export const fonts = {
  display: 'Orbitron',        // Futuristic display font
  body: 'Rajdhani',           // Clean body text
  mono: 'ShareTechMono',      // Terminal/code font
  system: 'System',           // Fallback
} as const;

// Font weights
export const fontWeights = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
};

// Font sizes
export const fontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
  '7xl': 72,
} as const;

// Line heights
export const lineHeights = {
  tight: 1.1,
  snug: 1.25,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

// Letter spacing
export const letterSpacings = {
  tighter: -0.8,
  tight: -0.4,
  normal: 0,
  wide: 0.4,
  wider: 0.8,
  widest: 1.6,
  ultra: 4,
} as const;

// Pre-defined text styles
export const textStyles: Record<string, TextStyle> = {
  // Display styles (Orbitron)
  displayHero: {
    fontFamily: fonts.display,
    fontSize: fontSizes['6xl'],
    fontWeight: fontWeights.black,
    letterSpacing: letterSpacings.wider,
    lineHeight: fontSizes['6xl'] * lineHeights.tight,
    textTransform: 'uppercase',
  },
  displayLarge: {
    fontFamily: fonts.display,
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.wide,
    lineHeight: fontSizes['4xl'] * lineHeights.tight,
    textTransform: 'uppercase',
  },
  displayMedium: {
    fontFamily: fonts.display,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.wide,
    lineHeight: fontSizes['2xl'] * lineHeights.snug,
    textTransform: 'uppercase',
  },
  displaySmall: {
    fontFamily: fonts.display,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.wide,
    lineHeight: fontSizes.lg * lineHeights.snug,
    textTransform: 'uppercase',
  },

  // Heading styles (Rajdhani)
  h1: {
    fontFamily: fonts.body,
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.tight,
    lineHeight: fontSizes['3xl'] * lineHeights.snug,
  },
  h2: {
    fontFamily: fonts.body,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.tight,
    lineHeight: fontSizes['2xl'] * lineHeights.snug,
  },
  h3: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.normal,
    lineHeight: fontSizes.xl * lineHeights.snug,
  },
  h4: {
    fontFamily: fonts.body,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacings.normal,
    lineHeight: fontSizes.lg * lineHeights.normal,
  },

  // Body styles (Rajdhani)
  bodyLarge: {
    fontFamily: fonts.body,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacings.normal,
    lineHeight: fontSizes.lg * lineHeights.relaxed,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacings.normal,
    lineHeight: fontSizes.base * lineHeights.relaxed,
  },
  bodySmall: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacings.normal,
    lineHeight: fontSizes.md * lineHeights.relaxed,
  },

  // Mono styles (ShareTechMono)
  codeLarge: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacings.normal,
    lineHeight: fontSizes.base * lineHeights.normal,
  },
  code: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacings.normal,
    lineHeight: fontSizes.md * lineHeights.normal,
  },
  codeSmall: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacings.normal,
    lineHeight: fontSizes.sm * lineHeights.normal,
  },

  // UI text styles
  label: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacings.wider,
    lineHeight: fontSizes.sm * lineHeights.normal,
    textTransform: 'uppercase',
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacings.wide,
    lineHeight: fontSizes.xs * lineHeights.normal,
  },
  button: {
    fontFamily: fonts.display,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.wider,
    lineHeight: fontSizes.md * lineHeights.tight,
    textTransform: 'uppercase',
  },
  buttonSmall: {
    fontFamily: fonts.display,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.wider,
    lineHeight: fontSizes.sm * lineHeights.tight,
    textTransform: 'uppercase',
  },

  // Special styles
  terminal: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacings.normal,
    lineHeight: fontSizes.md * lineHeights.relaxed,
  },
  status: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacings.widest,
    lineHeight: fontSizes.xs * lineHeights.tight,
    textTransform: 'uppercase',
  },
  badge: {
    fontFamily: fonts.display,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.ultra,
    lineHeight: fontSizes.xs * lineHeights.tight,
    textTransform: 'uppercase',
  },
};

export type TextStyleName = keyof typeof textStyles;
