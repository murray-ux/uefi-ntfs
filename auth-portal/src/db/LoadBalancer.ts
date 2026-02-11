/**
 * LoadBalancer.ts - Database load balancer with chronology protector
 *
 * MediaWiki's load balancer handles read/write splitting across
 * primary and replica database servers. The chronology protector
 * ensures users never see stale data after their own writes.
 *
 * @see Manual:Database_access
 * @see includes/libs/rdbms/loadbalancer/LoadBalancer.php
 */

import type { DBServer, LoadBalancerState, Session } from '../types';
import { getConfig } from '../Setup';

// ============================================================================
// Types
// ============================================================================

export interface DBConnection {
  id: string;
  server: DBServer;
  isOpen: boolean;
  lastQuery: Date;
}

export interface QueryResult<T = unknown> {
  rows: T[];
  affectedRows?: number;
  insertId?: number;
  fields?: string[];
}

// ============================================================================
// Chronology Protector
// ============================================================================

/**
 * ChronologyProtector ensures a user sees their own writes
 *
 * When a user makes a write, we store the primary's position in their session.
 * On subsequent reads, we wait for a replica to catch up to that position
 * before serving the read request.
 *
 * This prevents the confusing situation where a user makes an edit,
 * but the page refresh shows the old version (because it hit a lagging replica).
 */
export class ChronologyProtector {
  private session: Session | null = null;
  private primaryPosition: string | null = null;
  private positionWaits: Map<string, Promise<void>> = new Map();

  /**
   * Initialize with user session
   */
  setSession(session: Session | null): void {
    this.session = session;
    this.primaryPosition = session?.primaryPosition || null;
  }

  /**
   * Record the primary's position after a write
   */
  recordPrimaryPosition(position: string): void {
    this.primaryPosition = position;

    // Store in session for next request
    if (this.session) {
      this.session.primaryPosition = position;
    }
  }

  /**
   * Get the position we need replicas to reach
   */
  getWaitPosition(): string | null {
    return this.primaryPosition;
  }

  /**
   * Check if a replica has caught up to our position
   */
  async waitForPosition(server: DBServer, timeout: number = 5000): Promise<boolean> {
    if (!this.primaryPosition) {
      return true; // No position to wait for
    }

    const key = `${server.host}:${this.primaryPosition}`;

    // Check if we're already waiting for this position on this server
    if (this.positionWaits.has(key)) {
      await this.positionWaits.get(key);
      return true;
    }

    // Create a wait promise
    const waitPromise = this.doWaitForPosition(server, timeout);
    this.positionWaits.set(key, waitPromise);

    try {
      await waitPromise;
      return true;
    } catch {
      return false;
    } finally {
      this.positionWaits.delete(key);
    }
  }

  /**
   * Internal wait implementation
   */
  private async doWaitForPosition(server: DBServer, timeout: number): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 50; // ms

    while (Date.now() - startTime < timeout) {
      // In a real implementation, this would query the replica's position
      // For now, we simulate by checking lag
      if (server.lag !== undefined && server.lag < 1) {
        return; // Replica is caught up
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Timeout waiting for replica ${server.host} to reach position`);
  }

  /**
   * Clear the stored position (e.g., after logout)
   */
  clear(): void {
    this.primaryPosition = null;
    if (this.session) {
      delete this.session.primaryPosition;
    }
  }
}

// ============================================================================
// Load Balancer
// ============================================================================

/**
 * LoadBalancer handles database connection management and read/write splitting
 *
 * Configuration is done via $wgLBFactoryConf in LocalSettings.ts:
 *
 * @example
 * wgLBFactoryConf = {
 *   class: 'LBFactoryMulti',
 *   servers: [
 *     { host: 'db-primary.example.com', weight: 0, type: 'primary' },
 *     { host: 'db-replica1.example.com', weight: 10, type: 'replica' },
 *     { host: 'db-replica2.example.com', weight: 10, type: 'replica' },
 *   ],
 * };
 */
export class LoadBalancer {
  private servers: DBServer[] = [];
  private primary: DBServer | null = null;
  private replicas: DBServer[] = [];
  private connections: Map<string, DBConnection> = new Map();
  private chronologyProtector: ChronologyProtector;
  private state: LoadBalancerState = {
    writesPending: false,
  };

  // Maximum replication lag before a replica is considered unavailable
  private maxLag = 30; // seconds

  constructor() {
    this.chronologyProtector = new ChronologyProtector();
    this.loadConfiguration();
  }

  /**
   * Load server configuration
   */
  private loadConfiguration(): void {
    try {
      const config = getConfig();
      const lbConfig = config.lbFactoryConf;

      if (lbConfig.servers.length === 0) {
        // Single server mode (SQLite or simple MySQL)
        this.servers = [{
          host: config.dbServer || 'localhost',
          weight: 1,
          type: 'primary',
          available: true,
        }];
      } else {
        this.servers = lbConfig.servers.map(s => ({
          ...s,
          available: true,
          lag: 0,
        }));
      }

      // Separate primary and replicas
      this.primary = this.servers.find(s => s.type === 'primary') || this.servers[0];
      this.replicas = this.servers.filter(s => s.type === 'replica');

    } catch {
      // Configuration not yet initialized - set defaults
      this.servers = [{ host: 'localhost', weight: 1, type: 'primary', available: true }];
      this.primary = this.servers[0];
      this.replicas = [];
    }
  }

  /**
   * Set user session for chronology protection
   */
  setSession(session: Session | null): void {
    this.chronologyProtector.setSession(session);
  }

  /**
   * Get a connection for reading
   *
   * Selects a replica based on weight and lag, unless:
   * - There are no replicas
   * - All replicas are lagging
   * - Chronology protector requires waiting
   */
  async getReadConnection(): Promise<DBConnection> {
    // If no replicas, use primary
    if (this.replicas.length === 0) {
      return this.getPrimaryConnection();
    }

    // Filter available replicas
    const availableReplicas = this.replicas.filter(
      s => s.available && (s.lag === undefined || s.lag < this.maxLag)
    );

    if (availableReplicas.length === 0) {
      // All replicas lagging, fall back to primary
      console.warn('All replicas lagging, using primary for read');
      return this.getPrimaryConnection();
    }

    // Select replica based on weight (weighted random)
    const replica = this.selectByWeight(availableReplicas);

    // Check chronology protector
    const waitPosition = this.chronologyProtector.getWaitPosition();
    if (waitPosition) {
      const caughtUp = await this.chronologyProtector.waitForPosition(replica, 5000);
      if (!caughtUp) {
        // Replica didn't catch up in time, try another or use primary
        const otherReplicas = availableReplicas.filter(r => r !== replica);
        if (otherReplicas.length > 0) {
          return this.getConnectionToServer(this.selectByWeight(otherReplicas));
        }
        return this.getPrimaryConnection();
      }
    }

    return this.getConnectionToServer(replica);
  }

  /**
   * Get a connection for writing (always primary)
   */
  async getWriteConnection(): Promise<DBConnection> {
    this.state.writesPending = true;
    return this.getPrimaryConnection();
  }

  /**
   * Get connection to primary server
   */
  private getPrimaryConnection(): DBConnection {
    if (!this.primary) {
      throw new Error('No primary server configured');
    }
    return this.getConnectionToServer(this.primary);
  }

  /**
   * Get or create connection to a specific server
   */
  private getConnectionToServer(server: DBServer): DBConnection {
    const key = server.host;

    if (this.connections.has(key)) {
      const conn = this.connections.get(key)!;
      if (conn.isOpen) {
        conn.lastQuery = new Date();
        return conn;
      }
    }

    // Create new connection
    const conn: DBConnection = {
      id: `conn_${key}_${Date.now()}`,
      server,
      isOpen: true,
      lastQuery: new Date(),
    };

    this.connections.set(key, conn);
    return conn;
  }

  /**
   * Select a server based on weights (weighted random selection)
   */
  private selectByWeight(servers: DBServer[]): DBServer {
    const totalWeight = servers.reduce((sum, s) => sum + s.weight, 0);

    if (totalWeight === 0) {
      // All weights are 0, select randomly
      return servers[Math.floor(Math.random() * servers.length)];
    }

    let random = Math.random() * totalWeight;

    for (const server of servers) {
      random -= server.weight;
      if (random <= 0) {
        return server;
      }
    }

    return servers[servers.length - 1];
  }

  /**
   * Record that a write completed
   * Called after successful write to update chronology protector
   */
  recordWrite(position: string): void {
    this.chronologyProtector.recordPrimaryPosition(position);
  }

  /**
   * Commit pending writes and sync state
   */
  async commitAndWait(): Promise<void> {
    if (!this.state.writesPending) {
      return;
    }

    // In a real implementation, this would:
    // 1. Commit the transaction
    // 2. Get the primary's position
    // 3. Record it for chronology protection

    const position = `pos_${Date.now()}`;
    this.recordWrite(position);
    this.state.writesPending = false;
  }

  /**
   * Update replication lag for a server
   */
  updateLag(host: string, lag: number): void {
    const server = this.servers.find(s => s.host === host);
    if (server) {
      server.lag = lag;
      server.available = lag < this.maxLag;
    }
  }

  /**
   * Get current lag for all replicas
   */
  getLagTimes(): Map<string, number> {
    const lags = new Map<string, number>();
    for (const replica of this.replicas) {
      lags.set(replica.host, replica.lag ?? 0);
    }
    return lags;
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    for (const conn of this.connections.values()) {
      conn.isOpen = false;
    }
    this.connections.clear();
    this.chronologyProtector.clear();
  }

  /**
   * Get server information
   */
  getServerInfo(): { primary: DBServer | null; replicas: DBServer[] } {
    return {
      primary: this.primary,
      replicas: [...this.replicas],
    };
  }
}

// ============================================================================
// Global Instance
// ============================================================================

let loadBalancer: LoadBalancer | null = null;

/**
 * Get the global LoadBalancer instance
 */
export function getLoadBalancer(): LoadBalancer {
  if (!loadBalancer) {
    loadBalancer = new LoadBalancer();
  }
  return loadBalancer;
}

/**
 * Reset the global LoadBalancer (for testing)
 */
export function resetLoadBalancer(): void {
  if (loadBalancer) {
    loadBalancer.closeAll();
  }
  loadBalancer = null;
}

// ============================================================================
// Convenience Functions (MediaWiki-style)
// ============================================================================

/**
 * Get a database connection for reading
 * Mimics MediaWiki's wfGetDB( DB_REPLICA )
 */
export async function wfGetDB(mode: 'replica' | 'primary' = 'replica'): Promise<DBConnection> {
  const lb = getLoadBalancer();
  return mode === 'primary'
    ? lb.getWriteConnection()
    : lb.getReadConnection();
}

/**
 * Shorthand for primary connection
 */
export async function wfGetPrimaryDB(): Promise<DBConnection> {
  return wfGetDB('primary');
}

/**
 * Shorthand for replica connection
 */
export async function wfGetReplicaDB(): Promise<DBConnection> {
  return wfGetDB('replica');
}

export default LoadBalancer;
