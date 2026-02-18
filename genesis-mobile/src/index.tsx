/**
 * GENESIS 2.0 - Mobile App Entry Point
 * Sovereign Security Platform for iOS
 */

import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View, StyleSheet } from 'react-native';

import { colors } from './theme';
import { useAuthStore } from './store/authStore';
import { notificationService } from './services/notifications';
import { nfcService } from './services/nfc';
import AppNavigator from './navigation/AppNavigator';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Custom fonts
const customFonts = {
  Orbitron: require('./assets/fonts/Orbitron-Regular.ttf'),
  'Orbitron-Bold': require('./assets/fonts/Orbitron-Bold.ttf'),
  'Orbitron-Black': require('./assets/fonts/Orbitron-Black.ttf'),
  Rajdhani: require('./assets/fonts/Rajdhani-Regular.ttf'),
  'Rajdhani-Medium': require('./assets/fonts/Rajdhani-Medium.ttf'),
  'Rajdhani-SemiBold': require('./assets/fonts/Rajdhani-SemiBold.ttf'),
  'Rajdhani-Bold': require('./assets/fonts/Rajdhani-Bold.ttf'),
  ShareTechMono: require('./assets/fonts/ShareTechMono-Regular.ttf'),
};

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const { initBiometrics, checkSession } = useAuthStore();

  useEffect(() => {
    async function prepare() {
      try {
        // Load fonts
        await Font.loadAsync(customFonts);

        // Initialize biometrics
        await initBiometrics();

        // Initialize notifications
        await notificationService.init();

        // Initialize NFC
        await nfcService.init();

        // Check existing session
        await checkSession();

        // Artificial delay for splash (optional)
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.warn('App initialization error:', error);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, [initBiometrics, checkSession]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <View style={styles.container} onLayout={onLayoutRootView}>
            <StatusBar style="light" backgroundColor={colors.background.primary} />
            <AppNavigator />
          </View>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
});
