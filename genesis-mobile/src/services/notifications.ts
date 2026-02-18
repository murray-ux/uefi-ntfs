/**
 * GENESIS 2.0 - Push Notifications Service
 * Security alerts and system notifications
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Types
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

  /**
   * Initialize notification service
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
   * Send local notification
   */
  async sendNotification(payload: NotificationPayload): Promise<string> {
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

  useEffect(() => {
    const setup = async () => {
      const result = await notificationService.init();
      setHasPermission(result);
      setPushToken(notificationService.token);
    };
    setup();
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

  return {
    hasPermission,
    pushToken,
    sendAlert,
    sendNotification: notificationService.sendNotification.bind(notificationService),
    sendAuthNotification: notificationService.sendAuthNotification.bind(notificationService),
    sendDeviceHealthNotification:
      notificationService.sendDeviceHealthNotification.bind(notificationService),
    setBadgeCount: notificationService.setBadgeCount.bind(notificationService),
  };
}

export default notificationService;
