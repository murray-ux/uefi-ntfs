/**
 * GENESIS 2.0 - MFA Screen
 * Multi-factor authentication challenge
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { colors, textStyles, spacing, borderRadius } from '../theme';
import { useAuthStore } from '../store/authStore';

export default function MFAScreen() {
  const insets = useSafeAreaInsets();
  const { submitMFA, cancelMFA, isLoading, error } = useAuthStore();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (index === 5 && value) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        handleSubmit(fullCode);
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (fullCode?: string) => {
    const codeStr = fullCode || code.join('');
    if (codeStr.length !== 6) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await submitMFA(codeStr, 'totp');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.content, { paddingTop: insets.top + spacing[10] }]}>
        {/* Header */}
        <TouchableOpacity style={styles.backButton} onPress={cancelMFA}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        {/* Icon */}
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={[colors.cyan[500], colors.magenta[500]]}
            style={styles.iconGradient}
          >
            <Ionicons name="shield-checkmark" size={40} color={colors.text.primary} />
          </LinearGradient>
        </View>

        <Text style={styles.title}>Two-Factor Authentication</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code from your authenticator app
        </Text>

        {/* Code inputs */}
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[styles.codeInput, digit && styles.codeInputFilled]}
              value={digit}
              onChangeText={(value) => handleCodeChange(value, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={16} color={colors.red[500]} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={() => handleSubmit()}
          disabled={isLoading || code.join('').length !== 6}
        >
          <LinearGradient
            colors={[colors.cyan[500], colors.cyan[600]]}
            style={styles.submitGradient}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.text.primary} />
            ) : (
              <Text style={styles.submitText}>VERIFY</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* YubiKey option */}
        <TouchableOpacity style={styles.yubiKeyButton}>
          <Ionicons name="key" size={20} color={colors.green[500]} />
          <Text style={styles.yubiKeyText}>Use YubiKey instead</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[6],
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: spacing[10],
    left: spacing[4],
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: spacing[6],
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: borderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...textStyles.h2,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  subtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  codeContainer: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  codeInput: {
    width: 48,
    height: 56,
    backgroundColor: colors.background.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    textAlign: 'center',
    fontSize: 24,
    fontFamily: 'ShareTechMono',
    color: colors.text.primary,
  },
  codeInputFilled: {
    borderColor: colors.cyan[500],
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  errorText: {
    ...textStyles.bodySmall,
    color: colors.red[500],
  },
  submitButton: {
    width: '100%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing[6],
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitGradient: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  submitText: {
    ...textStyles.button,
    color: colors.text.inverse,
  },
  yubiKeyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  yubiKeyText: {
    ...textStyles.body,
    color: colors.green[500],
  },
});
