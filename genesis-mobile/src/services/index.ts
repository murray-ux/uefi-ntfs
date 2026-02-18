/**
 * GENESIS 2.0 - Services Exports
 */

export { nfcService, useNFC } from './nfc';
export type { YubiKeyMode, YubiKeyInfo, OTPResult, ChallengeResponse, NFCReadResult } from './nfc';

export { notificationService, useNotifications } from './notifications';
export type { NotificationCategory, NotificationPayload } from './notifications';
