/**
 * WorkflowGuardian - Self-Adaptive CI/CD Security Engine
 *
 * Combines insights from:
 * - GH-WCOM (Mastropaolo et al.) - Token abstraction for risk detection
 * - SEAByTE (Quin & Weyns) - MAPE-K feedback loop for adaptive enforcement
 *
 * But faster, tighter, and actually useful.
 */

import * as yaml from 'yaml';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
export type Verdict = 'BLOCK' | 'WARN' | 'ALLOW';

export interface RiskToken {
  type: 'URL' | 'PATH' | 'FILE' | 'VERSION' | 'ACTION_REF' | 'SCRIPT' | 'SECRET';
  value: string;
  location: { line: number; key: string };
  risk: RiskLevel;
  reason: string;
}

export interface ScanResult {
  workflow: string;
  tokens: RiskToken[];
  riskScore: number;
  confidence: number;
  verdict: Verdict;
  details: Finding[];
}

export interface Finding {
  rule: string;
  level: RiskLevel;
  message: string;
  location: string;
  fix?: string;
}

export interface MAPEKState {
  monitored: Map<string, ScanResult[]>;
  analyzed: { riskTrend: number; anomalies: string[] };
  planned: { action: Verdict; reason: string };
  executed: { blocked: number; warned: number; allowed: number };
}

// ═══════════════════════════════════════════════════════════════════════════
// RISK PATTERNS (Inverted GH-WCOM Abstraction)
// ═══════════════════════════════════════════════════════════════════════════

const RISK_PATTERNS = {
  // Critical: Immediate block
  CURL_PIPE_BASH: /curl\s+.*\|\s*(bash|sh|zsh)/i,
  WGET_PIPE_BASH: /wget\s+.*\|\s*(bash|sh|zsh)/i,
  PULL_REQUEST_TARGET: /pull_request_target/,
  SECRETS_IN_PR: /\$\{\{\s*secrets\./,
  UNPINNED_MAIN: /@(main|master|HEAD)\s*$/,

  // High: Require review
  UNPINNED_VERSION: /@v\d+\s*$/,  // @v2 instead of @v2.1.0 or SHA
  EXTERNAL_ACTION: /uses:\s*[^\/]+\/[^@]+@/,
  ARBITRARY_SCRIPT: /run:\s*\|/,
  SUDO_USAGE: /sudo\s+/,

  // Medium: Flag for awareness
  HTTP_URL: /http:\/\//,
  HARDCODED_CREDS: /(password|token|key|secret)\s*[:=]\s*['"][^$]/i,
  WIDE_PERMISSIONS: /permissions:\s*write-all/,

  // Extractors (neutral - for abstraction)
  URL: /https?:\/\/[^\s"']+/g,
  PATH: /(?:\.\/|\/)[a-zA-Z0-9_\-\/]+(?:\.[a-zA-Z]+)?/g,
  ACTION_REF: /uses:\s*([^@\s]+@[^\s]+)/g,
  VERSION: /@(v?\d+(?:\.\d+)*(?:-[a-zA-Z0-9]+)?|[a-f0-9]{40})/g,
} as const;

const RISK_WEIGHTS: Record<RiskLevel, number> = {
  CRITICAL: 100,
  HIGH: 40,
  MEDIUM: 15,
  LOW: 5,
  NONE: 0,
};

// ═══════════════════════════════════════════════════════════════════════════
// CORE ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export class WorkflowGuardian {
  private state: MAPEKState = {
    monitored: new Map(),
    analyzed: { riskTrend: 0, anomalies: [] },
    planned: { action: 'ALLOW', reason: '' },
    executed: { blocked: 0, warned: 0, allowed: 0 },
  };

  private confidenceThreshold = 0.75;
  private blockThreshold = 80;
  private warnThreshold = 30;

  constructor(options?: {
    confidenceThreshold?: number;
    blockThreshold?: number;
    warnThreshold?: number;
  }) {
    if (options?.confidenceThreshold) this.confidenceThreshold = options.confidenceThreshold;
    if (options?.blockThreshold) this.blockThreshold = options.blockThreshold;
    if (options?.warnThreshold) this.warnThreshold = options.warnThreshold;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MONITOR: Collect and parse workflow
  // ─────────────────────────────────────────────────────────────────────────

  monitor(workflowContent: string, filename: string = 'workflow.yml'): RiskToken[] {
    const tokens: RiskToken[] = [];
    const lines = workflowContent.split('\n');

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;

      // Critical patterns
      if (RISK_PATTERNS.CURL_PIPE_BASH.test(line)) {
        tokens.push(this.createToken('SCRIPT', line.trim(), lineNum, 'run', 'CRITICAL',
          'Remote code execution: curl piped to shell'));
      }
      if (RISK_PATTERNS.WGET_PIPE_BASH.test(line)) {
        tokens.push(this.createToken('SCRIPT', line.trim(), lineNum, 'run', 'CRITICAL',
          'Remote code execution: wget piped to shell'));
      }
      if (RISK_PATTERNS.PULL_REQUEST_TARGET.test(line)) {
        tokens.push(this.createToken('ACTION_REF', 'pull_request_target', lineNum, 'on', 'CRITICAL',
          'pull_request_target exposes secrets to PR code'));
      }
      if (RISK_PATTERNS.SECRETS_IN_PR.test(line) && this.isInPRContext(workflowContent)) {
        tokens.push(this.createToken('SECRET', line.trim(), lineNum, 'env/with', 'CRITICAL',
          'Secrets exposed in pull_request context'));
      }

      // High patterns
      const actionMatch = line.match(/uses:\s*([^@\s]+)@(main|master|HEAD)\s*$/);
      if (actionMatch) {
        tokens.push(this.createToken('ACTION_REF', actionMatch[0], lineNum, 'uses', 'CRITICAL',
          `Unpinned action ref: ${actionMatch[1]}@${actionMatch[2]} - use SHA`));
      }

      // Detect floating version tags like @v2 (not @v2.1.0 or SHA)
      const versionMatch = line.match(/uses:\s*([^@\s]+)@(v\d+)\s*$/);
      if (versionMatch) {
        // This pattern catches @v2, @v3 etc. without full semver or SHA
        tokens.push(this.createToken('VERSION', versionMatch[0], lineNum, 'uses', 'HIGH',
          `Floating version tag: ${versionMatch[2]} - pin to specific version (e.g., v2.1.0) or SHA`));
      }

      if (RISK_PATTERNS.SUDO_USAGE.test(line)) {
        tokens.push(this.createToken('SCRIPT', line.trim(), lineNum, 'run', 'HIGH',
          'Elevated privileges: sudo usage detected'));
      }

      // Medium patterns
      if (RISK_PATTERNS.HTTP_URL.test(line)) {
        tokens.push(this.createToken('URL', line.match(RISK_PATTERNS.HTTP_URL)?.[0] || '', lineNum, 'run', 'MEDIUM',
          'Insecure HTTP URL - use HTTPS'));
      }
      if (RISK_PATTERNS.HARDCODED_CREDS.test(line)) {
        tokens.push(this.createToken('SECRET', '[REDACTED]', lineNum, 'env', 'CRITICAL',
          'Potential hardcoded credential detected'));
      }
      if (RISK_PATTERNS.WIDE_PERMISSIONS.test(line)) {
        tokens.push(this.createToken('ACTION_REF', 'write-all', lineNum, 'permissions', 'HIGH',
          'Overly permissive: write-all grants excessive access'));
      }
    });

    // Store in MAPE-K state
    const existing = this.state.monitored.get(filename) || [];
    this.state.monitored.set(filename, [...existing, {
      workflow: filename,
      tokens,
      riskScore: 0,
      confidence: 0,
      verdict: 'ALLOW',
      details: []
    }]);

    return tokens;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ANALYZE: Score and assess confidence
  // ─────────────────────────────────────────────────────────────────────────

  analyze(tokens: RiskToken[]): { riskScore: number; confidence: number; findings: Finding[] } {
    const findings: Finding[] = tokens.map(t => ({
      rule: t.type,
      level: t.risk,
      message: t.reason,
      location: `line ${t.location.line}`,
      fix: this.suggestFix(t),
    }));

    // Calculate risk score (0-100)
    const rawScore = tokens.reduce((sum, t) => sum + RISK_WEIGHTS[t.risk], 0);
    const riskScore = Math.min(100, rawScore);

    // Calculate confidence based on pattern clarity
    // High confidence = clear patterns found
    // Low confidence = ambiguous or context-dependent
    const criticalCount = tokens.filter(t => t.risk === 'CRITICAL').length;
    const highCount = tokens.filter(t => t.risk === 'HIGH').length;
    const totalPatterns = tokens.length;

    // Confidence formula: more severe findings = higher confidence in verdict
    const confidence = totalPatterns === 0
      ? 0.95  // No findings = high confidence it's safe
      : Math.min(0.99, 0.5 + (criticalCount * 0.15) + (highCount * 0.08) + (totalPatterns * 0.02));

    // Update MAPE-K state
    this.state.analyzed = {
      riskTrend: riskScore,
      anomalies: tokens.filter(t => t.risk === 'CRITICAL').map(t => t.reason),
    };

    return { riskScore, confidence, findings };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PLAN: Decide enforcement action
  // ─────────────────────────────────────────────────────────────────────────

  plan(riskScore: number, confidence: number): { verdict: Verdict; reason: string } {
    // SEAByTE-inspired: confidence gates the decision
    if (confidence < this.confidenceThreshold) {
      return {
        verdict: 'WARN',
        reason: `Low confidence (${(confidence * 100).toFixed(1)}%) - manual review required`
      };
    }

    if (riskScore >= this.blockThreshold) {
      this.state.planned = { action: 'BLOCK', reason: `Risk score ${riskScore} exceeds threshold ${this.blockThreshold}` };
      return this.state.planned;
    }

    if (riskScore >= this.warnThreshold) {
      this.state.planned = { action: 'WARN', reason: `Risk score ${riskScore} exceeds warning threshold ${this.warnThreshold}` };
      return this.state.planned;
    }

    this.state.planned = { action: 'ALLOW', reason: `Risk score ${riskScore} within acceptable range` };
    return this.state.planned;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXECUTE: Produce final result
  // ─────────────────────────────────────────────────────────────────────────

  execute(workflow: string, content: string): ScanResult {
    const tokens = this.monitor(content, workflow);
    const { riskScore, confidence, findings } = this.analyze(tokens);
    const { verdict, reason } = this.plan(riskScore, confidence);

    // Update execution stats
    this.state.executed[verdict.toLowerCase() as 'blocked' | 'warned' | 'allowed']++;

    return {
      workflow,
      tokens,
      riskScore,
      confidence,
      verdict,
      details: findings,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // KNOWLEDGE: Query state and history
  // ─────────────────────────────────────────────────────────────────────────

  getState(): MAPEKState {
    return { ...this.state };
  }

  getStats(): { blocked: number; warned: number; allowed: number; riskTrend: number } {
    return {
      ...this.state.executed,
      riskTrend: this.state.analyzed.riskTrend,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private createToken(
    type: RiskToken['type'],
    value: string,
    line: number,
    key: string,
    risk: RiskLevel,
    reason: string
  ): RiskToken {
    return { type, value, location: { line, key }, risk, reason };
  }

  private isInPRContext(content: string): boolean {
    // Check for any trigger that runs in PR context
    // pull_request, pull_request_target, and workflow_run (when triggered by PRs)
    return /on:\s*\n?\s*(pull_request|pull_request_target|workflow_run)/.test(content) ||
           /pull_request/.test(content);
  }

  private suggestFix(token: RiskToken): string | undefined {
    switch (token.type) {
      case 'ACTION_REF':
        if (token.reason.includes('Unpinned')) {
          return 'Pin to full SHA: uses: owner/repo@<40-char-sha>';
        }
        if (token.reason.includes('Floating')) {
          return 'Pin to exact version: uses: owner/repo@v1.2.3 or SHA';
        }
        break;
      case 'SCRIPT':
        if (token.reason.includes('curl') || token.reason.includes('wget')) {
          return 'Download file first, verify checksum, then execute';
        }
        break;
      case 'URL':
        if (token.reason.includes('HTTP')) {
          return 'Replace http:// with https://';
        }
        break;
    }
    return undefined;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

export function formatResult(result: ScanResult): string {
  const icon = { BLOCK: '🚫', WARN: '⚠️', ALLOW: '✅' }[result.verdict];
  const lines = [
    `${icon} ${result.workflow}`,
    `   Verdict: ${result.verdict} (score: ${result.riskScore}, confidence: ${(result.confidence * 100).toFixed(1)}%)`,
  ];

  if (result.details.length > 0) {
    lines.push('   Findings:');
    result.details.forEach(f => {
      const levelIcon = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🔵', NONE: '⚪' }[f.level];
      lines.push(`   ${levelIcon} [${f.level}] ${f.message} (${f.location})`);
      if (f.fix) lines.push(`      Fix: ${f.fix}`);
    });
  }

  return lines.join('\n');
}

// Default export for easy import
export default WorkflowGuardian;
