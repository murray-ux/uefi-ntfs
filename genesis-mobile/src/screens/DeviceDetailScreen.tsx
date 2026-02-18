/**
 * GENESIS 2.0 - Device Detail Screen
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { colors, textStyles, spacing, borderRadius } from '../theme';
import { useSecurityStore, DeviceStatus } from '../store/securityStore';

const statusConfig: Record<DeviceStatus, { color: string; label: string }> = {
  healthy: { color: colors.green[500], label: 'Healthy' },
  warning: { color: colors.yellow[500], label: 'Warning' },
  compromised: { color: colors.red[500], label: 'Compromised' },
  unknown: { color: colors.text.muted, label: 'Unknown' },
  offline: { color: colors.text.muted, label: 'Offline' },
};

function MetricBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const percentage = Math.min(100, (value / max) * 100);
  return (
    <View style={styles.metricBar}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, { color }]}>{value}/{max}</Text>
      </View>
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default function DeviceDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { devices } = useSecurityStore();

  const device = devices.find((d) => d.id === route.params?.deviceId) || {
    id: '1', name: 'MacBook Pro', type: 'laptop', status: 'healthy' as DeviceStatus,
    os: 'macOS 14.2', lastSeen: Date.now() - 60000, ipAddress: '192.168.1.100', macAddress: 'AA:BB:CC:DD:EE:FF',
    cisScore: 85, vulnerabilities: 2,
    patches: { pending: 3, installed: 127, failed: 0 },
    certificates: { valid: 5, expiring: 1, expired: 0 },
  };

  const config = statusConfig[device.status];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background.primary, colors.background.secondary]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Device Details</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[4] }]}>
        {/* Device header */}
        <View style={styles.deviceHeader}>
          <View style={[styles.deviceIcon, { backgroundColor: `${config.color}20` }]}>
            <Ionicons name={device.type === 'laptop' ? 'laptop' : device.type === 'desktop' ? 'desktop' : 'phone-portrait'} size={32} color={config.color} />
          </View>
          <Text style={styles.deviceName}>{device.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${config.color}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: config.color }]} />
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        {/* CIS Score */}
        <View style={styles.scoreCard}>
          <LinearGradient colors={device.cisScore >= 80 ? [colors.green[500], colors.green[600]] : device.cisScore >= 60 ? [colors.yellow[500], colors.yellow[600]] : [colors.red[500], colors.red[600]]} style={styles.scoreGradient}>
            <Text style={styles.scoreValue}>{device.cisScore}%</Text>
            <Text style={styles.scoreLabel}>CIS Benchmark Score</Text>
          </LinearGradient>
        </View>

        {/* Info section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Information</Text>
          <View style={styles.infoCard}>
            <BlurView intensity={20} tint="dark" style={styles.infoBlur}>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Operating System</Text><Text style={styles.infoValue}>{device.os}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>IP Address</Text><Text style={styles.infoValue}>{device.ipAddress}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>MAC Address</Text><Text style={styles.infoValue}>{device.macAddress}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Last Seen</Text><Text style={styles.infoValue}>{new Date(device.lastSeen).toLocaleString()}</Text></View>
            </BlurView>
          </View>
        </View>

        {/* Security metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Metrics</Text>
          <View style={styles.metricsCard}>
            <BlurView intensity={20} tint="dark" style={styles.metricsBlur}>
              <MetricBar label="Vulnerabilities" value={device.vulnerabilities} max={10} color={device.vulnerabilities > 5 ? colors.red[500] : device.vulnerabilities > 2 ? colors.yellow[500] : colors.green[500]} />
              <MetricBar label="Pending Patches" value={device.patches.pending} max={10} color={device.patches.pending > 5 ? colors.red[500] : device.patches.pending > 2 ? colors.yellow[500] : colors.green[500]} />
              <MetricBar label="Expiring Certs" value={device.certificates.expiring} max={5} color={device.certificates.expiring > 2 ? colors.red[500] : device.certificates.expiring > 0 ? colors.yellow[500] : colors.green[500]} />
            </BlurView>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}>
            <BlurView intensity={20} tint="dark" style={styles.actionBlur}>
              <Ionicons name="scan" size={20} color={colors.cyan[500]} />
              <Text style={styles.actionText}>Run Scan</Text>
            </BlurView>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}>
            <BlurView intensity={20} tint="dark" style={styles.actionBlur}>
              <Ionicons name="cloud-download" size={20} color={colors.green[500]} />
              <Text style={styles.actionText}>Install Patches</Text>
            </BlurView>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], paddingBottom: spacing[4] },
  backButton: { width: 40, height: 40, borderRadius: borderRadius.full, backgroundColor: colors.background.glass, alignItems: 'center', justifyContent: 'center', marginRight: spacing[3] },
  headerTitle: { ...textStyles.h3, color: colors.text.primary },
  content: { paddingHorizontal: spacing[4] },
  deviceHeader: { alignItems: 'center', marginBottom: spacing[6] },
  deviceIcon: { width: 80, height: 80, borderRadius: borderRadius['2xl'], alignItems: 'center', justifyContent: 'center', marginBottom: spacing[3] },
  deviceName: { ...textStyles.h2, color: colors.text.primary, marginBottom: spacing[2] },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: borderRadius.full, gap: spacing[2] },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { ...textStyles.label },
  scoreCard: { borderRadius: borderRadius.lg, overflow: 'hidden', marginBottom: spacing[6] },
  scoreGradient: { padding: spacing[6], alignItems: 'center' },
  scoreValue: { ...textStyles.displayLarge, color: colors.text.primary },
  scoreLabel: { ...textStyles.body, color: colors.text.primary, opacity: 0.8 },
  section: { marginBottom: spacing[6] },
  sectionTitle: { ...textStyles.label, color: colors.text.muted, marginBottom: spacing[2] },
  infoCard: { borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.default },
  infoBlur: { padding: spacing[4] },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[2] },
  infoLabel: { ...textStyles.bodySmall, color: colors.text.muted },
  infoValue: { ...textStyles.body, color: colors.text.primary },
  metricsCard: { borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.default },
  metricsBlur: { padding: spacing[4] },
  metricBar: { marginBottom: spacing[4] },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[1] },
  metricLabel: { ...textStyles.bodySmall, color: colors.text.secondary },
  metricValue: { ...textStyles.bodySmall },
  barBackground: { height: 6, backgroundColor: colors.background.card, borderRadius: 3 },
  barFill: { height: 6, borderRadius: 3 },
  actions: { flexDirection: 'row', gap: spacing[3] },
  actionButton: { flex: 1, borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.default },
  actionBlur: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing[4], gap: spacing[2] },
  actionText: { ...textStyles.body, color: colors.text.primary },
});
