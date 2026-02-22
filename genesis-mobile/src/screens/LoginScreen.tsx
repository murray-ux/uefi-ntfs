/**
 * GENESIS 2.0 - Login Screen
 * Cyberpunk aesthetic with biometric authentication
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, textStyles, spacing, borderRadius, shadows } from '../theme';
import { useAuthStore } from '../store/authStore';

const { width, height } = Dimensions.get('window');

// Animated matrix rain effect
function MatrixRain() {
  const columns = Math.floor(width / 20);
  const chars = 'GENESIS20アイウエオカキクケコ01';

  return (
    <View style={styles.matrixContainer} pointerEvents="none">
      {Array.from({ length: columns }).map((_, i) => (
        <MatrixColumn key={i} delay={i * 100} chars={chars} />
      ))}
    </View>
  );
}

function MatrixColumn({ delay, chars }: { delay: number; chars: string }) {
  const translateY = useRef(new Animated.Value(-height)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      translateY.setValue(-height);
      opacity.setValue(0);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: height,
            duration: 10000 + Math.random() * 5000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.3,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 8000,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start(animate);
    };

    animate();
  }, [translateY, opacity, delay]);

  const randomChar = chars[Math.floor(Math.random() * chars.length)];

  return (
    <Animated.Text
      style={[
        styles.matrixChar,
        {
          transform: [{ translateY }],
          opacity,
          left: Math.random() * width,
        },
      ]}
    >
      {randomChar}
    </Animated.Text>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'username' | 'password' | null>(null);

  const {
    login,
    authenticateWithBiometrics,
    isLoading,
    error,
    biometric,
    setError,
  } = useAuthStore();

  // Animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animations
    Animated.sequence([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [logoScale, formOpacity, glowAnim]);

  // Shake on error
  useEffect(() => {
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [error, shakeAnim]);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await login(username.trim(), password);
  };

  const handleBiometric = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await authenticateWithBiometrics();
  };

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.cyan[500], colors.magenta[500]],
  });

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={[colors.background.primary, '#0a0a20', colors.background.secondary]}
        style={StyleSheet.absoluteFill}
      />

      {/* Matrix rain effect */}
      <MatrixRain />

      {/* Grid overlay */}
      <View style={styles.gridOverlay} pointerEvents="none" />

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + spacing[10], paddingBottom: insets.bottom + spacing[10] },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
            <Animated.View style={[styles.logoGlow, { shadowColor: glowColor }]}>
              <LinearGradient
                colors={[colors.cyan[500], colors.magenta[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
              >
                <Ionicons name="shield-checkmark" size={48} color={colors.text.primary} />
              </LinearGradient>
            </Animated.View>

            <Text style={styles.logoText}>GENESIS</Text>
            <Text style={styles.logoSubtext}>SOVEREIGN SECURITY PLATFORM</Text>
            <Text style={styles.versionText}>v2.0.0</Text>
          </Animated.View>

          {/* Login form */}
          <Animated.View
            style={[
              styles.formContainer,
              { opacity: formOpacity, transform: [{ translateX: shakeAnim }] },
            ]}
          >
            <BlurView intensity={40} tint="dark" style={styles.formBlur}>
              <View style={styles.formContent}>
                {/* Error message */}
                {error && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="warning" size={16} color={colors.red[500]} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Username input */}
                <View
                  style={[
                    styles.inputContainer,
                    focusedInput === 'username' && styles.inputFocused,
                  ]}
                >
                  <Ionicons
                    name="person"
                    size={20}
                    color={focusedInput === 'username' ? colors.cyan[500] : colors.text.tertiary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor={colors.text.muted}
                    value={username}
                    onChangeText={setUsername}
                    onFocus={() => setFocusedInput('username')}
                    onBlur={() => setFocusedInput(null)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    returnKeyType="next"
                  />
                </View>

                {/* Password input */}
                <View
                  style={[
                    styles.inputContainer,
                    focusedInput === 'password' && styles.inputFocused,
                  ]}
                >
                  <Ionicons
                    name="lock-closed"
                    size={20}
                    color={focusedInput === 'password' ? colors.cyan[500] : colors.text.tertiary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={colors.text.muted}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={colors.text.tertiary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Login button */}
                <TouchableOpacity
                  style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={
                      isLoading
                        ? [colors.text.muted, colors.text.muted]
                        : [colors.cyan[500], colors.cyan[600]]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.loginButtonGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={colors.text.primary} />
                    ) : (
                      <>
                        <Ionicons name="log-in" size={20} color={colors.text.inverse} />
                        <Text style={styles.loginButtonText}>AUTHENTICATE</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Biometric button */}
                {biometric.isEnabled && (
                  <TouchableOpacity
                    style={styles.biometricButton}
                    onPress={handleBiometric}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={biometric.biometricType === 'facial' ? 'scan' : 'finger-print'}
                      size={32}
                      color={colors.cyan[500]}
                    />
                    <Text style={styles.biometricText}>
                      {biometric.biometricType === 'facial' ? 'Face ID' : 'Touch ID'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* YubiKey button */}
                <TouchableOpacity style={styles.yubiKeyButton} activeOpacity={0.7}>
                  <View style={styles.yubiKeyIcon}>
                    <Ionicons name="key" size={20} color={colors.green[500]} />
                  </View>
                  <Text style={styles.yubiKeyText}>YubiKey NFC</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                </TouchableOpacity>
              </View>
            </BlurView>
          </Animated.View>

          {/* Footer */}
          <Animated.View style={[styles.footer, { opacity: formOpacity }]}>
            <Text style={styles.footerText}>Secured by GENESIS 2.0</Text>
            <View style={styles.footerIcons}>
              <Ionicons name="lock-closed" size={12} color={colors.green[500]} />
              <Text style={styles.footerSecure}>AES-256 | Ed25519 | TLS 1.3</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Scanline effect */}
      <View style={styles.scanline} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  matrixContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  matrixChar: {
    position: 'absolute',
    fontSize: 14,
    fontFamily: 'ShareTechMono',
    color: colors.green[500],
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.03,
    backgroundColor: 'transparent',
    // Grid pattern via borderWidth would be added with SVG in production
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing[10],
  },
  logoGlow: {
    ...shadows.glowCyan,
    marginBottom: spacing[4],
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: borderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    ...textStyles.displayLarge,
    color: colors.text.primary,
    textShadowColor: colors.cyan[500],
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  logoSubtext: {
    ...textStyles.label,
    color: colors.text.secondary,
    letterSpacing: 4,
    marginTop: spacing[2],
  },
  versionText: {
    ...textStyles.codeSmall,
    color: colors.text.muted,
    marginTop: spacing[1],
  },
  formContainer: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  formBlur: {
    overflow: 'hidden',
  },
  formContent: {
    padding: spacing[6],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.error,
  },
  errorText: {
    ...textStyles.bodySmall,
    color: colors.red[500],
    marginLeft: spacing[2],
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing[4],
    paddingHorizontal: spacing[4],
    height: 56,
  },
  inputFocused: {
    borderColor: colors.cyan[500],
    ...shadows.glowCyan,
  },
  inputIcon: {
    marginRight: spacing[3],
  },
  input: {
    flex: 1,
    ...textStyles.body,
    color: colors.text.primary,
    height: '100%',
  },
  eyeButton: {
    padding: spacing[2],
  },
  loginButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginTop: spacing[2],
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    gap: spacing[2],
  },
  loginButtonText: {
    ...textStyles.button,
    color: colors.text.inverse,
  },
  biometricButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[6],
    marginTop: spacing[4],
  },
  biometricText: {
    ...textStyles.bodySmall,
    color: colors.cyan[500],
    marginTop: spacing[2],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[4],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.default,
  },
  dividerText: {
    ...textStyles.caption,
    color: colors.text.muted,
    marginHorizontal: spacing[4],
  },
  yubiKeyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[4],
  },
  yubiKeyIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  yubiKeyText: {
    ...textStyles.body,
    color: colors.text.primary,
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing[10],
  },
  footerText: {
    ...textStyles.caption,
    color: colors.text.muted,
  },
  footerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  footerSecure: {
    ...textStyles.codeSmall,
    color: colors.green[500],
    marginLeft: spacing[1],
  },
  scanline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.cyan[500],
    opacity: 0.1,
  },
});
