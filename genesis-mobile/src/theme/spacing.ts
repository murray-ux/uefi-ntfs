/**
 * GENESIS 2.0 - Spacing System
 * Consistent spacing throughout the app
 */

// Base spacing unit (4px)
const BASE = 4;

export const spacing = {
  0: 0,
  px: 1,
  0.5: BASE * 0.5,   // 2
  1: BASE * 1,       // 4
  1.5: BASE * 1.5,   // 6
  2: BASE * 2,       // 8
  2.5: BASE * 2.5,   // 10
  3: BASE * 3,       // 12
  3.5: BASE * 3.5,   // 14
  4: BASE * 4,       // 16
  5: BASE * 5,       // 20
  6: BASE * 6,       // 24
  7: BASE * 7,       // 28
  8: BASE * 8,       // 32
  9: BASE * 9,       // 36
  10: BASE * 10,     // 40
  11: BASE * 11,     // 44
  12: BASE * 12,     // 48
  14: BASE * 14,     // 56
  16: BASE * 16,     // 64
  20: BASE * 20,     // 80
  24: BASE * 24,     // 96
  28: BASE * 28,     // 112
  32: BASE * 32,     // 128
  36: BASE * 36,     // 144
  40: BASE * 40,     // 160
  44: BASE * 44,     // 176
  48: BASE * 48,     // 192
  52: BASE * 52,     // 208
  56: BASE * 56,     // 224
  60: BASE * 60,     // 240
  64: BASE * 64,     // 256
  72: BASE * 72,     // 288
  80: BASE * 80,     // 320
  96: BASE * 96,     // 384
} as const;

// Semantic spacing
export const layout = {
  // Screen padding
  screenPaddingHorizontal: spacing[4],
  screenPaddingVertical: spacing[6],

  // Card padding
  cardPadding: spacing[4],
  cardPaddingLarge: spacing[6],

  // Section spacing
  sectionGap: spacing[8],
  sectionGapLarge: spacing[12],

  // Component spacing
  componentGap: spacing[4],
  componentGapSmall: spacing[2],
  componentGapLarge: spacing[6],

  // Input spacing
  inputPaddingHorizontal: spacing[4],
  inputPaddingVertical: spacing[3],

  // Button spacing
  buttonPaddingHorizontal: spacing[6],
  buttonPaddingVertical: spacing[3],

  // List spacing
  listItemGap: spacing[2],
  listItemPadding: spacing[4],

  // Icon spacing
  iconMargin: spacing[2],
  iconSize: spacing[6],
  iconSizeSmall: spacing[5],
  iconSizeLarge: spacing[8],

  // Avatar sizes
  avatarSmall: spacing[8],
  avatarMedium: spacing[12],
  avatarLarge: spacing[16],
  avatarXLarge: spacing[24],

  // Header heights
  headerHeight: spacing[14],
  tabBarHeight: spacing[20],

  // Bottom sheet
  bottomSheetHandle: spacing[1],
  bottomSheetHandleWidth: spacing[10],

  // Modal
  modalPadding: spacing[6],
  modalBorderRadius: spacing[4],
} as const;

// Border radii
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

// Border widths
export const borderWidth = {
  none: 0,
  hairline: 0.5,
  thin: 1,
  medium: 2,
  thick: 3,
  heavy: 4,
} as const;

// Shadows
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 12,
  },
  '2xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.51,
    shadowRadius: 13.16,
    elevation: 20,
  },
  // Glow shadows (for cyberpunk effect)
  glowCyan: {
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  glowMagenta: {
    shadowColor: '#ff00ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  glowGreen: {
    shadowColor: '#00ff00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  glowRed: {
    shadowColor: '#ff0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
} as const;

export type SpacingKey = keyof typeof spacing;
export type BorderRadiusKey = keyof typeof borderRadius;
export type ShadowKey = keyof typeof shadows;
