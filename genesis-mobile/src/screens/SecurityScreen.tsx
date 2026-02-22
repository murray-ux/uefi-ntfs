/**
 * GENESIS 2.0 - Security Screen
 * Alerts, threats, and security monitoring
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { colors, textStyles, spacing, borderRadius } from '../theme';
import { useSecurityStore, ThreatAlert, ThreatLevel } from '../store/securityStore';

const severityConfig: Record<ThreatLevel, { color: string; icon: string; label: string }> = {
  secure: { color: colors.green[500], icon: 'checkmark-circle', label: 'Info' },
  low: { color: colors.cyan[500], icon: 'information-circle', label: 'Low' },
  medium: { color: colors.yellow[500], icon: 'warning', label: 'Medium' },
  high: { color: colors.orange[500], icon: 'alert-circle', label: 'High' },
  critical: { color: colors.red[500], icon: 'skull', label: 'Critical' },
};

function AlertCard({ alert, onPress }: { alert: ThreatAlert; onPress: () => void }) {
  const config = severityConfig[alert.severity];

  return (
    <TouchableOpacity style={styles.alertCard} onPress={onPress} activeOpacity={0.7}>
      <BlurView intensity={20} tint="dark" style={styles.alertCardBlur}>
        <View style={styles.alertCardHeader}>
          <View style={[styles.severityBadge, { backgroundColor: `${config.color}20` }]}>
            <Ionicons name={config.icon as any} size={16} color={config.color} />
            <Text style={[styles.severityText, { color: config.color }]}>{config.label}</Text>
          </View>
          {!alert.acknowledged && <View style={styles.unreadDot} />}
        </View>

        <Text style={styles.alertTitle}>{alert.title}</Text>
        <Text style={styles.alertDescription} numberOfLines={2}>
          {alert.description}
        </Text>

        <View style={styles.alertFooter}>
          <View style={styles.alertMeta}>
            <Ionicons name="time-outline" size={12} color={colors.text.muted} />
            <Text style={styles.alertTime}>
              {new Date(alert.timestamp).toLocaleString()}
            </Text>
          </View>
          <View style={styles.alertMeta}>
            <Ionicons name="location-outline" size={12} color={colors.text.muted} />
            <Text style={styles.alertSource}>{alert.source}</Text>
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function SecurityScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { alerts, fetchAlerts, acknowledgeAlert, runSecurityScan, isScanning } = useSecurityStore();

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<ThreatLevel | 'all'>('all');

  const filteredAlerts = filter === 'all'
    ? alerts
    : alerts.filter((a) => a.severity === filter);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
  }, [fetchAlerts]);

  const handleAlertPress = useCallback(
    (alert: ThreatAlert) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!alert.acknowledged) {
        acknowledgeAlert(alert.id);
      }
      navigation.navigate('AlertDetail' as never, { alertId: alert.id } as never);
    },
    [acknowledgeAlert, navigation]
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <Text style={styles.headerTitle}>Security</Text>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            runSecurityScan();
          }}
          disabled={isScanning}
        >
          <Ionicons
            name={isScanning ? 'sync' : 'scan'}
            size={20}
            color={colors.cyan[500]}
          />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <FilterChip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
        <FilterChip
          label="Critical"
          active={filter === 'critical'}
          onPress={() => setFilter('critical')}
        />
        <FilterChip label="High" active={filter === 'high'} onPress={() => setFilter('high')} />
        <FilterChip
          label="Medium"
          active={filter === 'medium'}
          onPress={() => setFilter('medium')}
        />
        <FilterChip label="Low" active={filter === 'low'} onPress={() => setFilter('low')} />
      </View>

      {/* Alerts List */}
      <FlatList
        data={filteredAlerts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AlertCard alert={item} onPress={() => handleAlertPress(item)} />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + spacing[24] },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.cyan[500]}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark" size={48} color={colors.green[500]} />
            <Text style={styles.emptyStateText}>No alerts</Text>
            <Text style={styles.emptyStateSubtext}>Your system is secure</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  headerTitle: {
    ...textStyles.h2,
    color: colors.text.primary,
  },
  scanButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
  },
  filterChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.glass,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  filterChipActive: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderColor: colors.cyan[500],
  },
  filterChipText: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: colors.cyan[500],
  },
  list: {
    padding: spacing[4],
  },
  alertCard: {
    marginBottom: spacing[3],
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  alertCardBlur: {
    padding: spacing[4],
  },
  alertCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    gap: spacing[1],
  },
  severityText: {
    ...textStyles.badge,
    fontSize: 10,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cyan[500],
  },
  alertTitle: {
    ...textStyles.h4,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  alertDescription: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  alertFooter: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  alertMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  alertTime: {
    ...textStyles.caption,
    color: colors.text.muted,
  },
  alertSource: {
    ...textStyles.caption,
    color: colors.text.muted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[16],
  },
  emptyStateText: {
    ...textStyles.h3,
    color: colors.text.primary,
    marginTop: spacing[4],
  },
  emptyStateSubtext: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
});
