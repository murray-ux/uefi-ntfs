/**
 * GENESIS 2.0 - Dashboard Screen
 * Main security overview and quick actions
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { colors, textStyles, spacing, borderRadius, shadows } from '../theme';
import { useAuthStore } from '../store/authStore';
import { useSecurityStore, ThreatLevel } from '../store/securityStore';

const { width } = Dimensions.get('window');

// Threat level indicator component
function ThreatIndicator({ level }: { level: ThreatLevel }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const levelConfig = {
    secure: { color: colors.green[500], icon: 'shield-checkmark', label: 'SECURE' },
    low: { color: colors.cyan[500], icon: 'shield', label: 'LOW RISK' },
    medium: { color: colors.yellow[500], icon: 'warning', label: 'MEDIUM RISK' },
    high: { color: colors.orange[500], icon: 'alert-circle', label: 'HIGH RISK' },
    critical: { color: colors.red[500], icon: 'skull', label: 'CRITICAL' },
  };

  const config = levelConfig[level];

  useEffect(() => {
    if (level === 'critical' || level === 'high') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [level, pulseAnim]);

  return (
    <Animated.View style={[styles.threatContainer, { transform: [{ scale: pulseAnim }] }]}>
      <View style={[styles.threatIconContainer, { shadowColor: config.color }]}>
        <LinearGradient
          colors={[config.color, `${config.color}88`]}
          style={styles.threatGradient}
        >
          <Ionicons name={config.icon as any} size={48} color={colors.text.primary} />
        </LinearGradient>
      </View>
      <Text style={[styles.threatLabel, { color: config.color }]}>{config.label}</Text>
      <Text style={styles.threatSubtext}>System Status</Text>
    </Animated.View>
  );
}

// Quick action button
function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.7}
    >
      <BlurView intensity={30} tint="dark" style={styles.quickActionBlur}>
        <View style={[styles.quickActionIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
        <Text style={styles.quickActionLabel}>{label}</Text>
      </BlurView>
    </TouchableOpacity>
  );
}

// Metric card component
function MetricCard({
  title,
  value,
  unit,
  icon,
  color,
  trend,
}: {
  title: string;
  value: string | number;
  unit?: string;
  icon: string;
  color: string;
  trend?: 'up' | 'down' | 'stable';
}) {
  const trendIcon = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove';
  const trendColor =
    trend === 'up' ? colors.green[500] : trend === 'down' ? colors.red[500] : colors.text.muted;

  return (
    <View style={styles.metricCard}>
      <BlurView intensity={20} tint="dark" style={styles.metricBlur}>
        <View style={styles.metricHeader}>
          <View style={[styles.metricIconContainer, { backgroundColor: `${color}20` }]}>
            <Ionicons name={icon as any} size={16} color={color} />
          </View>
          {trend && <Ionicons name={trendIcon} size={14} color={trendColor} />}
        </View>
        <Text style={styles.metricValue}>
          {value}
          {unit && <Text style={styles.metricUnit}>{unit}</Text>}
        </Text>
        <Text style={styles.metricTitle}>{title}</Text>
      </BlurView>
    </View>
  );
}

// Recent alert item
function AlertItem({
  title,
  time,
  severity,
  onPress,
}: {
  title: string;
  time: string;
  severity: ThreatLevel;
  onPress: () => void;
}) {
  const severityColors = {
    secure: colors.green[500],
    low: colors.cyan[500],
    medium: colors.yellow[500],
    high: colors.orange[500],
    critical: colors.red[500],
  };

  return (
    <TouchableOpacity style={styles.alertItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.alertDot, { backgroundColor: severityColors[severity] }]} />
      <View style={styles.alertContent}>
        <Text style={styles.alertTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.alertTime}>{time}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const {
    overallThreatLevel,
    alerts,
    devices,
    isScanning,
    fetchSecurityOverview,
    fetchDevices,
    fetchAlerts,
    runSecurityScan,
  } = useSecurityStore();

  const [refreshing, setRefreshing] = React.useState(false);

  const loadData = useCallback(async () => {
    await Promise.all([fetchSecurityOverview(), fetchDevices(), fetchAlerts()]);
  }, [fetchSecurityOverview, fetchDevices, fetchAlerts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleScan = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await runSecurityScan();
  };

  const recentAlerts = alerts.slice(0, 5);
  const healthyDevices = devices.filter((d) => d.status === 'healthy').length;
  const totalDevices = devices.length;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
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
          { paddingTop: insets.top + spacing[4], paddingBottom: insets.bottom + spacing[24] },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.cyan[500]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.username}>{user?.displayName || user?.username || 'Operator'}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Ionicons name="notifications" size={24} color={colors.text.primary} />
            {alerts.filter((a) => !a.acknowledged).length > 0 && (
              <View style={styles.notificationBadge} />
            )}
          </TouchableOpacity>
        </View>

        {/* Threat Level */}
        <ThreatIndicator level={overallThreatLevel} />

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction
              icon="scan"
              label="Scan"
              color={colors.cyan[500]}
              onPress={handleScan}
            />
            <QuickAction
              icon="pentagon"
              label="Pentagon"
              color={colors.magenta[500]}
              onPress={() => navigation.navigate('Pentagon' as never)}
            />
            <QuickAction
              icon="document-text"
              label="Sign Doc"
              color={colors.green[500]}
              onPress={() => navigation.navigate('DocumentSign' as never)}
            />
            <QuickAction
              icon="key"
              label="YubiKey"
              color={colors.orange[500]}
              onPress={() => navigation.navigate('YubiKey' as never)}
            />
          </View>
        </View>

        {/* Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Metrics</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Devices"
              value={`${healthyDevices}/${totalDevices}`}
              icon="hardware-chip"
              color={colors.cyan[500]}
              trend={healthyDevices === totalDevices ? 'stable' : 'down'}
            />
            <MetricCard
              title="Alerts"
              value={alerts.filter((a) => !a.resolved).length}
              icon="alert-circle"
              color={colors.orange[500]}
              trend={alerts.length > 5 ? 'up' : 'stable'}
            />
            <MetricCard
              title="CIS Score"
              value={85}
              unit="%"
              icon="shield-checkmark"
              color={colors.green[500]}
              trend="up"
            />
            <MetricCard
              title="Uptime"
              value="99.9"
              unit="%"
              icon="pulse"
              color={colors.magenta[500]}
              trend="stable"
            />
          </View>
        </View>

        {/* Recent Alerts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Security' as never)}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.alertsList}>
            {recentAlerts.length > 0 ? (
              recentAlerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  title={alert.title}
                  time={new Date(alert.timestamp).toLocaleTimeString()}
                  severity={alert.severity}
                  onPress={() =>
                    navigation.navigate('AlertDetail' as never, { alertId: alert.id } as never)
                  }
                />
              ))
            ) : (
              <View style={styles.emptyAlerts}>
                <Ionicons name="checkmark-circle" size={32} color={colors.green[500]} />
                <Text style={styles.emptyAlertsText}>No recent alerts</Text>
              </View>
            )}
          </View>
        </View>

        {/* Audit Log Link */}
        <TouchableOpacity
          style={styles.auditLink}
          onPress={() => navigation.navigate('AuditLog' as never)}
          activeOpacity={0.7}
        >
          <BlurView intensity={20} tint="dark" style={styles.auditLinkContent}>
            <View style={styles.auditLinkIcon}>
              <Ionicons name="list" size={20} color={colors.cyan[500]} />
            </View>
            <View style={styles.auditLinkText}>
              <Text style={styles.auditLinkTitle}>Audit Log</Text>
              <Text style={styles.auditLinkSubtitle}>View hash-chained ledger</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
          </BlurView>
        </TouchableOpacity>
      </ScrollView>

      {/* Scanning overlay */}
      {isScanning && (
        <View style={styles.scanningOverlay}>
          <BlurView intensity={80} tint="dark" style={styles.scanningContent}>
            <View style={styles.scanningAnimation}>
              <Ionicons name="scan" size={48} color={colors.cyan[500]} />
            </View>
            <Text style={styles.scanningText}>Scanning...</Text>
          </BlurView>
        </View>
      )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  greeting: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
  },
  username: {
    ...textStyles.h2,
    color: colors.text.primary,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.red[500],
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  threatContainer: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  threatIconContainer: {
    ...shadows.glowCyan,
    borderRadius: borderRadius['3xl'],
    marginBottom: spacing[3],
  },
  threatGradient: {
    width: 100,
    height: 100,
    borderRadius: borderRadius['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  threatLabel: {
    ...textStyles.displaySmall,
    marginBottom: spacing[1],
  },
  threatSubtext: {
    ...textStyles.caption,
    color: colors.text.muted,
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...textStyles.h4,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  seeAllText: {
    ...textStyles.bodySmall,
    color: colors.cyan[500],
    marginBottom: spacing[3],
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  quickAction: {
    width: (width - spacing[4] * 2 - spacing[3] * 3) / 4,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  quickActionBlur: {
    padding: spacing[3],
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  quickActionLabel: {
    ...textStyles.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  metricCard: {
    width: (width - spacing[4] * 2 - spacing[3]) / 2,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  metricBlur: {
    padding: spacing[4],
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  metricIconContainer: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    ...textStyles.h2,
    color: colors.text.primary,
  },
  metricUnit: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  metricTitle: {
    ...textStyles.caption,
    color: colors.text.muted,
    marginTop: spacing[1],
  },
  alertsList: {
    backgroundColor: colors.background.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing[3],
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    ...textStyles.body,
    color: colors.text.primary,
  },
  alertTime: {
    ...textStyles.caption,
    color: colors.text.muted,
    marginTop: spacing[0.5],
  },
  emptyAlerts: {
    alignItems: 'center',
    padding: spacing[8],
  },
  emptyAlertsText: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginTop: spacing[2],
  },
  auditLink: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  auditLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
  },
  auditLinkIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  auditLinkText: {
    flex: 1,
  },
  auditLinkTitle: {
    ...textStyles.body,
    color: colors.text.primary,
  },
  auditLinkSubtitle: {
    ...textStyles.caption,
    color: colors.text.muted,
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningContent: {
    padding: spacing[8],
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  scanningAnimation: {
    marginBottom: spacing[4],
  },
  scanningText: {
    ...textStyles.body,
    color: colors.cyan[500],
  },
});
