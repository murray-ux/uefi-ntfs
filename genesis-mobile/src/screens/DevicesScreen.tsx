/**
 * GENESIS 2.0 - Devices Screen
 * Device management with FleetDM integration
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
import { useSecurityStore, DeviceHealth, DeviceStatus } from '../store/securityStore';

const statusConfig: Record<DeviceStatus, { color: string; icon: string; label: string }> = {
  healthy: { color: colors.green[500], icon: 'checkmark-circle', label: 'Healthy' },
  warning: { color: colors.yellow[500], icon: 'warning', label: 'Warning' },
  compromised: { color: colors.red[500], icon: 'alert-circle', label: 'Compromised' },
  unknown: { color: colors.text.muted, icon: 'help-circle', label: 'Unknown' },
  offline: { color: colors.text.muted, icon: 'cloud-offline', label: 'Offline' },
};

const deviceIcons: Record<string, string> = {
  desktop: 'desktop',
  laptop: 'laptop',
  mobile: 'phone-portrait',
  server: 'server',
  iot: 'hardware-chip',
};

function DeviceCard({ device, onPress }: { device: DeviceHealth; onPress: () => void }) {
  const status = statusConfig[device.status];
  const icon = deviceIcons[device.type] || 'hardware-chip';

  return (
    <TouchableOpacity style={styles.deviceCard} onPress={onPress} activeOpacity={0.7}>
      <BlurView intensity={20} tint="dark" style={styles.deviceCardBlur}>
        <View style={styles.deviceHeader}>
          <View style={[styles.deviceIcon, { backgroundColor: `${status.color}20` }]}>
            <Ionicons name={icon as any} size={24} color={status.color} />
          </View>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={styles.deviceOS}>{device.os}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.deviceMetrics}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{device.cisScore}%</Text>
            <Text style={styles.metricLabel}>CIS Score</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{device.vulnerabilities}</Text>
            <Text style={styles.metricLabel}>Vulns</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{device.patches.pending}</Text>
            <Text style={styles.metricLabel}>Patches</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{device.certificates.expiring}</Text>
            <Text style={styles.metricLabel}>Certs</Text>
          </View>
        </View>

        <View style={styles.deviceFooter}>
          <Text style={styles.lastSeen}>
            Last seen: {new Date(device.lastSeen).toLocaleString()}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}

export default function DevicesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { devices, fetchDevices } = useSecurityStore();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDevices();
    setRefreshing(false);
  }, [fetchDevices]);

  const handleDevicePress = useCallback(
    (device: DeviceHealth) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate('DeviceDetail' as never, { deviceId: device.id } as never);
    },
    [navigation]
  );

  const healthyCount = devices.filter((d) => d.status === 'healthy').length;
  const warningCount = devices.filter((d) => d.status === 'warning').length;
  const criticalCount = devices.filter((d) => d.status === 'compromised').length;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <Text style={styles.headerTitle}>Devices</Text>
        <Text style={styles.headerSubtitle}>{devices.length} managed</Text>
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: colors.green[500] }]} />
          <Text style={styles.summaryCount}>{healthyCount}</Text>
          <Text style={styles.summaryLabel}>Healthy</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: colors.yellow[500] }]} />
          <Text style={styles.summaryCount}>{warningCount}</Text>
          <Text style={styles.summaryLabel}>Warning</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: colors.red[500] }]} />
          <Text style={styles.summaryCount}>{criticalCount}</Text>
          <Text style={styles.summaryLabel}>Critical</Text>
        </View>
      </View>

      {/* Devices List */}
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DeviceCard device={item} onPress={() => handleDevicePress(item)} />
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
            <Ionicons name="hardware-chip-outline" size={48} color={colors.text.muted} />
            <Text style={styles.emptyStateText}>No devices</Text>
            <Text style={styles.emptyStateSubtext}>Connect FleetDM to manage devices</Text>
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
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  headerTitle: {
    ...textStyles.h2,
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing[4],
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    backgroundColor: colors.background.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: spacing[1],
  },
  summaryCount: {
    ...textStyles.h3,
    color: colors.text.primary,
  },
  summaryLabel: {
    ...textStyles.caption,
    color: colors.text.muted,
  },
  list: {
    padding: spacing[4],
  },
  deviceCard: {
    marginBottom: spacing[3],
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  deviceCardBlur: {
    padding: spacing[4],
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    ...textStyles.h4,
    color: colors.text.primary,
  },
  deviceOS: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    gap: spacing[1],
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...textStyles.badge,
    fontSize: 10,
  },
  deviceMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.default,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    ...textStyles.h4,
    color: colors.text.primary,
  },
  metricLabel: {
    ...textStyles.caption,
    color: colors.text.muted,
    fontSize: 10,
  },
  metricDivider: {
    width: 1,
    backgroundColor: colors.border.default,
  },
  deviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[3],
  },
  lastSeen: {
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
