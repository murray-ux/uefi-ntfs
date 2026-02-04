// src/guardrails/local-sanity-checks.ts
// Pre-flight sanity checks — fail-closed before any destructive op.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

export interface SanityContext {
  action: string;
  targetPath?: string;
  actorId: string;
  isDryRun: boolean;
}

export interface SanityResult {
  safe: boolean;
  violations: string[];
}

const DESTRUCTIVE_PATTERNS = [
  /rm\s+-rf\s+\//,
  /mkfs\./,
  /dd\s+if=.*of=\/dev\//,
  /format\s+[A-Z]:/i,
  /DROP\s+DATABASE/i,
  /TRUNCATE\s+TABLE/i,
];

const FORBIDDEN_TARGETS = [
  "/", "/boot", "/etc", "/usr", "/sys", "/proc",
  "/dev", "/var/run", "/tmp/.X11-unix",
];

export function assertSafe(ctx: SanityContext): SanityResult {
  const violations: string[] = [];

  // Check destructive command patterns
  for (const pat of DESTRUCTIVE_PATTERNS) {
    if (pat.test(ctx.action)) {
      violations.push(`Destructive pattern matched: ${pat.source}`);
    }
  }

  // Check forbidden target paths
  if (ctx.targetPath) {
    const norm = ctx.targetPath.replace(/\/+$/, "") || "/";
    if (FORBIDDEN_TARGETS.includes(norm)) {
      violations.push(`Forbidden target path: ${norm}`);
    }
  }

  // Dry-run never executes
  if (ctx.isDryRun && violations.length === 0) {
    return { safe: false, violations: ["Dry-run mode: no execution permitted"] };
  }

  return { safe: violations.length === 0, violations };
}
