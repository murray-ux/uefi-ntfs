/**
 * ObjectCache.ts - Abstract object caching layer
 *
 * MediaWiki's object cache provides a unified interface for caching,
 * with multiple backend implementations (memcached, redis, database, etc.)
 *
 * @see Manual:Caching
 * @see includes/libs/objectcache/
 */

import type { ObjectCache as IObjectCache, CacheEntry } from '../types';
import { getConfig } from '../Setup';
import { Hooks } from '../Hooks';

// ============================================================================
// Abstract Base Class
// ============================================================================

/**
 * Base class for all cache implementations
 */
export abstract class BagOStuff implements IObjectCache {
  protected prefix: string;
  protected defaultExpiry: number;

  constructor(options: { prefix?: string; defaultExpiry?: number } = {}) {
    this.prefix = options.prefix || 'ap:';
    this.defaultExpiry = options.defaultExpiry || 86400; // 24 hours
  }

  /**
   * Generate a cache key with prefix
   */
  protected makeKey(...components: string[]): string {
    return this.prefix + components.join(':');
  }

  /**
   * Get a value from cache
   */
  abstract get(key: string): Promise<unknown | null>;

  /**
   * Set a value in cache
   */
  abstract set(key: string, value: unknown, expiry?: number): Promise<boolean>;

  /**
   * Delete a value from cache
   */
  abstract delete(key: string): Promise<boolean>;

  /**
   * Clear all cache entries
   */
  abstract clear(): Promise<boolean>;

  /**
   * Get multiple values at once
   */
  async getMulti(keys: string[]): Promise<Map<string, unknown>> {
    const results = new Map<string, unknown>();
    for (const key of keys) {
      const value = await this.get(key);
      if (value !== null) {
        results.set(key, value);
      }
    }
    return results;
  }

  /**
   * Set multiple values at once
   */
  async setMulti(items: Map<string, unknown>, expiry?: number): Promise<boolean> {
    let success = true;
    for (const [key, value] of items) {
      if (!await this.set(key, value, expiry)) {
        success = false;
      }
    }
    return success;
  }

  /**
   * Delete multiple values at once
   */
  async deleteMulti(keys: string[]): Promise<boolean> {
    let success = true;
    for (const key of keys) {
      if (!await this.delete(key)) {
        success = false;
      }
    }
    return success;
  }

  /**
   * Increment a numeric value
   */
  async incr(key: string, amount: number = 1): Promise<number | false> {
    const value = await this.get(key);
    if (typeof value !== 'number') {
      return false;
    }
    const newValue = value + amount;
    await this.set(key, newValue);
    return newValue;
  }

  /**
   * Decrement a numeric value
   */
  async decr(key: string, amount: number = 1): Promise<number | false> {
    return this.incr(key, -amount);
  }

  /**
   * Get a value, or compute and cache it if missing
   */
  async getWithSetCallback<T>(
    key: string,
    compute: () => Promise<T>,
    expiry?: number
  ): Promise<T> {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached as T;
    }

    const value = await compute();
    await this.set(key, value, expiry);
    return value;
  }

  /**
   * Lock a key for exclusive access
   */
  async lock(key: string, timeout: number = 5000): Promise<boolean> {
    const lockKey = this.makeKey('lock', key);
    const existing = await this.get(lockKey);
    if (existing !== null) {
      return false;
    }
    return this.set(lockKey, Date.now(), timeout / 1000);
  }

  /**
   * Unlock a key
   */
  async unlock(key: string): Promise<boolean> {
    const lockKey = this.makeKey('lock', key);
    return this.delete(lockKey);
  }
}

// ============================================================================
// In-Memory Cache (Development/Testing)
// ============================================================================

/**
 * Simple in-memory cache
 * Suitable for development and single-server deployments
 */
export class HashBagOStuff extends BagOStuff {
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options: { prefix?: string; defaultExpiry?: number } = {}) {
    super(options);
    // Start cleanup timer
    this.startCleanup();
  }

  async get(key: string): Promise<unknown | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (entry.expiry > 0 && Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: unknown, expiry?: number): Promise<boolean> {
    const ttl = expiry ?? this.defaultExpiry;
    this.cache.set(key, {
      value,
      expiry: ttl > 0 ? Date.now() + (ttl * 1000) : 0,
      created: Date.now(),
    });
    return true;
  }

  async delete(key: string): Promise<boolean> {
    await Hooks.run('CacheInvalidate', key);
    return this.cache.delete(key);
  }

  async clear(): Promise<boolean> {
    this.cache.clear();
    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache) {
        if (entry.expiry > 0 && now > entry.expiry) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Stop cleanup timer
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// ============================================================================
// Database Cache
// ============================================================================

/**
 * Database-backed cache
 * Uses the objectcache table
 */
export class SqlBagOStuff extends BagOStuff {
  // In a real implementation, this would use the database connection

  async get(key: string): Promise<unknown | null> {
    // SELECT value, exptime FROM objectcache WHERE keyname = ?
    // Check if expired, return null if so
    // Parse JSON value
    console.log('[SqlBagOStuff] GET:', key);
    return null; // Placeholder
  }

  async set(key: string, value: unknown, expiry?: number): Promise<boolean> {
    // INSERT OR REPLACE INTO objectcache (keyname, value, exptime)
    // VALUES (?, ?, ?)
    console.log('[SqlBagOStuff] SET:', key, expiry);
    return true; // Placeholder
  }

  async delete(key: string): Promise<boolean> {
    // DELETE FROM objectcache WHERE keyname = ?
    await Hooks.run('CacheInvalidate', key);
    console.log('[SqlBagOStuff] DELETE:', key);
    return true; // Placeholder
  }

  async clear(): Promise<boolean> {
    // DELETE FROM objectcache
    console.log('[SqlBagOStuff] CLEAR');
    return true; // Placeholder
  }
}

// ============================================================================
// Memcached Cache
// ============================================================================

/**
 * Memcached-backed cache
 * Requires memcached servers to be configured
 */
export class MemcachedBagOStuff extends BagOStuff {
  private servers: string[];
  // In real implementation: private client: Memcached;

  constructor(options: { servers: string[]; prefix?: string; defaultExpiry?: number }) {
    super(options);
    this.servers = options.servers;
    // this.client = new Memcached(this.servers);
  }

  async get(key: string): Promise<unknown | null> {
    // return this.client.get(this.prefix + key);
    console.log('[MemcachedBagOStuff] GET:', key);
    return null; // Placeholder
  }

  async set(key: string, value: unknown, expiry?: number): Promise<boolean> {
    // return this.client.set(this.prefix + key, value, expiry ?? this.defaultExpiry);
    console.log('[MemcachedBagOStuff] SET:', key);
    return true; // Placeholder
  }

  async delete(key: string): Promise<boolean> {
    await Hooks.run('CacheInvalidate', key);
    // return this.client.del(this.prefix + key);
    console.log('[MemcachedBagOStuff] DELETE:', key);
    return true; // Placeholder
  }

  async clear(): Promise<boolean> {
    // return this.client.flush();
    console.log('[MemcachedBagOStuff] CLEAR');
    return true; // Placeholder
  }
}

// ============================================================================
// Redis Cache
// ============================================================================

/**
 * Redis-backed cache
 */
export class RedisBagOStuff extends BagOStuff {
  private servers: string[];
  // In real implementation: private client: Redis;

  constructor(options: { servers: string[]; prefix?: string; defaultExpiry?: number }) {
    super(options);
    this.servers = options.servers;
    // this.client = new Redis(this.servers[0]);
  }

  async get(key: string): Promise<unknown | null> {
    // const value = await this.client.get(this.prefix + key);
    // return value ? JSON.parse(value) : null;
    console.log('[RedisBagOStuff] GET:', key);
    return null; // Placeholder
  }

  async set(key: string, value: unknown, expiry?: number): Promise<boolean> {
    // const ttl = expiry ?? this.defaultExpiry;
    // await this.client.setex(this.prefix + key, ttl, JSON.stringify(value));
    console.log('[RedisBagOStuff] SET:', key);
    return true; // Placeholder
  }

  async delete(key: string): Promise<boolean> {
    await Hooks.run('CacheInvalidate', key);
    // await this.client.del(this.prefix + key);
    console.log('[RedisBagOStuff] DELETE:', key);
    return true; // Placeholder
  }

  async clear(): Promise<boolean> {
    // await this.client.flushall();
    console.log('[RedisBagOStuff] CLEAR');
    return true; // Placeholder
  }
}

// ============================================================================
// APCu Cache (PHP opcode cache equivalent)
// ============================================================================

/**
 * APCu-style cache (process-local, fast)
 * Uses in-memory storage with no network overhead
 */
export class APCuBagOStuff extends HashBagOStuff {
  // Basically the same as HashBagOStuff but could have
  // special handling for process-local caching
}

// ============================================================================
// Empty Cache (No-op)
// ============================================================================

/**
 * Empty cache that stores nothing
 * Used when caching is disabled
 */
export class EmptyBagOStuff extends BagOStuff {
  async get(): Promise<null> {
    return null;
  }

  async set(): Promise<boolean> {
    return true;
  }

  async delete(): Promise<boolean> {
    return true;
  }

  async clear(): Promise<boolean> {
    return true;
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Factory for creating cache instances based on configuration
 */
export class ObjectCacheFactory {
  private static mainCache: BagOStuff | null = null;
  private static messageCache: BagOStuff | null = null;
  private static sessionCache: BagOStuff | null = null;

  /**
   * Get the main object cache
   */
  static getMainCache(): BagOStuff {
    if (!this.mainCache) {
      this.mainCache = this.createCache('main');
    }
    return this.mainCache;
  }

  /**
   * Get the message cache (for i18n)
   */
  static getMessageCache(): BagOStuff {
    if (!this.messageCache) {
      this.messageCache = this.createCache('message');
    }
    return this.messageCache;
  }

  /**
   * Get the session cache
   */
  static getSessionCache(): BagOStuff {
    if (!this.sessionCache) {
      this.sessionCache = this.createCache('session');
    }
    return this.sessionCache;
  }

  /**
   * Create a cache instance based on type
   */
  private static createCache(purpose: 'main' | 'message' | 'session'): BagOStuff {
    try {
      const config = getConfig();

      let cacheType: string;
      switch (purpose) {
        case 'message':
          cacheType = config.messageCacheType;
          break;
        case 'session':
          cacheType = config.sessionCacheType;
          break;
        default:
          cacheType = config.mainCacheType;
      }

      switch (cacheType) {
        case 'memcached':
          return new MemcachedBagOStuff({
            servers: config.memcachedServers,
            prefix: `ap:${purpose}:`,
            defaultExpiry: config.objectCacheExpiry,
          });

        case 'redis':
          return new RedisBagOStuff({
            servers: config.redisServers,
            prefix: `ap:${purpose}:`,
            defaultExpiry: config.objectCacheExpiry,
          });

        case 'db':
          return new SqlBagOStuff({
            prefix: `ap:${purpose}:`,
            defaultExpiry: config.objectCacheExpiry,
          });

        case 'apcu':
          return new APCuBagOStuff({
            prefix: `ap:${purpose}:`,
            defaultExpiry: config.objectCacheExpiry,
          });

        case 'none':
          return new EmptyBagOStuff();

        default:
          // Default to in-memory for development
          return new HashBagOStuff({
            prefix: `ap:${purpose}:`,
            defaultExpiry: config.objectCacheExpiry,
          });
      }
    } catch {
      // Configuration not loaded, use in-memory
      return new HashBagOStuff({ prefix: `ap:${purpose}:` });
    }
  }

  /**
   * Reset all caches (for testing)
   */
  static reset(): void {
    this.mainCache = null;
    this.messageCache = null;
    this.sessionCache = null;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get the main object cache
 */
export function wfGetMainCache(): BagOStuff {
  return ObjectCacheFactory.getMainCache();
}

/**
 * Get a cached value, computing if missing
 */
export async function wfGetCached<T>(
  key: string,
  compute: () => Promise<T>,
  expiry?: number
): Promise<T> {
  const cache = ObjectCacheFactory.getMainCache();
  return cache.getWithSetCallback(key, compute, expiry);
}

/**
 * Invalidate a cache key
 */
export async function wfInvalidateCache(key: string): Promise<boolean> {
  const cache = ObjectCacheFactory.getMainCache();
  return cache.delete(key);
}

export default ObjectCacheFactory;
