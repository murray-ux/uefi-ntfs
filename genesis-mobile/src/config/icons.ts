/**
 * GENESIS 2.0 - Icon Type Definitions
 * Centralized icon names with proper typing for Ionicons
 */

import { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

// Valid Ionicons name type
export type IconName = ComponentProps<typeof Ionicons>['name'];

// Security status icons
export const SecurityIcons = {
  shield: 'shield' as IconName,
  shieldCheckmark: 'shield-checkmark' as IconName,
  shieldOutline: 'shield-outline' as IconName,
  warning: 'warning' as IconName,
  warningOutline: 'warning-outline' as IconName,
  alertCircle: 'alert-circle' as IconName,
  alertCircleOutline: 'alert-circle-outline' as IconName,
  checkmarkCircle: 'checkmark-circle' as IconName,
  closeCircle: 'close-circle' as IconName,
  lockClosed: 'lock-closed' as IconName,
  lockOpen: 'lock-open' as IconName,
  key: 'key' as IconName,
  keyOutline: 'key-outline' as IconName,
  fingerPrint: 'finger-print' as IconName,
  eye: 'eye' as IconName,
  eyeOff: 'eye-off' as IconName,
} as const;

// Navigation icons
export const NavIcons = {
  home: 'home' as IconName,
  homeOutline: 'home-outline' as IconName,
  settings: 'settings' as IconName,
  settingsOutline: 'settings-outline' as IconName,
  person: 'person' as IconName,
  personOutline: 'person-outline' as IconName,
  menu: 'menu' as IconName,
  close: 'close' as IconName,
  arrowBack: 'arrow-back' as IconName,
  arrowForward: 'arrow-forward' as IconName,
  chevronBack: 'chevron-back' as IconName,
  chevronForward: 'chevron-forward' as IconName,
  chevronDown: 'chevron-down' as IconName,
  chevronUp: 'chevron-up' as IconName,
} as const;

// Device icons
export const DeviceIcons = {
  phone: 'phone-portrait' as IconName,
  tablet: 'tablet-portrait' as IconName,
  laptop: 'laptop' as IconName,
  desktop: 'desktop' as IconName,
  watch: 'watch' as IconName,
  hardware: 'hardware-chip' as IconName,
  wifi: 'wifi' as IconName,
  bluetooth: 'bluetooth' as IconName,
  cellular: 'cellular' as IconName,
  globe: 'globe' as IconName,
  server: 'server' as IconName,
  cloud: 'cloud' as IconName,
} as const;

// Action icons
export const ActionIcons = {
  add: 'add' as IconName,
  remove: 'remove' as IconName,
  create: 'create' as IconName,
  trash: 'trash' as IconName,
  refresh: 'refresh' as IconName,
  reload: 'reload' as IconName,
  sync: 'sync' as IconName,
  download: 'download' as IconName,
  upload: 'cloud-upload' as IconName,
  share: 'share' as IconName,
  copy: 'copy' as IconName,
  send: 'send' as IconName,
  scan: 'scan' as IconName,
  qrCode: 'qr-code' as IconName,
  camera: 'camera' as IconName,
} as const;

// Status icons
export const StatusIcons = {
  online: 'ellipse' as IconName,
  offline: 'ellipse-outline' as IconName,
  loading: 'hourglass' as IconName,
  success: 'checkmark' as IconName,
  error: 'close' as IconName,
  info: 'information-circle' as IconName,
  help: 'help-circle' as IconName,
  time: 'time' as IconName,
  calendar: 'calendar' as IconName,
  notifications: 'notifications' as IconName,
  notificationsOff: 'notifications-off' as IconName,
} as const;

// Feature icons
export const FeatureIcons = {
  analytics: 'analytics' as IconName,
  pulse: 'pulse' as IconName,
  speedometer: 'speedometer' as IconName,
  barChart: 'bar-chart' as IconName,
  pieChart: 'pie-chart' as IconName,
  document: 'document' as IconName,
  documentText: 'document-text' as IconName,
  folder: 'folder' as IconName,
  chatbubble: 'chatbubble' as IconName,
  chatbubbles: 'chatbubbles' as IconName,
  mic: 'mic' as IconName,
  micOff: 'mic-off' as IconName,
  volumeHigh: 'volume-high' as IconName,
  volumeMute: 'volume-mute' as IconName,
} as const;

// Pentagon layer icons
export const PentagonIcons = {
  perimeter: 'globe-outline' as IconName,
  network: 'git-network-outline' as IconName,
  endpoint: 'hardware-chip-outline' as IconName,
  application: 'apps-outline' as IconName,
  data: 'server-outline' as IconName,
} as const;

// Alert severity icons
export const AlertIcons = {
  critical: 'alert-circle' as IconName,
  high: 'warning' as IconName,
  medium: 'information-circle' as IconName,
  low: 'checkmark-circle' as IconName,
  info: 'information' as IconName,
} as const;

// YubiKey / NFC icons
export const NFCIcons = {
  nfc: 'radio' as IconName,
  key: 'key' as IconName,
  card: 'card' as IconName,
  contactless: 'cellular' as IconName,
} as const;

// Helper function to get icon by category and name
export const getIcon = (category: string, name: string): IconName => {
  const categories: Record<string, Record<string, IconName>> = {
    security: SecurityIcons,
    nav: NavIcons,
    device: DeviceIcons,
    action: ActionIcons,
    status: StatusIcons,
    feature: FeatureIcons,
    pentagon: PentagonIcons,
    alert: AlertIcons,
    nfc: NFCIcons,
  };

  const iconSet = categories[category];
  if (iconSet && name in iconSet) {
    return iconSet[name as keyof typeof iconSet];
  }

  return 'help-circle' as IconName;
};
