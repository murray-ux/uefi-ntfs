// config/config_loader.ts
//
// GENESIS Configuration Loader — reads genesis_infrastructure.yml
// and substitutes environment variables for any sensitive values.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { readFileSync, existsSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Types — matches genesis_infrastructure.yml structure
// ---------------------------------------------------------------------------

export interface GenesisConfig {
  version: string;
  effective_date: string;
  timezone: string;
  owner: {
    name: string;
    alias: string;
    primary_email: string;
    location: { city: string; state: string; postcode: string; country: string };
  };
  organisation: {
    legal_name: string;
    trading_name: string;
    domain_primary: string;
    domain_secondary: string;
    identifiers: Record<string, string>;
  };
  identity_providers: Record<string, Record<string, unknown>>;
  hardware: {
    primary_workstation: { model: string; os: string; hostname: string };
  };
  security_policies: {
    hardening_standard: string;
    zero_trust: boolean;
    mfa_enforcement: string;
    encryption_at_rest: string;
    encryption_in_transit: string;
  };
}

// ---------------------------------------------------------------------------
// YAML-lite parser — handles the flat YAML we use, no external dep.
// For complex YAML, swap in js-yaml.
// ---------------------------------------------------------------------------

function parseSimpleYaml(text: string): Record<string, unknown> {
  // This is a minimal placeholder. In production, install js-yaml.
  // For now, return the raw text as a config-shaped object.
  const result: Record<string, unknown> = { _raw: text };
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*(\w+):\s*"?([^"#]*)"?\s*$/);
    if (match) {
      result[match[1]] = match[2].trim();
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Environment variable substitution
// ---------------------------------------------------------------------------

function substituteEnvVars(obj: unknown): unknown {
  if (typeof obj === "string") {
    return obj.replace(/\$\{(\w+)\}/g, (_, name) => process.env[name] || `\${${name}}`);
  }
  if (Array.isArray(obj)) {
    return obj.map(substituteEnvVars);
  }
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = substituteEnvVars(v);
    }
    return result;
  }
  return obj;
}

// ---------------------------------------------------------------------------
// ConfigLoader
// ---------------------------------------------------------------------------

export class ConfigLoader {
  private static instance: Record<string, unknown> | null = null;

  static load(configPath?: string): Record<string, unknown> {
    if (this.instance) return this.instance;

    const defaultPath = join(process.cwd(), "config", "genesis_infrastructure.yml");
    const filePath = configPath || defaultPath;

    if (!existsSync(filePath)) {
      throw new Error(`Config file not found: ${filePath}`);
    }

    const raw = readFileSync(filePath, "utf-8");
    const parsed = parseSimpleYaml(raw);
    this.instance = substituteEnvVars(parsed) as Record<string, unknown>;
    return this.instance;
  }

  static get(): Record<string, unknown> {
    if (!this.instance) return this.load();
    return this.instance;
  }

  static reset(): void {
    this.instance = null;
  }
}
