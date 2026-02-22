/**
 * MessageCache.ts - Internationalization message system
 *
 * MediaWiki-style i18n with:
 * - JSON message files
 * - Fallback language chains
 * - qqq documentation language
 * - PLURAL, GENDER, GRAMMAR magic words
 * - Parameter substitution
 *
 * @see Manual:Language
 * @see Manual:Messages_API
 */

import { getConfig } from '../Setup';
import type { Message, MessageCache as MessageCacheType } from '../types';

// ============================================================================
// Types
// ============================================================================

interface MessageData {
  [key: string]: string;
}

interface LoadedLanguage {
  messages: MessageData;
  loaded: boolean;
  loadError?: string;
}

type GrammarForm = 'genitive' | 'dative' | 'accusative' | 'instrumental' | 'prepositional';

// ============================================================================
// Message Cache
// ============================================================================

/**
 * MessageCache handles loading and retrieving localized messages
 *
 * Messages are stored in i18n/[lang].json files:
 * - i18n/en.json - English messages (fallback)
 * - i18n/es.json - Spanish messages
 * - i18n/qqq.json - Message documentation
 *
 * @example
 * // Get a message
 * const msg = await MessageCache.get('login-title', 'es');
 *
 * // Get a message with parameters
 * const msg = await MessageCache.get('welcome-user', 'en', ['Alice']);
 */
export class MessageCache {
  private static languages: Map<string, LoadedLanguage> = new Map();
  private static documentation: MessageData = {};
  private static initialized = false;

  /**
   * Initialize the message cache
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load documentation (qqq)
    await this.loadLanguage('qqq');

    // Load default language
    const config = getConfig();
    await this.loadLanguage(config.languageCode);

    // Always load English as ultimate fallback
    if (config.languageCode !== 'en') {
      await this.loadLanguage('en');
    }

    this.initialized = true;
  }

  /**
   * Load messages for a language
   */
  static async loadLanguage(langCode: string): Promise<void> {
    if (this.languages.has(langCode)) {
      return;
    }

    try {
      // Try to load the language file
      const messages = await this.loadLanguageFile(langCode);

      this.languages.set(langCode, {
        messages,
        loaded: true,
      });

      // Store documentation separately
      if (langCode === 'qqq') {
        this.documentation = messages;
      }

    } catch (error) {
      this.languages.set(langCode, {
        messages: {},
        loaded: false,
        loadError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Load a language file from disk
   */
  private static async loadLanguageFile(langCode: string): Promise<MessageData> {
    try {
      // In a real implementation, this would use fs.readFile
      // For now, we'll use dynamic import
      const module = await import(`../../i18n/${langCode}.json`);
      return module.default || module;
    } catch {
      // If file doesn't exist, return empty
      return {};
    }
  }

  /**
   * Get a message in the specified language
   *
   * @param key - Message key
   * @param langCode - Language code
   * @param params - Parameters to substitute
   * @returns The message, or the key if not found
   */
  static async get(
    key: string,
    langCode?: string,
    params?: Array<string | number>
  ): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    const config = getConfig();
    const lang = langCode || config.languageCode;

    // Try to get message, following fallback chain
    const message = await this.getWithFallback(key, lang);

    if (message === null) {
      // Message not found, return key wrapped in angle brackets
      return `⟨${key}⟩`;
    }

    // Substitute parameters
    return this.substituteParams(message, params || []);
  }

  /**
   * Get a message following the fallback chain
   */
  private static async getWithFallback(key: string, langCode: string): Promise<string | null> {
    // Ensure language is loaded
    await this.loadLanguage(langCode);

    const lang = this.languages.get(langCode);
    if (lang?.messages[key]) {
      return lang.messages[key];
    }

    // Try fallback chain
    const config = getConfig();
    const fallbacks = config.languageFallbackChain[langCode] || [];

    for (const fallbackLang of fallbacks) {
      await this.loadLanguage(fallbackLang);
      const fallback = this.languages.get(fallbackLang);
      if (fallback?.messages[key]) {
        return fallback.messages[key];
      }
    }

    // Try English as ultimate fallback
    if (langCode !== 'en') {
      await this.loadLanguage('en');
      const en = this.languages.get('en');
      if (en?.messages[key]) {
        return en.messages[key];
      }
    }

    return null;
  }

  /**
   * Substitute parameters in a message
   *
   * Parameters are referenced as $1, $2, etc.
   */
  private static substituteParams(message: string, params: Array<string | number>): string {
    let result = message;

    // Replace $1, $2, etc. with parameters
    for (let i = 0; i < params.length; i++) {
      const placeholder = `$${i + 1}`;
      result = result.replace(new RegExp(`\\${placeholder}`, 'g'), String(params[i]));
    }

    return result;
  }

  /**
   * Get message documentation (qqq)
   */
  static getDocumentation(key: string): string | undefined {
    return this.documentation[key];
  }

  /**
   * Get all documentation
   */
  static getAllDocumentation(): MessageData {
    return { ...this.documentation };
  }

  /**
   * Check if a message exists
   */
  static async exists(key: string, langCode?: string): Promise<boolean> {
    const message = await this.get(key, langCode);
    return !message.startsWith('⟨');
  }

  /**
   * Get all keys for a language
   */
  static getKeys(langCode: string): string[] {
    const lang = this.languages.get(langCode);
    return lang ? Object.keys(lang.messages) : [];
  }

  /**
   * Clear the cache (for testing or reloading)
   */
  static clear(): void {
    this.languages.clear();
    this.documentation = {};
    this.initialized = false;
  }
}

// ============================================================================
// Message Class (for complex message handling)
// ============================================================================

/**
 * Message class for building complex localized messages
 *
 * @example
 * const msg = new Message('welcome-user')
 *   .params(['Alice'])
 *   .inLanguage('es')
 *   .toString();
 */
export class MessageBuilder {
  private key: string;
  private langCode?: string;
  private messageParams: Array<string | number> = [];

  constructor(key: string) {
    this.key = key;
  }

  /**
   * Set message parameters
   */
  params(params: Array<string | number>): this {
    this.messageParams = params;
    return this;
  }

  /**
   * Set the language
   */
  inLanguage(langCode: string): this {
    this.langCode = langCode;
    return this;
  }

  /**
   * Get the message text
   */
  async text(): Promise<string> {
    return MessageCache.get(this.key, this.langCode, this.messageParams);
  }

  /**
   * Alias for text()
   */
  async toString(): Promise<string> {
    return this.text();
  }

  /**
   * Check if message exists
   */
  async exists(): Promise<boolean> {
    return MessageCache.exists(this.key, this.langCode);
  }
}

// ============================================================================
// Magic Word Processors
// ============================================================================

/**
 * Process {{PLURAL:$1|singular|plural}} syntax
 */
export function processPlural(
  count: number,
  forms: string[],
  langCode: string
): string {
  // Different languages have different plural rules
  // This is a simplified implementation

  if (forms.length === 0) return '';
  if (forms.length === 1) return forms[0];

  // English-style: singular if 1, plural otherwise
  // More complex languages would need proper CLDR plural rules
  const index = count === 1 ? 0 : Math.min(1, forms.length - 1);
  return forms[index];
}

/**
 * Process {{GENDER:$1|male|female|neutral}} syntax
 */
export function processGender(
  gender: 'male' | 'female' | 'unknown',
  forms: string[]
): string {
  if (forms.length === 0) return '';

  switch (gender) {
    case 'male':
      return forms[0];
    case 'female':
      return forms[1] || forms[0];
    default:
      return forms[2] || forms[0];
  }
}

/**
 * Process {{GRAMMAR:case|word}} syntax
 */
export function processGrammar(
  word: string,
  grammaticalCase: GrammarForm,
  langCode: string
): string {
  // Grammar transformations are highly language-specific
  // This is a placeholder - real implementation would have
  // per-language grammar rules

  // For now, just return the word unchanged
  return word;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get a message (shorthand)
 */
export function wfMessage(key: string, ...params: Array<string | number>): MessageBuilder {
  return new MessageBuilder(key).params(params);
}

/**
 * Get a message immediately (for simple cases)
 */
export async function wfMsg(key: string, langCode?: string): Promise<string> {
  return MessageCache.get(key, langCode);
}

/**
 * Check if a language is RTL
 */
export function isRTL(langCode: string): boolean {
  try {
    const config = getConfig();
    return config.rtlLanguages.includes(langCode);
  } catch {
    // Configuration not loaded, use defaults
    return ['ar', 'he', 'fa', 'ur', 'yi', 'ps', 'sd'].includes(langCode);
  }
}

/**
 * Get the text direction for a language
 */
export function getDirection(langCode: string): 'ltr' | 'rtl' {
  return isRTL(langCode) ? 'rtl' : 'ltr';
}

/**
 * Get fallback languages for a given language
 */
export function getFallbackLanguages(langCode: string): string[] {
  try {
    const config = getConfig();
    return config.languageFallbackChain[langCode] || ['en'];
  } catch {
    return ['en'];
  }
}

export default MessageCache;
