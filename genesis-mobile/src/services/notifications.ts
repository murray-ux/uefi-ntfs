/**
 * GENESIS 2.0 - Enterprise Push Notifications Service
 *
 * Full-featured notification infrastructure implementing Batch SDK patterns:
 * - Installation management & device registration
 * - User segmentation & attribute tracking
 * - Preference management & quiet hours
 * - Analytics tracking (delivery, open rates)
 * - Multi-channel support (security, auth, system, marketing)
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { config } from '../config';

// ============================================================================
// Types (Batch SDK-style)
// ============================================================================

export type NotificationCategory =
  | 'security_alert'
  | 'auth_event'
  | 'system_status'
  | 'device_health'
  | 'audit_event'
  | 'ai_response';

export interface NotificationPayload {
  title: string;
  body: string;
  category: NotificationCategory;
  data?: Record<string, unknown>;
  badge?: number;
  sound?: boolean;
  priority?: 'default' | 'high' | 'max';
}

// Installation data for Batch-style device registration
export interface InstallationData {
  installationId: string;
  pushToken: string | null;
  platform: 'ios' | 'android';
  deviceModel: string;
  osVersion: string;
  appVersion: string;
  timezone: string;
  locale: string;
  customAttributes: Record<string, string | number | boolean>;
  userId?: string;
  segments: string[];
}

// User preferences for notification management
export interface NotificationPreferences {
  enabled: boolean;
  securityAlerts: boolean;
  authEvents: boolean;
  systemUpdates: boolean;
  deviceHealth: boolean;
  aiResponses: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // HH:MM
  quietHoursEnd?: string;
}

// Analytics event types
export type AnalyticsEventType = 'delivered' | 'opened' | 'dismissed' | 'action_taken';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const category = notification.request.content.data?.category as NotificationCategory;

    // High priority for security alerts
    const isUrgent = category === 'security_alert' || category === 'auth_event';

    return {
      shouldShowAlert: true,
      shouldPlaySound: isUrgent,
      shouldSetBadge: true,
      priority: isUrgent
        ? Notifications.AndroidNotificationPriority.MAX
        : Notifications.AndroidNotificationPriority.DEFAULT,
    };
  },
});

class NotificationService {
  private pushToken: string | null = null;
  private initialized = false;
  private installationId: string | null = null;
  private customAttributes: Record<string, string | number | boolean> = {};
  private userSegments: string[] = [];
  private userId: string | null = null;
  private preferences: NotificationPreferences = {
    enabled: true,
    securityAlerts: true,
    authEvents: true,
    systemUpdates: true,
    deviceHealth: true,
    aiResponses: true,
    quietHoursEnabled: false,
  };
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  /**
   * Initialize notification service (Batch SDK-style)
   */
  async init(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      // Set up notification categories
      await this.setupCategories();

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Notification permissions not granted');
        return false;
      }

      // Get push token
      this.pushToken = await this.getPushToken();

      // Set up notification channels (Android)
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      // Generate installation ID (Batch-style)
      this.installationId = await this.generateInstallationId();

      // Set up event listeners
      this.setupEventListeners();

      // Register installation with backend
      await this.registerInstallation();

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  /**
   * Get push notification token
   */
  async getPushToken(): Promise<string | null> {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || 'genesis-sovereign-2024',
      });

      return token.data;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Set up notification categories with actions
   */
  private async setupCategories(): Promise<void> {
    await Notifications.setNotificationCategoryAsync('security_alert', [
      {
        identifier: 'acknowledge',
        buttonTitle: 'Acknowledge',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'view_details',
        buttonTitle: 'View Details',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'dismiss',
        buttonTitle: 'Dismiss',
        options: {
          isDestructive: true,
          opensAppToForeground: false,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('auth_event', [
      {
        identifier: 'approve',
        buttonTitle: 'Approve',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'deny',
        buttonTitle: 'Deny',
        options: {
          isDestructive: true,
          opensAppToForeground: false,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('device_health', [
      {
        identifier: 'run_scan',
        buttonTitle: 'Run Scan',
        options: {
          opensAppToForeground: true,
        },
      },
    ]);
  }

  /**
   * Set up Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    // Security alerts - high priority
    await Notifications.setNotificationChannelAsync('security_alerts', {
      name: 'Security Alerts',
      description: 'Critical security notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF0000',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      sound: 'alert.wav',
    });

    // Auth events - high priority
    await Notifications.setNotificationChannelAsync('auth_events', {
      name: 'Authentication Events',
      description: 'Login attempts and MFA requests',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00FFFF',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      sound: 'auth.wav',
    });

    // System status - default priority
    await Notifications.setNotificationChannelAsync('system_status', {
      name: 'System Status',
      description: 'System health and status updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#00FF00',
    });

    // Device health - default priority
    await Notifications.setNotificationChannelAsync('device_health', {
      name: 'Device Health',
      description: 'Device monitoring notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#FFFF00',
    });

    // AI responses - low priority
    await Notifications.setNotificationChannelAsync('ai_responses', {
      name: 'AI Assistant',
      description: 'AI chat responses',
      importance: Notifications.AndroidImportance.LOW,
    });
  }

  /**
   * Send local notification (respects preferences and quiet hours)
   */
  async sendNotification(payload: NotificationPayload): Promise<string> {
    // Check if category is enabled
    if (!this.isCategoryEnabled(payload.category)) {
      console.log(`[Notifications] Category ${payload.category} is disabled`);
      return '';
    }

    // Check quiet hours (security alerts bypass quiet hours)
    if (payload.category !== 'security_alert' && this.isQuietHours()) {
      console.log('[Notifications] Quiet hours active, notification suppressed');
      return '';
    }

    const channelId = this.getCategoryChannel(payload.category);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: {
          category: payload.category,
          ...payload.data,
        },
        badge: payload.badge,
        sound: payload.sound !== false,
        categoryIdentifier: payload.category,
        ...(Platform.OS === 'android' && {
          channelId,
          priority:
            payload.priority === 'max'
              ? 'max'
              : payload.priority === 'high'
              ? 'high'
              : 'default',
        }),
      },
      trigger: null, // Immediate
    });

    return notificationId;
  }

  /**
   * Send security alert
   */
  async sendSecurityAlert(
    title: string,
    body: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    data?: Record<string, unknown>
  ): Promise<string> {
    const emoji =
      severity === 'critical'
        ? '🚨'
        : severity === 'high'
        ? '⚠️'
        : severity === 'medium'
        ? '🔔'
        : 'ℹ️';

    return this.sendNotification({
      title: `${emoji} ${title}`,
      body,
      category: 'security_alert',
      data: { severity, ...data },
      priority: severity === 'critical' || severity === 'high' ? 'max' : 'high',
      sound: true,
    });
  }

  /**
   * Send auth event notification
   */
  async sendAuthNotification(
    type: 'login' | 'logout' | 'mfa_request' | 'password_change' | 'new_device',
    details: string,
    data?: Record<string, unknown>
  ): Promise<string> {
    const titles: Record<string, string> = {
      login: '🔐 Login Attempt',
      logout: '👋 Logged Out',
      mfa_request: '🔑 MFA Required',
      password_change: '🔒 Password Changed',
      new_device: '📱 New Device',
    };

    return this.sendNotification({
      title: titles[type] || 'Auth Event',
      body: details,
      category: 'auth_event',
      data: { type, ...data },
      priority: type === 'mfa_request' ? 'max' : 'high',
      sound: true,
    });
  }

  /**
   * Send device health notification
   */
  async sendDeviceHealthNotification(
    deviceName: string,
    status: 'healthy' | 'warning' | 'critical',
    message: string
  ): Promise<string> {
    const emoji = status === 'critical' ? '🔴' : status === 'warning' ? '🟡' : '🟢';

    return this.sendNotification({
      title: `${emoji} ${deviceName}`,
      body: message,
      category: 'device_health',
      data: { deviceName, status },
      priority: status === 'critical' ? 'high' : 'default',
    });
  }

  /**
   * Schedule notification for later
   */
  async scheduleNotification(
    payload: NotificationPayload,
    triggerAt: Date
  ): Promise<string> {
    const channelId = this.getCategoryChannel(payload.category);

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: {
          category: payload.category,
          ...payload.data,
        },
        sound: payload.sound !== false,
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger: {
        date: triggerAt,
      },
    });
  }

  /**
   * Cancel notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Dismiss all displayed notifications
   */
  async dismissAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Register push token with server
   */
  async registerWithServer(authToken: string): Promise<boolean> {
    if (!this.pushToken) {
      this.pushToken = await this.getPushToken();
    }

    if (!this.pushToken) return false;

    try {
      const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${API_BASE}/notifications/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          token: this.pushToken,
          platform: Platform.OS,
          deviceId: Device.deviceName,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to register push token:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Installation Management (Batch SDK-style)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate unique installation ID
   */
  private async generateInstallationId(): Promise<string> {
    const deviceId = Constants.installationId || 'unknown';
    const platform = Platform.OS;
    const model = Device.modelName || 'device';
    const hash = this.hashString(`${deviceId}-${platform}-${model}`);
    return `genesis-${hash}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Register installation with backend
   */
  private async registerInstallation(): Promise<void> {
    if (!this.installationId) return;

    const installation: InstallationData = {
      installationId: this.installationId,
      pushToken: this.pushToken,
      platform: Platform.OS as 'ios' | 'android',
      deviceModel: Device.modelName || 'Unknown',
      osVersion: Device.osVersion || 'Unknown',
      appVersion: Constants.expoConfig?.version || '1.0.0',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: 'en-US',
      customAttributes: this.customAttributes,
      userId: this.userId || undefined,
      segments: this.userSegments,
    };

    try {
      const API_BASE = config?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
      await fetch(`${API_BASE}/api/notifications/installations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(installation),
      });
    } catch (error) {
      console.error('[Notifications] Failed to register installation:', error);
    }
  }

  /**
   * Set up event listeners for analytics
   */
  private setupEventListeners(): void {
    // Notification received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      this.trackAnalyticsEvent('delivered', notification.request.identifier, {
        category: notification.request.content.data?.category,
      });
    });

    // User interacted with notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      this.trackAnalyticsEvent('opened', response.notification.request.identifier, {
        actionId: response.actionIdentifier,
        category: response.notification.request.content.data?.category,
      });
    });
  }

  /**
   * Track analytics event
   */
  private async trackAnalyticsEvent(
    type: AnalyticsEventType,
    notificationId: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    try {
      const API_BASE = config?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
      await fetch(`${API_BASE}/api/notifications/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          notificationId,
          installationId: this.installationId,
          timestamp: new Date().toISOString(),
          ...data,
        }),
      });
    } catch (error) {
      // Silent fail for analytics
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // User Attributes & Segmentation (Batch SDK-style)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Set user ID for targeting
   */
  setUserId(userId: string): void {
    this.userId = userId;
    this.syncInstallation();
  }

  /**
   * Clear user ID (on logout)
   */
  clearUserId(): void {
    this.userId = null;
    this.syncInstallation();
  }

  /**
   * Set a custom attribute for segmentation
   */
  setUserAttribute(key: string, value: string | number | boolean): void {
    this.customAttributes[key] = value;
    this.syncAttributes();
  }

  /**
   * Set multiple attributes at once
   */
  setUserAttributes(attributes: Record<string, string | number | boolean>): void {
    this.customAttributes = { ...this.customAttributes, ...attributes };
    this.syncAttributes();
  }

  /**
   * Remove a user attribute
   */
  removeUserAttribute(key: string): void {
    delete this.customAttributes[key];
    this.syncAttributes();
  }

  /**
   * Add user to a segment
   */
  addToSegment(segment: string): void {
    if (!this.userSegments.includes(segment)) {
      this.userSegments.push(segment);
      this.syncInstallation();
    }
  }

  /**
   * Remove user from a segment
   */
  removeFromSegment(segment: string): void {
    this.userSegments = this.userSegments.filter(s => s !== segment);
    this.syncInstallation();
  }

  /**
   * Set user's security level for targeted alerts
   */
  setSecurityLevel(level: 'standard' | 'enhanced' | 'maximum'): void {
    this.setUserAttribute('security_level', level);
    this.addToSegment(`security_${level}`);
  }

  private async syncAttributes(): Promise<void> {
    if (!this.installationId) return;

    try {
      const API_BASE = config?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
      await fetch(`${API_BASE}/api/notifications/installations/${this.installationId}/attributes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.customAttributes),
      });
    } catch (error) {
      console.error('[Notifications] Failed to sync attributes:', error);
    }
  }

  private async syncInstallation(): Promise<void> {
    await this.registerInstallation();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Preferences Management
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Update notification preferences
   */
  setPreferences(prefs: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...prefs };
    this.syncPreferences();
  }

  /**
   * Get current preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Enable/disable quiet hours
   */
  setQuietHours(enabled: boolean, start?: string, end?: string): void {
    this.preferences.quietHoursEnabled = enabled;
    if (start) this.preferences.quietHoursStart = start;
    if (end) this.preferences.quietHoursEnd = end;
    this.syncPreferences();
  }

  /**
   * Check if currently in quiet hours
   */
  isQuietHours(): boolean {
    if (!this.preferences.quietHoursEnabled) return false;
    if (!this.preferences.quietHoursStart || !this.preferences.quietHoursEnd) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = this.preferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = this.preferences.quietHoursEnd.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }

  /**
   * Check if category is enabled
   */
  isCategoryEnabled(category: NotificationCategory): boolean {
    if (!this.preferences.enabled) return false;

    switch (category) {
      case 'security_alert':
        return this.preferences.securityAlerts;
      case 'auth_event':
        return this.preferences.authEvents;
      case 'system_status':
        return this.preferences.systemUpdates;
      case 'device_health':
        return this.preferences.deviceHealth;
      case 'ai_response':
        return this.preferences.aiResponses;
      default:
        return true;
    }
  }

  private async syncPreferences(): Promise<void> {
    if (!this.installationId) return;

    try {
      const API_BASE = config?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
      await fetch(`${API_BASE}/api/notifications/installations/${this.installationId}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.preferences),
      });
    } catch (error) {
      console.error('[Notifications] Failed to sync preferences:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Clean up listeners
   */
  cleanup(): void {
    this.notificationListener?.remove();
    this.responseListener?.remove();
  }

  /**
   * Get installation ID
   */
  getInstallationId(): string | null {
    return this.installationId;
  }

  /**
   * Get channel ID for category
   */
  private getCategoryChannel(category: NotificationCategory): string {
    const channelMap: Record<NotificationCategory, string> = {
      security_alert: 'security_alerts',
      auth_event: 'auth_events',
      system_status: 'system_status',
      device_health: 'device_health',
      audit_event: 'system_status',
      ai_response: 'ai_responses',
    };
    return channelMap[category] || 'system_status';
  }

  /**
   * Get current push token
   */
  get token(): string | null {
    return this.pushToken;
  }
}

// Singleton instance
export const notificationService = new NotificationService();

// React hook
import { useEffect, useState, useCallback } from 'react';

export function useNotifications() {
  const [hasPermission, setHasPermission] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [installationId, setInstallationId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    notificationService.getPreferences()
  );

  useEffect(() => {
    const setup = async () => {
      const result = await notificationService.init();
      setHasPermission(result);
      setPushToken(notificationService.token);
      setInstallationId(notificationService.getInstallationId());
    };
    setup();

    return () => {
      notificationService.cleanup();
    };
  }, []);

  const sendAlert = useCallback(
    async (
      title: string,
      body: string,
      severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
    ) => {
      return notificationService.sendSecurityAlert(title, body, severity);
    },
    []
  );

  const updatePreferences = useCallback((prefs: Partial<NotificationPreferences>) => {
    notificationService.setPreferences(prefs);
    setPreferences(notificationService.getPreferences());
  }, []);

  const setUserId = useCallback((userId: string) => {
    notificationService.setUserId(userId);
  }, []);

  const setSecurityLevel = useCallback((level: 'standard' | 'enhanced' | 'maximum') => {
    notificationService.setSecurityLevel(level);
  }, []);

  return {
    // Status
    hasPermission,
    pushToken,
    installationId,
    preferences,
    isQuietHours: notificationService.isQuietHours.bind(notificationService),

    // Core functions
    sendAlert,
    sendNotification: notificationService.sendNotification.bind(notificationService),
    sendAuthNotification: notificationService.sendAuthNotification.bind(notificationService),
    sendDeviceHealthNotification:
      notificationService.sendDeviceHealthNotification.bind(notificationService),
    setBadgeCount: notificationService.setBadgeCount.bind(notificationService),

    // User management (Batch-style)
    setUserId,
    clearUserId: notificationService.clearUserId.bind(notificationService),
    setUserAttribute: notificationService.setUserAttribute.bind(notificationService),
    setUserAttributes: notificationService.setUserAttributes.bind(notificationService),
    setSecurityLevel,

    // Segmentation
    addToSegment: notificationService.addToSegment.bind(notificationService),
    removeFromSegment: notificationService.removeFromSegment.bind(notificationService),

    // Preferences
    updatePreferences,
    setQuietHours: notificationService.setQuietHours.bind(notificationService),
  };
}

export default notificationService;
