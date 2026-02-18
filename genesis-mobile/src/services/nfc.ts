/**
 * GENESIS 2.0 - NFC & YubiKey Service
 * Hardware MFA integration for iOS
 */

import NfcManager, { NfcTech, Ndef, NfcEvents } from 'react-native-nfc-manager';
import * as Haptics from 'expo-haptics';

// Types
export type YubiKeyMode = 'otp' | 'webauthn' | 'challenge-response' | 'hmac';

export interface YubiKeyInfo {
  serialNumber: string;
  firmwareVersion: string;
  formFactor: 'usb-a' | 'usb-c' | 'nfc' | 'lightning';
  supportedModes: YubiKeyMode[];
}

export interface OTPResult {
  otp: string;
  timestamp: number;
  valid: boolean;
}

export interface ChallengeResponse {
  challenge: string;
  response: string;
  timestamp: number;
}

export interface NFCReadResult {
  type: 'yubikey' | 'ndef' | 'unknown';
  payload: string;
  raw: Uint8Array;
}

class NFCService {
  private isInitialized = false;
  private isReading = false;

  /**
   * Initialize NFC manager
   */
  async init(): Promise<boolean> {
    try {
      const supported = await NfcManager.isSupported();
      if (!supported) {
        console.log('NFC not supported on this device');
        return false;
      }

      await NfcManager.start();
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize NFC:', error);
      return false;
    }
  }

  /**
   * Check if NFC is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const supported = await NfcManager.isSupported();
      const enabled = await NfcManager.isEnabled();
      return supported && enabled;
    } catch {
      return false;
    }
  }

  /**
   * Read YubiKey OTP via NFC
   */
  async readYubiKeyOTP(): Promise<OTPResult | null> {
    if (!this.isInitialized) {
      await this.init();
    }

    this.isReading = true;

    try {
      // Request NFC technology
      await NfcManager.requestTechnology(NfcTech.Ndef);

      // Get tag
      const tag = await NfcManager.getTag();
      if (!tag) {
        throw new Error('No NFC tag detected');
      }

      // Read NDEF message
      const ndef = await NfcManager.ndefHandler.getNdefMessage();
      if (!ndef || !ndef.ndefMessage || ndef.ndefMessage.length === 0) {
        throw new Error('No NDEF message found');
      }

      // Parse YubiKey OTP from NDEF
      const record = ndef.ndefMessage[0];
      const payload = Ndef.text.decodePayload(new Uint8Array(record.payload));

      // YubiKey OTP is typically in format: https://my.yubico.com/yk/#XXXX...
      // Or just the OTP string directly
      let otp = payload;
      if (payload.includes('yk/#')) {
        otp = payload.split('yk/#')[1];
      } else if (payload.includes('otp/')) {
        otp = payload.split('otp/')[1];
      }

      // Haptic feedback on success
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      return {
        otp: otp.trim(),
        timestamp: Date.now(),
        valid: otp.length === 44, // YubiKey OTP is 44 characters
      };
    } catch (error) {
      console.error('YubiKey read error:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return null;
    } finally {
      this.isReading = false;
      await this.cleanup();
    }
  }

  /**
   * Start continuous NFC reading session
   */
  async startSession(
    onTagRead: (result: NFCReadResult) => void,
    options?: { alertMessage?: string }
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    this.isReading = true;

    try {
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: options?.alertMessage || 'Hold your YubiKey near the phone',
      });

      // Set up tag discovery listener
      NfcManager.setEventListener(NfcEvents.DiscoverTag, async (tag: any) => {
        try {
          const ndef = await NfcManager.ndefHandler.getNdefMessage();

          if (ndef?.ndefMessage) {
            const record = ndef.ndefMessage[0];
            const payload = Ndef.text.decodePayload(new Uint8Array(record.payload));

            // Determine type
            let type: NFCReadResult['type'] = 'unknown';
            if (payload.includes('yubico') || payload.length === 44) {
              type = 'yubikey';
            } else if (record.tnf === Ndef.TNF_WELL_KNOWN) {
              type = 'ndef';
            }

            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            onTagRead({
              type,
              payload,
              raw: new Uint8Array(record.payload),
            });
          }
        } catch (error) {
          console.error('Tag read error:', error);
        }
      });
    } catch (error) {
      console.error('Session start error:', error);
      this.isReading = false;
      throw error;
    }
  }

  /**
   * Stop NFC session
   */
  async stopSession(): Promise<void> {
    this.isReading = false;
    NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
    await this.cleanup();
  }

  /**
   * Get YubiKey information via NFC
   */
  async getYubiKeyInfo(): Promise<YubiKeyInfo | null> {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      await NfcManager.requestTechnology(NfcTech.IsoDep);

      // Select YubiKey OTP applet
      const selectApdu = [0x00, 0xa4, 0x04, 0x00, 0x07, 0xa0, 0x00, 0x00, 0x05, 0x27, 0x20, 0x01];
      const response = await NfcManager.isoDepHandler.transceive(selectApdu);

      if (response && response.length > 0) {
        // Parse YubiKey response
        // This is a simplified version - full implementation would parse TLV data
        const serialNumber = this.parseSerialNumber(response);
        const firmwareVersion = this.parseFirmwareVersion(response);

        return {
          serialNumber,
          firmwareVersion,
          formFactor: 'nfc',
          supportedModes: ['otp', 'challenge-response'],
        };
      }

      return null;
    } catch (error) {
      console.error('Get YubiKey info error:', error);
      return null;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Send challenge to YubiKey and get response
   */
  async challengeResponse(challenge: string): Promise<ChallengeResponse | null> {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      await NfcManager.requestTechnology(NfcTech.IsoDep);

      // Select challenge-response applet
      const selectApdu = [0x00, 0xa4, 0x04, 0x00, 0x08, 0xa0, 0x00, 0x00, 0x05, 0x27, 0x21, 0x01, 0x01];
      await NfcManager.isoDepHandler.transceive(selectApdu);

      // Convert challenge to bytes
      const challengeBytes = this.hexToBytes(challenge);

      // Build HMAC-SHA1 challenge APDU
      const apdu = [
        0x00, // CLA
        0x01, // INS (HMAC challenge)
        0x02, // P1 (slot 2)
        0x00, // P2
        challengeBytes.length, // Lc
        ...challengeBytes,
        0x00, // Le (expect variable response)
      ];

      const response = await NfcManager.isoDepHandler.transceive(apdu);

      if (response && response.length >= 20) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        return {
          challenge,
          response: this.bytesToHex(response.slice(0, 20)),
          timestamp: Date.now(),
        };
      }

      return null;
    } catch (error) {
      console.error('Challenge-response error:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return null;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Verify OTP with GENESIS server
   */
  async verifyOTP(otp: string): Promise<boolean> {
    try {
      const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${API_BASE}/yubikey/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp }),
      });

      const data = await response.json();
      return data.valid === true;
    } catch (error) {
      console.error('OTP verification error:', error);
      return false;
    }
  }

  /**
   * Clean up NFC resources
   */
  private async cleanup(): Promise<void> {
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Parse serial number from YubiKey response
   */
  private parseSerialNumber(response: number[]): string {
    // YubiKey serial is typically at offset 4, 4 bytes
    if (response.length >= 8) {
      const serial =
        (response[4] << 24) | (response[5] << 16) | (response[6] << 8) | response[7];
      return serial.toString();
    }
    return 'Unknown';
  }

  /**
   * Parse firmware version from YubiKey response
   */
  private parseFirmwareVersion(response: number[]): string {
    // Firmware version is at offset 1-3
    if (response.length >= 4) {
      return `${response[1]}.${response[2]}.${response[3]}`;
    }
    return 'Unknown';
  }

  /**
   * Convert hex string to byte array
   */
  private hexToBytes(hex: string): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
  }

  /**
   * Convert byte array to hex string
   */
  private bytesToHex(bytes: number[]): string {
    return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Check if currently reading
   */
  get reading(): boolean {
    return this.isReading;
  }
}

// Singleton instance
export const nfcService = new NFCService();

// React hook for NFC
import { useState, useEffect, useCallback } from 'react';

export function useNFC() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkNFC = async () => {
      const available = await nfcService.isAvailable();
      setIsAvailable(available);
    };
    checkNFC();
  }, []);

  const readYubiKey = useCallback(async () => {
    setIsReading(true);
    setError(null);

    try {
      const result = await nfcService.readYubiKeyOTP();
      setIsReading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'NFC read failed');
      setIsReading(false);
      return null;
    }
  }, []);

  const verifyOTP = useCallback(async (otp: string) => {
    return await nfcService.verifyOTP(otp);
  }, []);

  const challengeResponse = useCallback(async (challenge: string) => {
    setIsReading(true);
    setError(null);

    try {
      const result = await nfcService.challengeResponse(challenge);
      setIsReading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Challenge-response failed');
      setIsReading(false);
      return null;
    }
  }, []);

  return {
    isAvailable,
    isReading,
    error,
    readYubiKey,
    verifyOTP,
    challengeResponse,
    getYubiKeyInfo: nfcService.getYubiKeyInfo.bind(nfcService),
  };
}

export default nfcService;
