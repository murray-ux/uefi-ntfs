/**
 * GENESIS 2.0 - Alert Detail Screen
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
import { useSecurityStore, ThreatLevel } from '../store/securityStore';

const severityConfig: Record<ThreatLevel, { color: string; icon: string }> = {
  secure: { color: colors.green[500], icon: 'checkmark-circle' },
  low: { color: colors.cyan[500], icon: 'information-circle' },
  medium: { color: colors.yellow[500], icon: 'warning' },
  high: { color: colors.orange[500], icon: 'alert-circle' },
  critical: { color: colors.red[500], icon: 'skull' },
};

export default function AlertDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { alerts, acknowledgeAlert, resolveAlert } = useSecurityStore();

  const alert = alerts.find((a) => a.id === route.params?.alertId) || {
    id: '1', type: 'anomaly', severity: 'high' as ThreatLevel, title: 'Suspicious Activity Detected',
    description: 'Unusual login pattern detected from unknown IP address. Multiple failed authentication attempts followed by successful login.',
    source: '192.168.1.100', timestamp: Date.now() - 3600000, acknowledged: false, resolved: false,
    actions: ['Block IP', 'Force logout', 'Notify admin'],
  };

  const config = severityConfig[alert.severity];

  const handleAcknowledge = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    acknowledgeAlert(alert.id);
  };

  const handleResolve = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resolveAlert(alert.id);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background.primary, colors.background.secondary]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alert Details</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[4] }]}>
        {/* Severity badge */}
        <View style={[styles.severityBanner, { backgroundColor: `${config.color}20` }]}>
          <Ionicons name={config.icon as any} size={32} color={config.color} />
          <Text style={[styles.severityText, { color: config.color }]}>{alert.severity.toUpperCase()}</Text>
        </View>

        {/* Title */}
        <Text style={styles.alertTitle}>{alert.title}</Text>
        <Text style={styles.alertType}>{alert.type.replace('_', ' ').toUpperCase()}</Text>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{alert.description}</Text>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailsCard}>
            <BlurView intensity={20} tint="dark" style={styles.detailsBlur}>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Source</Text><Text style={styles.detailValue}>{alert.source}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Time</Text><Text style={styles.detailValue}>{new Date(alert.timestamp).toLocaleString()}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Status</Text><Text style={[styles.detailValue, { color: alert.resolved ? colors.green[500] : alert.acknowledged ? colors.yellow[500] : colors.red[500] }]}>{alert.resolved ? 'Resolved' : alert.acknowledged ? 'Acknowledged' : 'Active'}</Text></View>
            </BlurView>
          </View>
        </View>

        {/* Actions */}
        {alert.actions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommended Actions</Text>
            {alert.actions.map((action, i) => (
              <TouchableOpacity key={i} style={styles.actionButton}>
                <BlurView intensity={20} tint="dark" style={styles.actionBlur}>
                  <Ionicons name="flash" size={16} color={colors.cyan[500]} />
                  <Text style={styles.actionText}>{action}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                </BlurView>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.buttonRow}>
          {!alert.acknowledged && (
            <TouchableOpacity style={styles.acknowledgeButton} onPress={handleAcknowledge}>
              <Text style={styles.acknowledgeText}>Acknowledge</Text>
            </TouchableOpacity>
          )}
          {!alert.resolved && (
            <TouchableOpacity style={styles.resolveButton} onPress={handleResolve}>
              <LinearGradient colors={[colors.green[500], colors.green[600]]} style={styles.resolveGradient}>
                <Text style={styles.resolveText}>Mark Resolved</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
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
  severityBanner: { alignItems: 'center', padding: spacing[6], borderRadius: borderRadius.lg, marginBottom: spacing[4] },
  severityText: { ...textStyles.displaySmall, marginTop: spacing[2] },
  alertTitle: { ...textStyles.h2, color: colors.text.primary, marginBottom: spacing[1] },
  alertType: { ...textStyles.label, color: colors.text.muted, marginBottom: spacing[6] },
  section: { marginBottom: spacing[6] },
  sectionTitle: { ...textStyles.label, color: colors.text.muted, marginBottom: spacing[2] },
  description: { ...textStyles.body, color: colors.text.secondary, lineHeight: 24 },
  detailsCard: { borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.default },
  detailsBlur: { padding: spacing[4] },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[2] },
  detailLabel: { ...textStyles.bodySmall, color: colors.text.muted },
  detailValue: { ...textStyles.body, color: colors.text.primary },
  actionButton: { marginBottom: spacing[2], borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.default },
  actionBlur: { flexDirection: 'row', alignItems: 'center', padding: spacing[4], gap: spacing[3] },
  actionText: { ...textStyles.body, color: colors.text.primary, flex: 1 },
  buttonRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[4] },
  acknowledgeButton: { flex: 1, padding: spacing[4], backgroundColor: colors.background.glass, borderRadius: borderRadius.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border.default },
  acknowledgeText: { ...textStyles.button, color: colors.text.primary },
  resolveButton: { flex: 1, borderRadius: borderRadius.lg, overflow: 'hidden' },
  resolveGradient: { padding: spacing[4], alignItems: 'center' },
  resolveText: { ...textStyles.button, color: colors.text.inverse },
});
