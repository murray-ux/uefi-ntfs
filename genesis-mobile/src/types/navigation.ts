/**
 * GENESIS 2.0 - Navigation Type Definitions
 * Properly typed navigation parameters
 */

import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Root stack parameter list
export type RootStackParamList = {
  // Auth screens
  Login: undefined;
  MFA: { challenge: string };

  // Main tabs
  Main: NavigatorScreenParams<MainTabParamList>;

  // Stack screens
  DeviceDetail: { deviceId: string };
  AlertDetail: { alertId: string };
  Pentagon: undefined;
  AuditLog: undefined;
  DocumentSigning: undefined;
  YubiKey: undefined;
};

// Main tab parameter list
export type MainTabParamList = {
  Dashboard: undefined;
  Security: undefined;
  Devices: undefined;
  AIAssistant: undefined;
  Settings: undefined;
};

// Navigation prop types
export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;

// Combined navigation prop (for screens that need both)
export type CombinedNavigationProp = RootStackNavigationProp & MainTabNavigationProp;

// Screen props with route params
export type DeviceDetailRouteParams = {
  deviceId: string;
};

export type AlertDetailRouteParams = {
  alertId: string;
};

export type MFARouteParams = {
  challenge: string;
};

// Helper type for useNavigation hook
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
