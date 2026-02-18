/**
 * GENESIS 2.0 - RGB Cyberpunk Color System
 * Matches the web UI aesthetic
 */

export const colors = {
  // Core RGB Palette
  cyan: {
    50: '#e0ffff',
    100: '#b3ffff',
    200: '#80ffff',
    300: '#4dffff',
    400: '#1affff',
    500: '#00ffff', // Primary cyan
    600: '#00cccc',
    700: '#009999',
    800: '#006666',
    900: '#003333',
  },
  magenta: {
    50: '#ffe0ff',
    100: '#ffb3ff',
    200: '#ff80ff',
    300: '#ff4dff',
    400: '#ff1aff',
    500: '#ff00ff', // Primary magenta
    600: '#cc00cc',
    700: '#990099',
    800: '#660066',
    900: '#330033',
  },
  yellow: {
    50: '#fffde0',
    100: '#fffab3',
    200: '#fff780',
    300: '#fff44d',
    400: '#fff11a',
    500: '#ffee00', // Primary yellow
    600: '#ccbe00',
    700: '#998f00',
    800: '#665f00',
    900: '#333000',
  },
  green: {
    50: '#e0ffe0',
    100: '#b3ffb3',
    200: '#80ff80',
    300: '#4dff4d',
    400: '#1aff1a',
    500: '#00ff00', // Matrix green
    600: '#00cc00',
    700: '#009900',
    800: '#006600',
    900: '#003300',
  },
  orange: {
    50: '#fff4e0',
    100: '#ffe6b3',
    200: '#ffd580',
    300: '#ffc44d',
    400: '#ffb31a',
    500: '#ff9500', // Warning orange
    600: '#cc7700',
    700: '#995900',
    800: '#663c00',
    900: '#331e00',
  },
  purple: {
    50: '#f0e0ff',
    100: '#dab3ff',
    200: '#c480ff',
    300: '#ae4dff',
    400: '#981aff',
    500: '#8b00ff', // Deep purple
    600: '#6f00cc',
    700: '#530099',
    800: '#380066',
    900: '#1c0033',
  },
  pink: {
    50: '#ffe0f0',
    100: '#ffb3da',
    200: '#ff80c4',
    300: '#ff4dae',
    400: '#ff1a98',
    500: '#ff0080', // Hot pink
    600: '#cc0066',
    700: '#99004d',
    800: '#660033',
    900: '#33001a',
  },
  blue: {
    50: '#e0f0ff',
    100: '#b3daff',
    200: '#80c4ff',
    300: '#4daeff',
    400: '#1a98ff',
    500: '#0080ff', // Electric blue
    600: '#0066cc',
    700: '#004d99',
    800: '#003366',
    900: '#001a33',
  },
  red: {
    50: '#ffe0e0',
    100: '#ffb3b3',
    200: '#ff8080',
    300: '#ff4d4d',
    400: '#ff1a1a',
    500: '#ff0000', // Alert red
    600: '#cc0000',
    700: '#990000',
    800: '#660000',
    900: '#330000',
  },

  // Background gradients (dark theme)
  background: {
    primary: '#0a0a0f',
    secondary: '#0f0f1a',
    tertiary: '#141428',
    card: '#1a1a2e',
    elevated: '#1f1f3a',
    overlay: 'rgba(10, 10, 15, 0.95)',
    glass: 'rgba(26, 26, 46, 0.7)',
    glassDark: 'rgba(10, 10, 15, 0.85)',
  },

  // Text colors
  text: {
    primary: '#ffffff',
    secondary: '#a0a0b0',
    tertiary: '#707080',
    muted: '#505060',
    inverse: '#0a0a0f',
    link: '#00ffff',
    success: '#00ff00',
    warning: '#ff9500',
    error: '#ff0000',
  },

  // Semantic colors
  semantic: {
    success: '#00ff00',
    warning: '#ff9500',
    error: '#ff0000',
    info: '#00ffff',
    neutral: '#a0a0b0',
  },

  // Glow effects
  glow: {
    cyan: 'rgba(0, 255, 255, 0.5)',
    magenta: 'rgba(255, 0, 255, 0.5)',
    green: 'rgba(0, 255, 0, 0.5)',
    yellow: 'rgba(255, 238, 0, 0.5)',
    orange: 'rgba(255, 149, 0, 0.5)',
    red: 'rgba(255, 0, 0, 0.5)',
    purple: 'rgba(139, 0, 255, 0.5)',
    blue: 'rgba(0, 128, 255, 0.5)',
  },

  // Border colors
  border: {
    default: 'rgba(0, 255, 255, 0.2)',
    active: 'rgba(0, 255, 255, 0.5)',
    error: 'rgba(255, 0, 0, 0.5)',
    success: 'rgba(0, 255, 0, 0.5)',
  },

  // Special effects
  effects: {
    scanline: 'rgba(0, 255, 255, 0.03)',
    noise: 'rgba(255, 255, 255, 0.02)',
    hologram: 'linear-gradient(45deg, rgba(0, 255, 255, 0.1), rgba(255, 0, 255, 0.1))',
  },
} as const;

// RGB color cycling for animations
export const rgbCycle = [
  colors.cyan[500],
  colors.magenta[500],
  colors.yellow[500],
  colors.green[500],
  colors.orange[500],
  colors.purple[500],
  colors.pink[500],
  colors.blue[500],
];

// Status colors for different security states
export const statusColors = {
  secure: colors.green[500],
  warning: colors.orange[500],
  critical: colors.red[500],
  unknown: colors.text.tertiary,
  scanning: colors.cyan[500],
  offline: colors.text.muted,
};

// Pentagon layer colors
export const pentagonColors = {
  kernel: colors.red[500],
  conduit: colors.orange[500],
  reservoir: colors.yellow[500],
  valve: colors.green[500],
  manifold: colors.cyan[500],
};

export type ColorName = keyof typeof colors;
