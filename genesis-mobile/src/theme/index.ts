/**
 * GENESIS 2.0 - Theme System
 * Unified export for all theme values
 */

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './animations';

import { colors, rgbCycle, statusColors, pentagonColors } from './colors';
import { fonts, fontWeights, fontSizes, lineHeights, letterSpacings, textStyles } from './typography';
import { spacing, layout, borderRadius, borderWidth, shadows } from './spacing';
import { durations, easings, springs, keyframes, transitions } from './animations';

// Complete theme object
export const theme = {
  colors,
  rgbCycle,
  statusColors,
  pentagonColors,
  fonts,
  fontWeights,
  fontSizes,
  lineHeights,
  letterSpacings,
  textStyles,
  spacing,
  layout,
  borderRadius,
  borderWidth,
  shadows,
  durations,
  easings,
  springs,
  keyframes,
  transitions,
} as const;

export type Theme = typeof theme;

// Helper to get color with opacity
export function withOpacity(color: string, opacity: number): string {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  // Handle rgb colors
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
  }
  // Handle rgba - replace existing opacity
  if (color.startsWith('rgba(')) {
    return color.replace(/[\d.]+\)$/, `${opacity})`);
  }
  return color;
}

// Helper to create glass effect style
export function glassStyle(options?: { blur?: number; opacity?: number; borderOpacity?: number }) {
  const { blur = 10, opacity = 0.7, borderOpacity = 0.2 } = options || {};
  return {
    backgroundColor: withOpacity(colors.background.card, opacity),
    borderWidth: borderWidth.thin,
    borderColor: withOpacity(colors.cyan[500], borderOpacity),
    // Note: blur requires BlurView component in React Native
  };
}

// Helper to create neon glow style
export function neonGlowStyle(color: string, intensity: 'low' | 'medium' | 'high' = 'medium') {
  const opacityMap = { low: 0.3, medium: 0.5, high: 0.8 };
  const radiusMap = { low: 5, medium: 10, high: 20 };

  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: opacityMap[intensity],
    shadowRadius: radiusMap[intensity],
    elevation: radiusMap[intensity],
  };
}

// Helper to create text glow style
export function textGlowStyle(color: string) {
  return {
    textShadowColor: color,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  };
}

export default theme;
