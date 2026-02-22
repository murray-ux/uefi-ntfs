/**
 * GENESIS 2.0 - App Navigation
 * Main navigation structure
 */

import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { StyleSheet, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, textStyles } from '../theme';
import { useAuthStore } from '../store/authStore';
import { useSecurityStore } from '../store/securityStore';

// Screens
import LoginScreen from '../screens/LoginScreen';
import MFAScreen from '../screens/MFAScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SecurityScreen from '../screens/SecurityScreen';
import DevicesScreen from '../screens/DevicesScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PentagonScreen from '../screens/PentagonScreen';
import AuditLogScreen from '../screens/AuditLogScreen';
import DocumentSignScreen from '../screens/DocumentSignScreen';
import YubiKeyScreen from '../screens/YubiKeyScreen';
import AlertDetailScreen from '../screens/AlertDetailScreen';
import DeviceDetailScreen from '../screens/DeviceDetailScreen';

// Navigation theme
const GenesisTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.cyan[500],
    background: colors.background.primary,
    card: colors.background.card,
    text: colors.text.primary,
    border: colors.border.default,
    notification: colors.red[500],
  },
};

// Type definitions
export type RootStackParamList = {
  Auth: undefined;
  MFA: { challenge: string };
  Main: undefined;
  Pentagon: undefined;
  AuditLog: undefined;
  DocumentSign: undefined;
  YubiKey: undefined;
  AlertDetail: { alertId: string };
  DeviceDetail: { deviceId: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Security: undefined;
  Devices: undefined;
  AI: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Tab bar icon component
function TabIcon({
  name,
  focused,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
}) {
  return (
    <View style={[styles.tabIconContainer, focused && styles.tabIconFocused]}>
      <Ionicons name={name} size={24} color={color} />
      {focused && <View style={[styles.tabIndicator, { backgroundColor: color }]} />}
    </View>
  );
}

// Main tab navigator
function MainTabs() {
  const unacknowledgedCount = useSecurityStore((s) => s.unacknowledgedCount);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        ),
        tabBarActiveTintColor: colors.cyan[500],
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="grid" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Security"
        component={SecurityScreen}
        options={{
          tabBarLabel: 'Security',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="shield" focused={focused} color={color} />
          ),
          tabBarBadge: unacknowledgedCount > 0 ? unacknowledgedCount : undefined,
          tabBarBadgeStyle: styles.tabBadge,
        }}
      />
      <Tab.Screen
        name="Devices"
        component={DevicesScreen}
        options={{
          tabBarLabel: 'Devices',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="hardware-chip" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AI"
        component={AIAssistantScreen}
        options={{
          tabBarLabel: 'AI',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="sparkles" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="cog" focused={focused} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Main app navigator
export default function AppNavigator() {
  const { isAuthenticated, pendingMFA, mfaChallenge } = useAuthStore();

  return (
    <NavigationContainer theme={GenesisTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.background.primary },
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen
              name="Auth"
              component={LoginScreen}
              options={{ animationTypeForReplace: 'pop' }}
            />
            {pendingMFA && mfaChallenge && (
              <Stack.Screen
                name="MFA"
                component={MFAScreen}
                initialParams={{ challenge: mfaChallenge }}
              />
            )}
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Pentagon"
              component={PentagonScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="AuditLog"
              component={AuditLogScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="DocumentSign"
              component={DocumentSignScreen}
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="YubiKey"
              component={YubiKeyScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="AlertDetail"
              component={AlertDetailScreen}
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="DeviceDetail"
              component={DeviceDetailScreen}
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingTop: 8,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    elevation: 0,
  },
  tabLabel: {
    ...textStyles.caption,
    marginTop: 4,
    marginBottom: Platform.OS === 'ios' ? 0 : 8,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  tabIconFocused: {
    transform: [{ scale: 1.1 }],
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  tabBadge: {
    backgroundColor: colors.red[500],
    fontSize: 10,
    fontWeight: 'bold',
    minWidth: 18,
    height: 18,
  },
});
