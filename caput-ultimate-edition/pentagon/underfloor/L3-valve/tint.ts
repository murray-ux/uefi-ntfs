// L3-valve/tint.ts
//
// ROOM: TINT — Data masking and visibility control
//
// Controls what data is visible at each layer. Like window tint:
// people inside see out, people outside see a dark surface.
//
// Three tint levels:
//   CLEAR       — Full visibility (internal/admin)
//   FROSTED     — Partial masking (truncated hashes, redacted fields)
//   BLACKOUT    — Full masking (existence acknowledged, content hidden)
//
// Lives in L3 because visibility is a policy concern.

import { Kernel } from "../layer0-kernel";

export type TintLevel = "clear" | "frosted" | "blackout";

export interface TintPolicy {
  field: string;
  level: TintLevel;
  frostedLength?: number;      // chars to show when frosted (default 4)
  reason?: string;
}

export interface TintedOutput {
  data: Record<string, unknown>;
  level: TintLevel;
  maskedFields: string[];
  visibleFields: string[];
}

export class Tint {
  private readonly kernel: Kernel;
  private readonly policies = new Map<string, TintPolicy>();
  private defaultLevel: TintLevel = "frosted";
  private totalMasked = 0;

  constructor(kernel: Kernel) {
    this.kernel = kernel;

    // Default policies for common sensitive fields
    this.setPolicy("password", "blackout");
    this.setPolicy("secret", "blackout");
    this.setPolicy("privateKey", "blackout");
    this.setPolicy("apiKey", "blackout");
    this.setPolicy("token", "frosted", 8);
    this.setPolicy("email", "frosted", 4);
    this.setPolicy("phone", "frosted", 4);
    this.setPolicy("ssn", "blackout");
    this.setPolicy("tfn", "blackout");
    this.setPolicy("creditCard", "frosted", 4);
    this.setPolicy("hash", "frosted", 12);
    this.setPolicy("signature", "frosted", 16);
    this.setPolicy("key", "frosted", 8);
    this.setPolicy("material", "blackout");
  }

  // ── Policy management ──────────────────────────────────────────────────

  setPolicy(field: string, level: TintLevel, frostedLength?: number, reason?: string): void {
    this.policies.set(field.toLowerCase(), { field, level, frostedLength, reason });
  }

  removePolicy(field: string): boolean {
    return this.policies.delete(field.toLowerCase());
  }

  setDefault(level: TintLevel): void {
    this.defaultLevel = level;
  }

  // ── Apply tint ─────────────────────────────────────────────────────────

  apply(data: Record<string, unknown>, overrideLevel?: TintLevel): TintedOutput {
    const level = overrideLevel ?? this.defaultLevel;
    const maskedFields: string[] = [];
    const visibleFields: string[] = [];
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const policy = this.findPolicy(key);
      const effectiveLevel = policy?.level ?? level;

      if (effectiveLevel === "clear") {
        result[key] = value;
        visibleFields.push(key);
      } else if (effectiveLevel === "blackout") {
        result[key] = "[REDACTED]";
        maskedFields.push(key);
        this.totalMasked++;
      } else {
        // Frosted
        result[key] = this.frost(value, policy?.frostedLength ?? 4);
        maskedFields.push(key);
        this.totalMasked++;
      }
    }

    return { data: result, level, maskedFields, visibleFields };
  }

  // ── Frost a single value ───────────────────────────────────────────────

  private frost(value: unknown, showChars: number): string {
    if (value === null || value === undefined) return "[EMPTY]";

    const str = typeof value === "string" ? value
      : Buffer.isBuffer(value) ? value.toString("hex")
      : JSON.stringify(value);

    if (str.length <= showChars) return "***";
    return str.slice(0, showChars) + "..." + `[${str.length} chars]`;
  }

  // ── Find matching policy ───────────────────────────────────────────────

  private findPolicy(fieldName: string): TintPolicy | null {
    const lower = fieldName.toLowerCase();

    // Exact match
    if (this.policies.has(lower)) return this.policies.get(lower)!;

    // Substring match (e.g., "userPassword" matches "password" policy)
    for (const [pattern, policy] of this.policies) {
      if (lower.includes(pattern)) return policy;
    }

    return null;
  }

  // ── Deep tint — recursive through nested objects ───────────────────────

  deepApply(data: Record<string, unknown>, overrideLevel?: TintLevel): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "object" && value !== null && !Buffer.isBuffer(value) && !Array.isArray(value)) {
        result[key] = this.deepApply(value as Record<string, unknown>, overrideLevel);
      } else {
        const policy = this.findPolicy(key);
        const level = policy?.level ?? overrideLevel ?? this.defaultLevel;

        if (level === "clear") {
          result[key] = value;
        } else if (level === "blackout") {
          result[key] = "[REDACTED]";
          this.totalMasked++;
        } else {
          result[key] = this.frost(value, policy?.frostedLength ?? 4);
          this.totalMasked++;
        }
      }
    }

    return result;
  }

  stats(): { policies: number; defaultLevel: TintLevel; totalMasked: number } {
    return { policies: this.policies.size, defaultLevel: this.defaultLevel, totalMasked: this.totalMasked };
  }
}
