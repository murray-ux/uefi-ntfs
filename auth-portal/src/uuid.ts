/**
 * RFC 4122 Compliant UUID Implementation
 *
 * Implements UUID versions 1, 4, and 5 per RFC 4122 specification.
 * https://www.rfc-editor.org/rfc/rfc4122
 *
 * UUID Format: xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx
 * Where M = version (1, 4, or 5) and N = variant (8, 9, A, or B for RFC 4122)
 */

import * as crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export type UUIDVersion = 1 | 4 | 5;

export interface UUIDComponents {
  timeLow: number;           // 32 bits
  timeMid: number;           // 16 bits
  timeHiAndVersion: number;  // 16 bits (4 bits version + 12 bits time_hi)
  clockSeqHiAndReserved: number; // 8 bits (2 bits variant + 6 bits clock_seq_hi)
  clockSeqLow: number;       // 8 bits
  node: Buffer;              // 48 bits (6 bytes)
}

export interface UUIDv1Options {
  node?: Buffer;             // 6-byte node (MAC address or random)
  clockSeq?: number;         // 14-bit clock sequence
}

export interface UUIDv5Options {
  namespace: string | Buffer; // Namespace UUID
  name: string;               // Name to hash
}

// ============================================================================
// Constants
// ============================================================================

// RFC 4122 Predefined Namespace UUIDs
export const NAMESPACE_DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
export const NAMESPACE_URL = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
export const NAMESPACE_OID = '6ba7b812-9dad-11d1-80b4-00c04fd430c8';
export const NAMESPACE_X500 = '6ba7b814-9dad-11d1-80b4-00c04fd430c8';

// NIL UUID (all zeros)
export const NIL_UUID = '00000000-0000-0000-0000-000000000000';

// Gregorian epoch offset (Oct 15, 1582) in 100-nanosecond intervals
const GREGORIAN_OFFSET = BigInt('122192928000000000');

// ============================================================================
// Internal State (for v1 UUIDs)
// ============================================================================

let lastTimestamp = BigInt(0);
let clockSequence = crypto.randomInt(0, 0x3FFF); // 14-bit random
let nodeId: Buffer | null = null;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Generate a version 1 (time-based) UUID
 *
 * Per RFC 4122 Section 4.2:
 * - Uses current timestamp (100-nanosecond intervals since Oct 15, 1582)
 * - Uses clock sequence to handle clock regression
 * - Uses node identifier (MAC address or random)
 */
export function v1(options: UUIDv1Options = {}): string {
  // Get or generate node ID (6 bytes)
  const node = options.node || getNodeId();

  // Get current timestamp in 100-nanosecond intervals since Gregorian epoch
  const now = BigInt(Date.now()) * BigInt(10000) + GREGORIAN_OFFSET;

  // Handle clock sequence per RFC 4122 Section 4.2.1
  let clockSeq = options.clockSeq ?? clockSequence;

  if (now <= lastTimestamp) {
    // Clock went backwards or same time - increment clock sequence
    clockSeq = (clockSeq + 1) & 0x3FFF;
    clockSequence = clockSeq;
  }

  lastTimestamp = now;

  // Extract timestamp components
  const timeLow = Number(now & BigInt(0xFFFFFFFF));
  const timeMid = Number((now >> BigInt(32)) & BigInt(0xFFFF));
  const timeHi = Number((now >> BigInt(48)) & BigInt(0x0FFF));

  // Build UUID bytes
  const bytes = Buffer.alloc(16);

  // time_low (4 bytes, big-endian)
  bytes.writeUInt32BE(timeLow, 0);

  // time_mid (2 bytes, big-endian)
  bytes.writeUInt16BE(timeMid, 4);

  // time_hi_and_version (2 bytes) - version 1 in high nibble
  bytes.writeUInt16BE((timeHi & 0x0FFF) | 0x1000, 6);

  // clock_seq_hi_and_reserved (1 byte) - variant 10xx in high bits
  bytes[8] = ((clockSeq >> 8) & 0x3F) | 0x80;

  // clock_seq_low (1 byte)
  bytes[9] = clockSeq & 0xFF;

  // node (6 bytes)
  node.copy(bytes, 10, 0, 6);

  return formatUUID(bytes);
}

/**
 * Generate a version 4 (random) UUID
 *
 * Per RFC 4122 Section 4.4:
 * - All bits are randomly or pseudo-randomly generated
 * - Version 4 in bits 48-51
 * - Variant 10 in bits 64-65
 */
export function v4(): string {
  const bytes = crypto.randomBytes(16);

  // Set version 4 in bits 48-51 (byte 6, high nibble)
  bytes[6] = (bytes[6] & 0x0F) | 0x40;

  // Set variant 10 in bits 64-65 (byte 8, high 2 bits)
  bytes[8] = (bytes[8] & 0x3F) | 0x80;

  return formatUUID(bytes);
}

/**
 * Generate a version 5 (name-based, SHA-1) UUID
 *
 * Per RFC 4122 Section 4.3:
 * - Hash namespace UUID + name with SHA-1
 * - Take first 16 bytes
 * - Set version and variant bits
 */
export function v5(options: UUIDv5Options): string {
  const { namespace, name } = options;

  // Parse namespace UUID to bytes
  const namespaceBytes = typeof namespace === 'string'
    ? parseUUID(namespace)
    : namespace;

  if (namespaceBytes.length !== 16) {
    throw new Error('Invalid namespace UUID');
  }

  // Hash namespace + name with SHA-1
  const hash = crypto.createHash('sha1');
  hash.update(namespaceBytes);
  hash.update(name, 'utf8');
  const bytes = hash.digest().subarray(0, 16);

  // Set version 5 in bits 48-51 (byte 6, high nibble)
  bytes[6] = (bytes[6] & 0x0F) | 0x50;

  // Set variant 10 in bits 64-65 (byte 8, high 2 bits)
  bytes[8] = (bytes[8] & 0x3F) | 0x80;

  return formatUUID(bytes);
}

// ============================================================================
// Validation
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate a UUID string
 */
export function validate(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

/**
 * Get the version of a UUID
 */
export function version(uuid: string): UUIDVersion | null {
  if (!validate(uuid)) return null;
  const v = parseInt(uuid.charAt(14), 16);
  return (v >= 1 && v <= 5) ? v as UUIDVersion : null;
}

/**
 * Check if UUID is NIL (all zeros)
 */
export function isNil(uuid: string): boolean {
  return uuid === NIL_UUID;
}

// ============================================================================
// Parsing and Formatting
// ============================================================================

/**
 * Parse a UUID string to bytes
 */
export function parseUUID(uuid: string): Buffer {
  if (!validate(uuid) && uuid !== NIL_UUID) {
    throw new Error(`Invalid UUID: ${uuid}`);
  }

  const hex = uuid.replace(/-/g, '');
  return Buffer.from(hex, 'hex');
}

/**
 * Format bytes as UUID string
 */
export function formatUUID(bytes: Buffer): string {
  const hex = bytes.toString('hex');
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join('-');
}

/**
 * Parse UUID into its components
 */
export function parse(uuid: string): UUIDComponents {
  const bytes = parseUUID(uuid);

  return {
    timeLow: bytes.readUInt32BE(0),
    timeMid: bytes.readUInt16BE(4),
    timeHiAndVersion: bytes.readUInt16BE(6),
    clockSeqHiAndReserved: bytes[8],
    clockSeqLow: bytes[9],
    node: bytes.subarray(10, 16),
  };
}

/**
 * Extract timestamp from v1 UUID (returns Date)
 */
export function extractTimestamp(uuid: string): Date | null {
  if (version(uuid) !== 1) return null;

  const components = parse(uuid);

  // Reconstruct 60-bit timestamp
  const timeLow = BigInt(components.timeLow);
  const timeMid = BigInt(components.timeMid) << BigInt(32);
  const timeHi = BigInt(components.timeHiAndVersion & 0x0FFF) << BigInt(48);

  const timestamp = timeLow | timeMid | timeHi;

  // Convert from Gregorian epoch to Unix epoch
  const unixNanos = (timestamp - GREGORIAN_OFFSET) / BigInt(10000);

  return new Date(Number(unixNanos));
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get or generate node ID (6 bytes)
 * Per RFC 4122 Section 4.5: If no MAC address, generate random with multicast bit set
 */
function getNodeId(): Buffer {
  if (!nodeId) {
    nodeId = crypto.randomBytes(6);
    // Set multicast bit (bit 0 of first byte) to indicate random node
    nodeId[0] |= 0x01;
  }
  return nodeId;
}

/**
 * Generate a new random node ID (useful for privacy)
 */
export function regenerateNodeId(): void {
  nodeId = null;
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Generate UUID (default: v4)
 */
export function generate(ver: UUIDVersion = 4, options?: UUIDv1Options | UUIDv5Options): string {
  switch (ver) {
    case 1:
      return v1(options as UUIDv1Options);
    case 4:
      return v4();
    case 5:
      if (!options || !('namespace' in options)) {
        throw new Error('v5 UUID requires namespace and name');
      }
      return v5(options as UUIDv5Options);
    default:
      throw new Error(`Unsupported UUID version: ${ver}`);
  }
}

// Default export
export default {
  v1,
  v4,
  v5,
  generate,
  validate,
  version,
  isNil,
  parse,
  parseUUID,
  formatUUID,
  extractTimestamp,
  regenerateNodeId,
  NAMESPACE_DNS,
  NAMESPACE_URL,
  NAMESPACE_OID,
  NAMESPACE_X500,
  NIL_UUID,
};
