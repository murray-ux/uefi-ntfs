/**
 * GENESIS 2.0 - Settings Screen
 * User preferences and app configuration
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { colors, textStyles, spacing, borderRadius } from '../theme';
import { useAuthStore } from '../store/authStore';

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function SettingsRow({
  icon,
  iconColor = colors.text.secondary,
  label,
  value,
  onPress,
  rightComponent,
}: {
  icon: string;
  iconColor?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightComponent?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={styles.settingsRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingsIcon, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <Text style={styles.settingsLabel}>{label}</Text>
      {rightComponent || (
        <>
          {value && <Text style={styles.settingsValue}>{value}</Text>}
          {onPress && <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />}
        </>
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, logout, biometric, enableBiometrics, updatePreferences } = useAuthStore();

  const [notificationsEnabled, setNotificationsEnabled] = useState(
    user?.preferences.notifications ?? true
  );
  const [hapticEnabled, setHapticEnabled] = useState(
    user?.preferences.hapticFeedback ?? true
  );
  const [soundEnabled, setSoundEnabled] = useState(
    user?.preferences.soundEffects ?? true
  );

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await logout();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing[2], paddingBottom: insets.bottom + spacing[24] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Profile */}
        <TouchableOpacity style={styles.profileCard}>
          <BlurView intensity={20} tint="dark" style={styles.profileBlur}>
            <LinearGradient
              colors={[colors.cyan[500], colors.magenta[500]]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {(user?.displayName || user?.username || 'U')[0].toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.displayName || user?.username || 'User'}
              </Text>
              <Text style={styles.profileEmail}>{user?.email || 'No email'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
          </BlurView>
        </TouchableOpacity>

        {/* Security */}
        <SettingsSection title="Security">
          <SettingsRow
            icon="finger-print"
            iconColor={colors.cyan[500]}
            label={biometric.biometricType === 'facial' ? 'Face ID' : 'Touch ID'}
            rightComponent={
              <Switch
                value={biometric.isEnabled}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  enableBiometrics(value);
                }}
                trackColor={{ false: colors.text.muted, true: colors.cyan[500] }}
                thumbColor={colors.text.primary}
              />
            }
          />
          <SettingsRow
            icon="key"
            iconColor={colors.green[500]}
            label="YubiKey"
            value="Configured"
            onPress={() => navigation.navigate('YubiKey' as never)}
          />
          <SettingsRow
            icon="lock-closed"
            iconColor={colors.orange[500]}
            label="Change Password"
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          />
          <SettingsRow
            icon="shield-checkmark"
            iconColor={colors.magenta[500]}
            label="Two-Factor Auth"
            value={user?.mfaEnabled ? 'Enabled' : 'Disabled'}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          />
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title="Notifications">
          <SettingsRow
            icon="notifications"
            iconColor={colors.cyan[500]}
            label="Push Notifications"
            rightComponent={
              <Switch
                value={notificationsEnabled}
                onValueChange={(value) => {
                  setNotificationsEnabled(value);
                  updatePreferences({ notifications: value });
                }}
                trackColor={{ false: colors.text.muted, true: colors.cyan[500] }}
                thumbColor={colors.text.primary}
              />
            }
          />
          <SettingsRow
            icon="volume-high"
            iconColor={colors.yellow[500]}
            label="Sound Effects"
            rightComponent={
              <Switch
                value={soundEnabled}
                onValueChange={(value) => {
                  setSoundEnabled(value);
                  updatePreferences({ soundEffects: value });
                }}
                trackColor={{ false: colors.text.muted, true: colors.cyan[500] }}
                thumbColor={colors.text.primary}
              />
            }
          />
          <SettingsRow
            icon="phone-portrait"
            iconColor={colors.purple[500]}
            label="Haptic Feedback"
            rightComponent={
              <Switch
                value={hapticEnabled}
                onValueChange={(value) => {
                  setHapticEnabled(value);
                  updatePreferences({ hapticFeedback: value });
                  if (value) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                trackColor={{ false: colors.text.muted, true: colors.cyan[500] }}
                thumbColor={colors.text.primary}
              />
            }
          />
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection title="Appearance">
          <SettingsRow
            icon="moon"
            iconColor={colors.purple[500]}
            label="Theme"
            value="Dark"
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          />
          <SettingsRow
            icon="text"
            iconColor={colors.cyan[500]}
            label="Font Size"
            value="Medium"
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          />
          <SettingsRow
            icon="language"
            iconColor={colors.green[500]}
            label="Language"
            value="English"
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          />
        </SettingsSection>

        {/* About */}
        <SettingsSection title="About">
          <SettingsRow
            icon="information-circle"
            iconColor={colors.cyan[500]}
            label="Version"
            value="2.0.0"
          />
          <SettingsRow
            icon="document-text"
            iconColor={colors.text.secondary}
            label="Privacy Policy"
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          />
          <SettingsRow
            icon="help-circle"
            iconColor={colors.text.secondary}
            label="Help & Support"
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          />
        </SettingsSection>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color={colors.red[500]} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    paddingHorizontal: spacing[4],
  },
  header: {
    marginBottom: spacing[4],
  },
  headerTitle: {
    ...textStyles.h2,
    color: colors.text.primary,
  },
  profileCard: {
    marginBottom: spacing[6],
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  profileBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  avatarText: {
    ...textStyles.h2,
    color: colors.text.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...textStyles.h4,
    color: colors.text.primary,
  },
  profileEmail: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    ...textStyles.label,
    color: colors.text.muted,
    marginBottom: spacing[2],
    marginLeft: spacing[2],
  },
  sectionContent: {
    backgroundColor: colors.background.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  settingsIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  settingsLabel: {
    ...textStyles.body,
    color: colors.text.primary,
    flex: 1,
  },
  settingsValue: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    marginRight: spacing[2],
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.error,
    gap: spacing[2],
    marginTop: spacing[4],
  },
  logoutText: {
    ...textStyles.button,
    color: colors.red[500],
  },
});
