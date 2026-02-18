/**
 * GENESIS 2.0 - YubiKey Screen
 * Hardware MFA configuration and NFC scanning
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { colors, textStyles, spacing, borderRadius, shadows } from '../theme';
import { useNFC } from '../services/nfc';

export default function YubiKeyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isAvailable, isReading, readYubiKey, verifyOTP, error } = useNFC();

  const [mode, setMode] = useState<'otp' | 'webauthn' | 'challenge'>('otp');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [lastOTP, setLastOTP] = useState<string | null>(null);

  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isReading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isReading, pulseAnim]);

  const handleScan = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStatus('scanning');

    const result = await readYubiKey();
    if (result?.valid) {
      setStatus('success');
      setLastOTP(result.otp);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Verify with server
      const verified = await verifyOTP(result.otp);
      if (!verified) {
        setStatus('error');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } else {
      setStatus('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const modes = [
    { id: 'otp', name: 'OTP', icon: 'keypad', desc: 'One-time password via NFC' },
    { id: 'webauthn', name: 'WebAuthn', icon: 'finger-print', desc: 'FIDO2 passwordless' },
    { id: 'challenge', name: 'Challenge', icon: 'git-compare', desc: 'HMAC challenge-response' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background.primary, colors.background.secondary]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>YubiKey</Text>
        <Text style={styles.headerSubtitle}>Hardware Security Key</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[4] }]}>
        {/* NFC Status */}
        <View style={styles.nfcStatus}>
          <Ionicons name={isAvailable ? 'wifi' : 'wifi-outline'} size={16} color={isAvailable ? colors.green[500] : colors.text.muted} />
          <Text style={[styles.nfcStatusText, { color: isAvailable ? colors.green[500] : colors.text.muted }]}>
            {isAvailable ? 'NFC Available' : 'NFC Not Available'}
          </Text>
        </View>

        {/* Mode selector */}
        <View style={styles.modeSelector}>
          {modes.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.modeButton, mode === m.id && styles.modeButtonActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMode(m.id as any);
              }}
            >
              <Ionicons name={m.icon as any} size={20} color={mode === m.id ? colors.cyan[500] : colors.text.muted} />
              <Text style={[styles.modeName, mode === m.id && styles.modeNameActive]}>{m.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Scan area */}
        <Animated.View style={[styles.scanArea, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity
            style={[styles.scanButton, !isAvailable && styles.scanButtonDisabled]}
            onPress={handleScan}
            disabled={!isAvailable || isReading}
          >
            <LinearGradient
              colors={status === 'success' ? [colors.green[500], colors.green[600]] : status === 'error' ? [colors.red[500], colors.red[600]] : [colors.orange[500], colors.orange[600]]}
              style={styles.scanGradient}
            >
              <Ionicons
                name={status === 'scanning' ? 'sync' : status === 'success' ? 'checkmark' : status === 'error' ? 'close' : 'key'}
                size={48}
                color={colors.text.primary}
              />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.scanText}>
          {isReading ? 'Hold YubiKey near phone...' : status === 'success' ? 'Authentication successful!' : status === 'error' ? 'Authentication failed' : 'Tap to scan YubiKey'}
        </Text>

        {lastOTP && (
          <View style={styles.otpDisplay}>
            <Text style={styles.otpLabel}>Last OTP</Text>
            <Text style={styles.otpValue}>{lastOTP.substring(0, 12)}...</Text>
          </View>
        )}

        {/* Mode description */}
        <View style={styles.modeInfo}>
          <BlurView intensity={20} tint="dark" style={styles.modeInfoBlur}>
            <Text style={styles.modeInfoTitle}>{modes.find((m) => m.id === mode)?.name} Mode</Text>
            <Text style={styles.modeInfoDesc}>{modes.find((m) => m.id === mode)?.desc}</Text>
          </BlurView>
        </View>

        {/* Registered keys */}
        <View style={styles.keysSection}>
          <Text style={styles.keysSectionTitle}>Registered Keys</Text>
          <View style={styles.keyCard}>
            <BlurView intensity={20} tint="dark" style={styles.keyCardBlur}>
              <View style={styles.keyIcon}>
                <Ionicons name="key" size={20} color={colors.green[500]} />
              </View>
              <View style={styles.keyInfo}>
                <Text style={styles.keyName}>YubiKey 5 NFC</Text>
                <Text style={styles.keySerial}>Serial: 12345678</Text>
              </View>
              <View style={[styles.keyStatus, { backgroundColor: 'rgba(0,255,0,0.1)' }]}>
                <Text style={[styles.keyStatusText, { color: colors.green[500] }]}>Active</Text>
              </View>
            </BlurView>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { alignItems: 'center', paddingHorizontal: spacing[4], paddingBottom: spacing[4] },
  closeButton: { position: 'absolute', right: spacing[4], top: spacing[2], width: 40, height: 40, borderRadius: borderRadius.full, backgroundColor: colors.background.glass, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...textStyles.h2, color: colors.text.primary },
  headerSubtitle: { ...textStyles.caption, color: colors.text.muted },
  content: { paddingHorizontal: spacing[4], alignItems: 'center' },
  nfcStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginBottom: spacing[4] },
  nfcStatusText: { ...textStyles.caption },
  modeSelector: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[8] },
  modeButton: { flex: 1, alignItems: 'center', padding: spacing[3], backgroundColor: colors.background.glass, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border.default },
  modeButtonActive: { borderColor: colors.cyan[500], backgroundColor: 'rgba(0,255,255,0.1)' },
  modeName: { ...textStyles.caption, color: colors.text.muted, marginTop: spacing[1] },
  modeNameActive: { color: colors.cyan[500] },
  scanArea: { marginBottom: spacing[4] },
  scanButton: { ...shadows.glowCyan },
  scanButtonDisabled: { opacity: 0.5 },
  scanGradient: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  scanText: { ...textStyles.body, color: colors.text.secondary, marginBottom: spacing[6], textAlign: 'center' },
  otpDisplay: { alignItems: 'center', marginBottom: spacing[6], padding: spacing[3], backgroundColor: colors.background.glass, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border.default },
  otpLabel: { ...textStyles.caption, color: colors.text.muted },
  otpValue: { ...textStyles.code, color: colors.green[500] },
  modeInfo: { width: '100%', marginBottom: spacing[6], borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.default },
  modeInfoBlur: { padding: spacing[4] },
  modeInfoTitle: { ...textStyles.h4, color: colors.text.primary, marginBottom: spacing[1] },
  modeInfoDesc: { ...textStyles.bodySmall, color: colors.text.secondary },
  keysSection: { width: '100%' },
  keysSectionTitle: { ...textStyles.label, color: colors.text.muted, marginBottom: spacing[2] },
  keyCard: { borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.default },
  keyCardBlur: { flexDirection: 'row', alignItems: 'center', padding: spacing[4] },
  keyIcon: { width: 40, height: 40, borderRadius: borderRadius.md, backgroundColor: 'rgba(0,255,0,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: spacing[3] },
  keyInfo: { flex: 1 },
  keyName: { ...textStyles.body, color: colors.text.primary },
  keySerial: { ...textStyles.caption, color: colors.text.muted },
  keyStatus: { paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: borderRadius.sm },
  keyStatusText: { ...textStyles.badge, fontSize: 10 },
});
