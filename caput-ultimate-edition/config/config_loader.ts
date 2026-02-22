// config/config_loader.ts
//
// GENESIS Configuration Loader — reads genesis_infrastructure.yml
// and substitutes environment variables for sensitive values.
//
// Includes a zero-dependency YAML parser that handles:
//   - Nested objects (indentation-based)
//   - Arrays (- prefix)
//   - Quoted and unquoted string values
//   - Inline comments (#)
//   - Boolean, number, and null coercion
//   - Multi-level nesting
//
// For full YAML spec (anchors, flow syntax, etc.), swap in js-yaml.
// This parser covers the subset GENESIS actually uses.
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
// YAML parser — indentation-based, recursive
// ---------------------------------------------------------------------------

type YamlValue = string | number | boolean | null | YamlValue[] | { [key: string]: YamlValue };

function parseYaml(text: string): Record<string, YamlValue> {
  const lines = text.split("\n");
  const { value } = parseBlock(lines, 0, 0);
  return (value as Record<string, YamlValue>) || {};
}

function parseBlock(
  lines: string[],
  start: number,
  minIndent: number,
): { value: YamlValue; nextLine: number } {
  const result: Record<string, YamlValue> = {};
  let i = start;

  while (i < lines.length) {
    const raw = lines[i];
    const stripped = stripComment(raw);

    // Skip blank and comment-only lines
    if (stripped.trim() === "") { i++; continue; }

    const indent = leadingSpaces(raw);

    // If dedented below our block, we're done
    if (indent < minIndent) break;

    // Array item (- prefix)
    const arrayMatch = stripped.match(/^(\s*)-\s+(.*)/);
    if (arrayMatch) {
      return parseArray(lines, i, indent);
    }

    // Key: value pair
    const kvMatch = stripped.match(/^(\s*)([\w._-]+)\s*:\s*(.*)/);
    if (!kvMatch) { i++; continue; }

    const key = kvMatch[2];
    const inlineValue = kvMatch[3].trim();

    if (inlineValue === "" || inlineValue === "|" || inlineValue === ">") {
      // Nested block — parse children at deeper indent
      const childIndent = findChildIndent(lines, i + 1);
      if (childIndent > indent) {
        const child = parseBlock(lines, i + 1, childIndent);
        result[key] = child.value;
        i = child.nextLine;
      } else {
        result[key] = inlineValue === "" ? null : "";
        i++;
      }
    } else {
      result[key] = coerce(inlineValue);
      i++;
    }
  }

  return { value: result, nextLine: i };
}

function parseArray(
  lines: string[],
  start: number,
  arrayIndent: number,
): { value: YamlValue; nextLine: number } {
  const items: YamlValue[] = [];
  let i = start;

  while (i < lines.length) {
    const raw = lines[i];
    const stripped = stripComment(raw);
    if (stripped.trim() === "") { i++; continue; }

    const indent = leadingSpaces(raw);
    if (indent < arrayIndent) break;

    const arrayMatch = stripped.match(/^(\s*)-\s+(.*)/);
    if (!arrayMatch) break;

    const itemValue = arrayMatch[2].trim();

    // Check if item is a key:value (nested object in array)
    const kvInItem = itemValue.match(/^([\w._-]+)\s*:\s*(.*)/);
    if (kvInItem) {
      // Start of an inline object
      const obj: Record<string, YamlValue> = {};
      obj[kvInItem[1]] = coerce(kvInItem[2].trim());

      // Check for continuation lines at deeper indent
      const childIndent = arrayIndent + 2;
      i++;
      while (i < lines.length) {
        const cRaw = lines[i];
        const cStripped = stripComment(cRaw);
        if (cStripped.trim() === "") { i++; continue; }
        const cIndent = leadingSpaces(cRaw);
        if (cIndent < childIndent) break;
        const cKv = cStripped.match(/^\s*([\w._-]+)\s*:\s*(.*)/);
        if (cKv) {
          obj[cKv[1]] = coerce(cKv[2].trim());
          i++;
        } else {
          break;
        }
      }
      items.push(obj);
    } else {
      items.push(coerce(itemValue));
      i++;
    }
  }

  return { value: items, nextLine: i };
}

function findChildIndent(lines: string[], from: number): number {
  for (let i = from; i < lines.length; i++) {
    const stripped = stripComment(lines[i]);
    if (stripped.trim() !== "") return leadingSpaces(lines[i]);
  }
  return 0;
}

function leadingSpaces(line: string): number {
  const match = line.match(/^( *)/);
  return match ? match[1].length : 0;
}

function stripComment(line: string): string {
  // Don't strip # inside quotes
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    if (ch === "#" && !inSingle && !inDouble) {
      return line.slice(0, i);
    }
  }
  return line;
}

function coerce(s: string): YamlValue {
  if (s === "" || s === "null" || s === "~") return null;
  if (s === "true") return true;
  if (s === "false") return false;

  // Strip quotes
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }

  // Number
  if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);

  return s;
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
    const parsed = parseYaml(raw);
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

// Re-export YAML parser for testing or direct use
export { parseYaml };
