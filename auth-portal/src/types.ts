/**
 * Auth Portal - Type Definitions
 * Mirroring Wikimedia Commons authentication patterns
 */

export interface User {
  id: string;
  username: string;
  email?: string;
  emailConfirmed: boolean;
  createdAt: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  language: string;
  theme: 'light' | 'dark' | 'auto';
  textSize: 'standard' | 'medium' | 'large';
  expandSections: boolean;
  enhancedPasswordReset: boolean;  // EPR - require both username AND email
  emailNotifications: boolean;
}

export interface PasswordResetRequest {
  username?: string;
  email?: string;
  timestamp: Date;
  token: string;
  used: boolean;
  expiresAt: Date;
}

export interface AuthResult {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
  requiresEmailConfirmation?: boolean;
}

export interface PasswordResetResult {
  success: boolean;
  message: string;
  // Always show success for privacy - never reveal if account exists
  privacyProtected: true;
}

export type Language = {
  code: string;
  name: string;
  nativeName: string;
};

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'español' },
  { code: 'fr', name: 'French', nativeName: 'français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'pt', name: 'Portuguese', nativeName: 'português' },
  { code: 'ru', name: 'Russian', nativeName: 'русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'it', name: 'Italian', nativeName: 'italiano' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'sv', name: 'Swedish', nativeName: 'svenska' },
  { code: 'pl', name: 'Polish', nativeName: 'polski' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
];

export const DEFAULT_PREFERENCES: UserPreferences = {
  language: 'en',
  theme: 'light',
  textSize: 'standard',
  expandSections: false,
  enhancedPasswordReset: false,
  emailNotifications: true,
};
