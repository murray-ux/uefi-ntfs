/**
 * GENESIS 2.0 - Authentication Store
 * Manages user authentication state with biometrics
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

// Custom storage adapter for Expo SecureStore
const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return await SecureStore.getItemAsync(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};

// Types
export interface User {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  avatar?: string;
  roles: string[];
  mfaEnabled: boolean;
  mfaMethods: ('totp' | 'yubikey' | 'webauthn')[];
  createdAt: string;
  lastLogin: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  language: string;
  theme: 'dark' | 'light' | 'system';
  notifications: boolean;
  biometricEnabled: boolean;
  hapticFeedback: boolean;
  soundEffects: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

export interface Session {
  token: string;
  refreshToken: string;
  expiresAt: number;
  issuedAt: number;
}

export interface BiometricState {
  isAvailable: boolean;
  biometricType: 'fingerprint' | 'facial' | 'iris' | 'none';
  isEnrolled: boolean;
  isEnabled: boolean;
}

export interface AuthState {
  // User state
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Biometric state
  biometric: BiometricState;

  // MFA state
  pendingMFA: boolean;
  mfaChallenge: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Auth actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  checkSession: () => Promise<boolean>;

  // Biometric actions
  initBiometrics: () => Promise<void>;
  authenticateWithBiometrics: () => Promise<boolean>;
  enableBiometrics: (enable: boolean) => Promise<void>;

  // MFA actions
  submitMFA: (code: string, method: 'totp' | 'yubikey') => Promise<boolean>;
  cancelMFA: () => void;

  // Preferences
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
}

// API base URL (configured in env)
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      biometric: {
        isAvailable: false,
        biometricType: 'none',
        isEnrolled: false,
        isEnabled: false,
      },
      pendingMFA: false,
      mfaChallenge: null,

      // Setters
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setSession: (session) => set({ session }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Login
      login: async (username, password) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });

          const data = await response.json();

          if (!response.ok) {
            set({ error: data.error || 'Login failed', isLoading: false });
            return false;
          }

          // Check if MFA is required
          if (data.requireMFA) {
            set({
              pendingMFA: true,
              mfaChallenge: data.challenge,
              isLoading: false,
            });
            return false;
          }

          // Login successful
          const session: Session = {
            token: data.token,
            refreshToken: data.refreshToken,
            expiresAt: Date.now() + (data.expiresIn || 86400) * 1000,
            issuedAt: Date.now(),
          };

          set({
            user: data.user,
            session,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return true;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Network error';
          set({ error: message, isLoading: false });
          return false;
        }
      },

      // Logout
      logout: async () => {
        const { session } = get();

        try {
          if (session?.token) {
            await fetch(`${API_BASE}/api/logout`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.token}`,
                'Content-Type': 'application/json',
              },
            });
          }
        } catch {
          // Ignore logout errors
        }

        set({
          user: null,
          session: null,
          isAuthenticated: false,
          pendingMFA: false,
          mfaChallenge: null,
          error: null,
        });
      },

      // Refresh session
      refreshSession: async () => {
        const { session } = get();
        if (!session?.refreshToken) return false;

        try {
          const response = await fetch(`${API_BASE}/api/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: session.refreshToken }),
          });

          if (!response.ok) {
            await get().logout();
            return false;
          }

          const data = await response.json();
          const newSession: Session = {
            token: data.token,
            refreshToken: data.refreshToken || session.refreshToken,
            expiresAt: Date.now() + (data.expiresIn || 86400) * 1000,
            issuedAt: Date.now(),
          };

          set({ session: newSession });
          return true;
        } catch {
          return false;
        }
      },

      // Check session validity
      checkSession: async () => {
        const { session } = get();
        if (!session) return false;

        // Check if expired
        if (Date.now() >= session.expiresAt) {
          return await get().refreshSession();
        }

        // Verify with server
        try {
          const response = await fetch(`${API_BASE}/api/session`, {
            headers: { 'Authorization': `Bearer ${session.token}` },
          });
          return response.ok;
        } catch {
          return false;
        }
      },

      // Initialize biometrics
      initBiometrics: async () => {
        try {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

          let biometricType: 'fingerprint' | 'facial' | 'iris' | 'none' = 'none';
          if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            biometricType = 'facial';
          } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            biometricType = 'fingerprint';
          } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            biometricType = 'iris';
          }

          const stored = await SecureStore.getItemAsync('biometric_enabled');

          set({
            biometric: {
              isAvailable: hasHardware,
              biometricType,
              isEnrolled,
              isEnabled: stored === 'true' && isEnrolled,
            },
          });
        } catch {
          // Biometrics not available
        }
      },

      // Authenticate with biometrics
      authenticateWithBiometrics: async () => {
        const { biometric } = get();
        if (!biometric.isAvailable || !biometric.isEnabled) return false;

        try {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Authenticate to GENESIS',
            fallbackLabel: 'Use Password',
            cancelLabel: 'Cancel',
            disableDeviceFallback: false,
          });

          if (result.success) {
            // Get stored credentials and auto-login
            const storedCreds = await SecureStore.getItemAsync('auth_credentials');
            if (storedCreds) {
              const { username, password } = JSON.parse(storedCreds);
              return await get().login(username, password);
            }
          }

          return false;
        } catch {
          return false;
        }
      },

      // Enable/disable biometrics
      enableBiometrics: async (enable) => {
        await SecureStore.setItemAsync('biometric_enabled', enable ? 'true' : 'false');
        set((state) => ({
          biometric: { ...state.biometric, isEnabled: enable },
        }));
      },

      // Submit MFA code
      submitMFA: async (code, method) => {
        const { mfaChallenge } = get();
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`${API_BASE}/api/mfa/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              challenge: mfaChallenge,
              code,
              method,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            set({ error: data.error || 'MFA verification failed', isLoading: false });
            return false;
          }

          const session: Session = {
            token: data.token,
            refreshToken: data.refreshToken,
            expiresAt: Date.now() + (data.expiresIn || 86400) * 1000,
            issuedAt: Date.now(),
          };

          set({
            user: data.user,
            session,
            isAuthenticated: true,
            isLoading: false,
            pendingMFA: false,
            mfaChallenge: null,
            error: null,
          });

          return true;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Network error';
          set({ error: message, isLoading: false });
          return false;
        }
      },

      // Cancel MFA
      cancelMFA: () => {
        set({
          pendingMFA: false,
          mfaChallenge: null,
          error: null,
        });
      },

      // Update preferences
      updatePreferences: async (prefs) => {
        const { user, session } = get();
        if (!user || !session) return;

        const newPrefs = { ...user.preferences, ...prefs };

        try {
          await fetch(`${API_BASE}/api/settings`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ preferences: newPrefs }),
          });

          set({
            user: { ...user, preferences: newPrefs },
          });
        } catch {
          // Handle error silently
        }
      },
    }),
    {
      name: 'genesis-auth',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
