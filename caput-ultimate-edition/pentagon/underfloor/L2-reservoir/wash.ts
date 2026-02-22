// L2-reservoir/wash.ts
//
// ROOM: WASH — Data sanitisation and scrubbing
//
// Cleans data before storage or output. Strips PII, redacts secrets,
// normalises encoding, validates structure. Nothing enters or leaves
// the Reservoir without passing through the Wash.
//
// Lives in L2 because sanitisation guards the data store.

import { Kernel } from "../layer0-kernel";

export type WashRule = {
  id: string;
  name: string;
  pattern: RegExp;
  replacement: string;
  category: "pii" | "secret" | "encoding" | "structure" | "custom";
};

export interface WashResult {
  original: string;
  cleaned: string;
  rulesApplied: string[];
  redactions: number;
  safe: boolean;
}

export class Wash {
  private readonly kernel: Kernel;
  private readonly rules: WashRule[] = [];
  private totalWashes = 0;
  private totalRedactions = 0;

  constructor(kernel: Kernel) {
    this.kernel = kernel;
    this.loadDefaultRules();
  }

  private loadDefaultRules(): void {
    // PII patterns
    this.addRule("email", /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL-REDACTED]", "pii");
    this.addRule("phone-au", /(?:\+61|0)[2-478][\s.-]?\d{4}[\s.-]?\d{4}/g, "[PHONE-REDACTED]", "pii");
    this.addRule("phone-intl", /\+\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{3,4}[\s.-]?\d{0,4}/g, "[PHONE-REDACTED]", "pii");
    this.addRule("tfn", /\b\d{3}\s?\d{3}\s?\d{3}\b/g, "[TFN-REDACTED]", "pii");
    this.addRule("abn", /\b\d{2}\s?\d{3}\s?\d{3}\s?\d{3}\b/g, "[ABN-REDACTED]", "pii");
    this.addRule("credit-card", /\b\d{4}[\s.-]?\d{4}[\s.-]?\d{4}[\s.-]?\d{4}\b/g, "[CC-REDACTED]", "pii");
    this.addRule("ip-address", /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "[IP-REDACTED]", "pii");
    this.addRule("medicare", /\b\d{4}\s?\d{5}\s?\d{1}\b/g, "[MEDICARE-REDACTED]", "pii");

    // Secret patterns
    this.addRule("jwt", /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, "[JWT-REDACTED]", "secret");
    this.addRule("api-key", /(?:api[_-]?key|apikey|secret[_-]?key)[\s]*[=:]\s*["']?[A-Za-z0-9_-]{16,}["']?/gi, "[APIKEY-REDACTED]", "secret");
    this.addRule("private-key", /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g, "[PRIVATEKEY-REDACTED]", "secret");
    this.addRule("password-field", /(?:password|passwd|pwd)[\s]*[=:]\s*["']?[^\s"',]{4,}["']?/gi, "[PASSWORD-REDACTED]", "secret");
    this.addRule("bearer-token", /Bearer\s+[A-Za-z0-9_.-]{10,}/g, "[BEARER-REDACTED]", "secret");

    // Encoding normalisation
    this.addRule("null-bytes", /\0/g, "", "encoding");
    this.addRule("control-chars", /[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "", "encoding");
  }

  // ── Rule management ────────────────────────────────────────────────────

  addRule(name: string, pattern: RegExp, replacement: string, category: WashRule["category"]): void {
    this.rules.push({
      id: this.kernel.deriveId("wash-rule", name),
      name,
      pattern,
      replacement,
      category,
    });
  }

  removeRule(name: string): boolean {
    const idx = this.rules.findIndex((r) => r.name === name);
    if (idx === -1) return false;
    this.rules.splice(idx, 1);
    return true;
  }

  // ── Wash ───────────────────────────────────────────────────────────────

  scrub(input: string, categories?: WashRule["category"][]): WashResult {
    let cleaned = input;
    const applied: string[] = [];
    let redactions = 0;

    const activeRules = categories
      ? this.rules.filter((r) => categories.includes(r.category))
      : this.rules;

    for (const rule of activeRules) {
      // Reset lastIndex for global regexes
      rule.pattern.lastIndex = 0;
      const matches = cleaned.match(rule.pattern);
      if (matches && matches.length > 0) {
        cleaned = cleaned.replace(rule.pattern, rule.replacement);
        applied.push(rule.name);
        redactions += matches.length;
      }
    }

    this.totalWashes++;
    this.totalRedactions += redactions;

    return {
      original: input,
      cleaned,
      rulesApplied: applied,
      redactions,
      safe: redactions === 0,
    };
  }

  // ── Scan only (don't modify) ───────────────────────────────────────────

  scan(input: string): { findings: Array<{ rule: string; category: string; count: number }>; clean: boolean } {
    const findings: Array<{ rule: string; category: string; count: number }> = [];
    for (const rule of this.rules) {
      rule.pattern.lastIndex = 0;
      const matches = input.match(rule.pattern);
      if (matches && matches.length > 0) {
        findings.push({ rule: rule.name, category: rule.category, count: matches.length });
      }
    }
    return { findings, clean: findings.length === 0 };
  }

  // ── Bulk scrub ─────────────────────────────────────────────────────────

  scrubObject(obj: Record<string, unknown>, categories?: WashRule["category"][]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        result[key] = this.scrub(value, categories).cleaned;
      } else if (typeof value === "object" && value !== null && !Buffer.isBuffer(value)) {
        result[key] = Array.isArray(value)
          ? value.map((v) => typeof v === "string" ? this.scrub(v, categories).cleaned : v)
          : this.scrubObject(value as Record<string, unknown>, categories);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  stats(): { totalWashes: number; totalRedactions: number; ruleCount: number; byCategory: Record<string, number> } {
    const byCategory: Record<string, number> = {};
    for (const r of this.rules) byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    return { totalWashes: this.totalWashes, totalRedactions: this.totalRedactions, ruleCount: this.rules.length, byCategory };
  }
}
