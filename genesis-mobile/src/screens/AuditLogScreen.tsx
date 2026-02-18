/**
 * GENESIS 2.0 - Audit Log Screen
 * Hash-chained ledger viewer
 */

import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { colors, textStyles, spacing, borderRadius } from '../theme';
import { useSecurityStore, AuditEntry } from '../store/securityStore';

function AuditEntryCard({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.entryCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpanded(!expanded);
      }}
    >
      <BlurView intensity={20} tint="dark" style={styles.entryBlur}>
        <View style={styles.entryHeader}>
          <View
            style={[
              styles.entryIcon,
              { backgroundColor: entry.success ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,0,0.1)' },
            ]}
          >
            <Ionicons
              name={entry.success ? 'checkmark' : 'close'}
              size={14}
              color={entry.success ? colors.green[500] : colors.red[500]}
            />
          </View>
          <View style={styles.entryInfo}>
            <Text style={styles.entryAction}>{entry.action}</Text>
            <Text style={styles.entryResource}>{entry.resource}</Text>
          </View>
          <Text style={styles.entryTime}>
            {new Date(entry.timestamp).toLocaleTimeString()}
          </Text>
        </View>

        {expanded && (
          <View style={styles.entryDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Actor</Text>
              <Text style={styles.detailValue}>{entry.actor}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Hash</Text>
              <Text style={styles.hashValue} numberOfLines={1}>
                {entry.hash}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Prev Hash</Text>
              <Text style={styles.hashValue} numberOfLines={1}>
                {entry.prevHash}
              </Text>
            </View>
          </View>
        )}
      </BlurView>
    </TouchableOpacity>
  );
}

export default function AuditLogScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { auditEntries, ledgerValid, verifyLedger, setAuditEntries } = useSecurityStore();
  const [refreshing, setRefreshing] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Mock data if empty
  const entries = auditEntries.length > 0 ? auditEntries : [
    { id: '1', action: 'LOGIN', resource: 'auth/session', actor: 'admin', timestamp: Date.now() - 1000, success: true, metadata: {}, hash: 'a1b2c3d4...', prevHash: '0000...' },
    { id: '2', action: 'EVALUATE', resource: 'policy/access', actor: 'system', timestamp: Date.now() - 5000, success: true, metadata: {}, hash: 'e5f6g7h8...', prevHash: 'a1b2c3d4...' },
    { id: '3', action: 'SIGN', resource: 'document/contract', actor: 'admin', timestamp: Date.now() - 10000, success: true, metadata: {}, hash: 'i9j0k1l2...', prevHash: 'e5f6g7h8...' },
    { id: '4', action: 'SCAN', resource: 'device/laptop', actor: 'tzofeh', timestamp: Date.now() - 30000, success: false, metadata: {}, hash: 'm3n4o5p6...', prevHash: 'i9j0k1l2...' },
    { id: '5', action: 'ALERT', resource: 'security/threat', actor: 'keruv', timestamp: Date.now() - 60000, success: true, metadata: {}, hash: 'q7r8s9t0...', prevHash: 'm3n4o5p6...' },
  ];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Fetch would go here
    setRefreshing(false);
  }, []);

  const handleVerify = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVerifying(true);
    await verifyLedger();
    setVerifying(false);
    Haptics.notificationAsync(
      ledgerValid
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Audit Log</Text>
        <Text style={styles.headerSubtitle}>Hash-chained ledger</Text>
      </View>

      {/* Verification status */}
      <View style={styles.verificationBar}>
        <View style={styles.verificationStatus}>
          <View
            style={[
              styles.verificationDot,
              { backgroundColor: ledgerValid ? colors.green[500] : colors.red[500] },
            ]}
          />
          <Text style={styles.verificationText}>
            {ledgerValid ? 'Chain integrity verified' : 'Chain integrity failed'}
          </Text>
        </View>
        <TouchableOpacity style={styles.verifyButton} onPress={handleVerify} disabled={verifying}>
          <Ionicons
            name={verifying ? 'sync' : 'shield-checkmark'}
            size={16}
            color={colors.cyan[500]}
          />
          <Text style={styles.verifyButtonText}>{verifying ? 'Verifying...' : 'Verify'}</Text>
        </TouchableOpacity>
      </View>

      {/* Entries list */}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AuditEntryCard entry={item as AuditEntry} />}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing[4] }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan[500]} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { alignItems: 'center', paddingHorizontal: spacing[4], paddingBottom: spacing[4] },
  closeButton: { position: 'absolute', right: spacing[4], top: spacing[2], width: 40, height: 40, borderRadius: borderRadius.full, backgroundColor: colors.background.glass, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...textStyles.h2, color: colors.text.primary },
  headerSubtitle: { ...textStyles.caption, color: colors.text.muted },
  verificationBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: spacing[4], marginBottom: spacing[4], padding: spacing[3], backgroundColor: colors.background.glass, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border.default },
  verificationStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  verificationDot: { width: 8, height: 8, borderRadius: 4 },
  verificationText: { ...textStyles.bodySmall, color: colors.text.secondary },
  verifyButton: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  verifyButtonText: { ...textStyles.bodySmall, color: colors.cyan[500] },
  list: { paddingHorizontal: spacing[4] },
  entryCard: { marginBottom: spacing[2], borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.default },
  entryBlur: { padding: spacing[3] },
  entryHeader: { flexDirection: 'row', alignItems: 'center' },
  entryIcon: { width: 28, height: 28, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center', marginRight: spacing[3] },
  entryInfo: { flex: 1 },
  entryAction: { ...textStyles.body, color: colors.text.primary },
  entryResource: { ...textStyles.caption, color: colors.text.muted },
  entryTime: { ...textStyles.caption, color: colors.text.muted },
  entryDetails: { marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.border.default },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[1] },
  detailLabel: { ...textStyles.caption, color: colors.text.muted },
  detailValue: { ...textStyles.caption, color: colors.text.secondary },
  hashValue: { ...textStyles.codeSmall, color: colors.cyan[500], maxWidth: '60%' },
});
