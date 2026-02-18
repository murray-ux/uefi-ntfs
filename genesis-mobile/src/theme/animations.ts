/**
 * GENESIS 2.0 - Animation Configuration
 * Reanimated animations for cyberpunk effects
 */

import { Easing } from 'react-native-reanimated';

// Animation durations
export const durations = {
  instant: 0,
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 1000,
  glacial: 2000,

  // Specific animations
  fadeIn: 200,
  fadeOut: 150,
  slideIn: 300,
  slideOut: 250,
  scale: 200,
  bounce: 400,
  pulse: 1500,
  glow: 2000,
  scanline: 3000,
  rgbShift: 5000,
  matrixRain: 10000,
} as const;

// Easing functions
export const easings = {
  // Standard
  linear: Easing.linear,
  ease: Easing.ease,
  easeIn: Easing.in(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  easeInOut: Easing.inOut(Easing.ease),

  // Cubic
  cubicIn: Easing.in(Easing.cubic),
  cubicOut: Easing.out(Easing.cubic),
  cubicInOut: Easing.inOut(Easing.cubic),

  // Elastic
  elasticIn: Easing.in(Easing.elastic(1)),
  elasticOut: Easing.out(Easing.elastic(1)),
  elasticInOut: Easing.inOut(Easing.elastic(1)),

  // Bounce
  bounceIn: Easing.in(Easing.bounce),
  bounceOut: Easing.out(Easing.bounce),
  bounceInOut: Easing.inOut(Easing.bounce),

  // Back
  backIn: Easing.in(Easing.back(1.5)),
  backOut: Easing.out(Easing.back(1.5)),
  backInOut: Easing.inOut(Easing.back(1.5)),

  // Bezier curves
  sharp: Easing.bezier(0.4, 0, 0.6, 1),
  smooth: Easing.bezier(0.4, 0, 0.2, 1),
  decelerate: Easing.bezier(0, 0, 0.2, 1),
  accelerate: Easing.bezier(0.4, 0, 1, 1),

  // Cyberpunk specific
  glitch: Easing.bezier(0.68, -0.55, 0.265, 1.55),
  neon: Easing.bezier(0.175, 0.885, 0.32, 1.275),
} as const;

// Spring configurations
export const springs = {
  default: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  gentle: {
    damping: 20,
    stiffness: 100,
    mass: 1,
  },
  bouncy: {
    damping: 10,
    stiffness: 200,
    mass: 0.8,
  },
  stiff: {
    damping: 25,
    stiffness: 300,
    mass: 1,
  },
  slow: {
    damping: 20,
    stiffness: 80,
    mass: 1.5,
  },
  // For buttons/interactions
  button: {
    damping: 12,
    stiffness: 400,
    mass: 0.5,
  },
  // For modal/sheet animations
  modal: {
    damping: 18,
    stiffness: 200,
    mass: 1,
  },
  // For drag gestures
  drag: {
    damping: 22,
    stiffness: 120,
    mass: 1,
  },
} as const;

// Keyframe definitions for complex animations
export const keyframes = {
  // Pulse animation (for status indicators)
  pulse: {
    0: { opacity: 1, scale: 1 },
    50: { opacity: 0.5, scale: 1.05 },
    100: { opacity: 1, scale: 1 },
  },

  // Glow animation (for active elements)
  glow: {
    0: { shadowOpacity: 0.3 },
    50: { shadowOpacity: 0.8 },
    100: { shadowOpacity: 0.3 },
  },

  // Scanline effect
  scanline: {
    0: { translateY: '-100%' },
    100: { translateY: '100%' },
  },

  // RGB shift (color cycling)
  rgbShift: {
    0: { hue: 0 },
    33: { hue: 120 },
    66: { hue: 240 },
    100: { hue: 360 },
  },

  // Glitch effect
  glitch: {
    0: { translateX: 0, opacity: 1 },
    10: { translateX: -5, opacity: 0.8 },
    20: { translateX: 5, opacity: 1 },
    30: { translateX: -3, opacity: 0.9 },
    40: { translateX: 3, opacity: 1 },
    50: { translateX: 0, opacity: 1 },
    100: { translateX: 0, opacity: 1 },
  },

  // Neon flicker
  neonFlicker: {
    0: { opacity: 1 },
    10: { opacity: 0.8 },
    12: { opacity: 1 },
    20: { opacity: 0.9 },
    22: { opacity: 1 },
    50: { opacity: 1 },
    52: { opacity: 0.7 },
    54: { opacity: 1 },
    100: { opacity: 1 },
  },

  // Hologram shimmer
  hologramShimmer: {
    0: { translateX: '-100%', opacity: 0 },
    50: { opacity: 0.5 },
    100: { translateX: '100%', opacity: 0 },
  },

  // Matrix rain (single drop)
  matrixDrop: {
    0: { translateY: '-100%', opacity: 0 },
    10: { opacity: 1 },
    90: { opacity: 1 },
    100: { translateY: '100%', opacity: 0 },
  },

  // Typing cursor
  cursor: {
    0: { opacity: 1 },
    50: { opacity: 0 },
    100: { opacity: 1 },
  },

  // Loading spinner
  spin: {
    0: { rotate: '0deg' },
    100: { rotate: '360deg' },
  },

  // Shake (for errors)
  shake: {
    0: { translateX: 0 },
    10: { translateX: -10 },
    20: { translateX: 10 },
    30: { translateX: -10 },
    40: { translateX: 10 },
    50: { translateX: -5 },
    60: { translateX: 5 },
    70: { translateX: -5 },
    80: { translateX: 5 },
    90: { translateX: -2 },
    100: { translateX: 0 },
  },
} as const;

// Transition presets
export const transitions = {
  fadeIn: {
    duration: durations.fadeIn,
    easing: easings.easeOut,
  },
  fadeOut: {
    duration: durations.fadeOut,
    easing: easings.easeIn,
  },
  slideUp: {
    duration: durations.slideIn,
    easing: easings.decelerate,
  },
  slideDown: {
    duration: durations.slideOut,
    easing: easings.accelerate,
  },
  scale: {
    duration: durations.scale,
    easing: easings.smooth,
  },
  spring: springs.default,
  bouncy: springs.bouncy,
} as const;

export type DurationKey = keyof typeof durations;
export type EasingKey = keyof typeof easings;
export type SpringKey = keyof typeof springs;
export type KeyframeKey = keyof typeof keyframes;
