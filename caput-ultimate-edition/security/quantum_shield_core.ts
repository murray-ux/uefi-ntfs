// security/quantum_shield_core.ts
//
// Quantum Shield — device health monitoring and hardening verification.
//
// Performs real OS-level checks: disk usage, memory, CPU load, uptime,
// hostname, platform. Reports drift against a baseline. Wired into
// the Evaluator for RBAC decisions.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { hostname, platform, totalmem, freemem, cpus, uptime } from "os";
import { join } from "path";
import { Evaluator, EvaluationInput } from "../src/core/evaluator";
import { AuditService } from "../src/audit/audit-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeviceHealth {
  hostname: string;
  platform: string;
  diskUsagePercent: number;
  diskOk: boolean;
  memoryUsagePercent: number;
  memoryOk: boolean;
  cpuCount: number;
  loadAvg1m: number;
  cpuOk: boolean;
  uptimeHours: number;
  secureBootEnabled: boolean;
  firewallActive: boolean;
  lastChecked: string;
  overallHealthy: boolean;
}

export interface HardeningCheck {
  id: string;
  name: string;
  passed: boolean;
  detail: string;
}

export interface HardeningResult {
  hostname: string;
  checks: HardeningCheck[];
  controlsApplied: number;
  controlsFailed: number;
  driftDetected: boolean;
}

export interface QuantumShieldConfig {
  dataDir: string;
  evaluator: Evaluator;
  audit: AuditService;
  thresholds: {
    maxDiskUsagePercent: number;   // default 90
    maxMemoryUsagePercent: number; // default 85
    maxLoadPerCpu: number;         // default 2.0
  };
}

// ---------------------------------------------------------------------------
// Shell helper — returns stdout or empty string on failure
// ---------------------------------------------------------------------------

function shellQuiet(cmd: string): string {
  try {
    return execSync(cmd, { timeout: 5000, encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// QuantumShieldCore
// ---------------------------------------------------------------------------

export class QuantumShieldCore {
  private config: QuantumShieldConfig;

  constructor(config: QuantumShieldConfig) {
    this.config = config;
  }

  // Real health check — queries the OS
  async checkHealth(): Promise<DeviceHealth> {
    const t = this.config.thresholds;

    // Disk usage
    let diskUsagePercent = 0;
    if (platform() === "linux" || platform() === "darwin") {
      const dfOut = shellQuiet("df / | tail -1 | awk '{print $5}'");
      diskUsagePercent = parseInt(dfOut.replace("%", ""), 10) || 0;
    }

    // Memory
    const totalMem = totalmem();
    const usedMem = totalMem - freemem();
    const memoryUsagePercent = Math.round((usedMem / totalMem) * 100);

    // CPU load
    const loadAvg = shellQuiet("cat /proc/loadavg 2>/dev/null || sysctl -n vm.loadavg 2>/dev/null");
    const loadAvg1m = parseFloat(loadAvg.split(" ")[0]) || 0;
    const cpuCount = cpus().length;

    // Secure Boot (Linux)
    let secureBootEnabled = false;
    if (platform() === "linux") {
      const sbState = shellQuiet("mokutil --sb-state 2>/dev/null");
      secureBootEnabled = sbState.includes("SecureBoot enabled");
    }

    // Firewall
    let firewallActive = false;
    if (platform() === "linux") {
      const iptOut = shellQuiet("iptables -L -n 2>/dev/null | wc -l");
      firewallActive = (parseInt(iptOut, 10) || 0) > 3;
    } else if (platform() === "darwin") {
      const pfOut = shellQuiet("/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null");
      firewallActive = pfOut.includes("enabled");
    }

    const health: DeviceHealth = {
      hostname: hostname(),
      platform: platform(),
      diskUsagePercent,
      diskOk: diskUsagePercent < t.maxDiskUsagePercent,
      memoryUsagePercent,
      memoryOk: memoryUsagePercent < t.maxMemoryUsagePercent,
      cpuCount,
      loadAvg1m,
      cpuOk: loadAvg1m / cpuCount < t.maxLoadPerCpu,
      uptimeHours: Math.round(uptime() / 3600),
      secureBootEnabled,
      firewallActive,
      lastChecked: new Date().toISOString(),
      overallHealthy: false,
    };

    health.overallHealthy = health.diskOk && health.memoryOk && health.cpuOk;

    // Audit the check
    await this.config.audit.writeAgentAction({
      agentId: "quantum-shield",
      actionName: "health-check",
      targetType: "device",
      targetId: health.hostname,
      actorId: "quantum-shield",
      actorType: "service",
      source: "quantum-shield",
    });

    return health;
  }

  // Hardening verification — checks what's actually enforced on the OS
  async verifyHardening(): Promise<HardeningResult> {
    const checks: HardeningCheck[] = [];
    const host = hostname();

    // SSH key-based auth only
    const sshdConfig = shellQuiet("grep -c 'PasswordAuthentication no' /etc/ssh/sshd_config 2>/dev/null");
    checks.push({
      id: "ssh-no-password",
      name: "SSH password auth disabled",
      passed: parseInt(sshdConfig, 10) > 0,
      detail: parseInt(sshdConfig, 10) > 0 ? "PasswordAuthentication no found" : "Password auth may be enabled",
    });

    // Root login disabled
    const rootLogin = shellQuiet("grep -c 'PermitRootLogin no' /etc/ssh/sshd_config 2>/dev/null");
    checks.push({
      id: "ssh-no-root",
      name: "SSH root login disabled",
      passed: parseInt(rootLogin, 10) > 0,
      detail: parseInt(rootLogin, 10) > 0 ? "PermitRootLogin no found" : "Root login may be enabled",
    });

    // Automatic updates
    const unattended = shellQuiet("systemctl is-active unattended-upgrades 2>/dev/null");
    checks.push({
      id: "auto-updates",
      name: "Automatic security updates",
      passed: unattended === "active",
      detail: unattended === "active" ? "unattended-upgrades active" : `Status: ${unattended || "unknown"}`,
    });

    // Firewall
    const ufwStatus = shellQuiet("ufw status 2>/dev/null");
    checks.push({
      id: "firewall-active",
      name: "Firewall enabled",
      passed: ufwStatus.includes("active"),
      detail: ufwStatus.includes("active") ? "UFW active" : `Status: ${ufwStatus.slice(0, 50) || "unknown"}`,
    });

    // No world-writable files in /etc
    const worldWritable = shellQuiet("find /etc -perm -002 -type f 2>/dev/null | head -1");
    checks.push({
      id: "no-world-writable-etc",
      name: "No world-writable files in /etc",
      passed: worldWritable.length === 0,
      detail: worldWritable.length === 0 ? "Clean" : `Found: ${worldWritable}`,
    });

    // /tmp is noexec (if separate mount)
    const tmpMount = shellQuiet("mount | grep ' /tmp ' 2>/dev/null");
    checks.push({
      id: "tmp-noexec",
      name: "/tmp mounted noexec",
      passed: tmpMount.includes("noexec"),
      detail: tmpMount.includes("noexec") ? "noexec on /tmp" : "Not enforced or not separate mount",
    });

    // Check for drift against saved baseline
    const baselinePath = join(this.config.dataDir, "hardening-baseline.json");
    let driftDetected = false;

    if (existsSync(baselinePath)) {
      const baseline: HardeningCheck[] = JSON.parse(readFileSync(baselinePath, "utf-8"));
      for (const check of checks) {
        const prev = baseline.find((b) => b.id === check.id);
        if (prev && prev.passed && !check.passed) {
          driftDetected = true;
          check.detail += " [DRIFT: was passing]";
        }
      }
    }

    // Save as new baseline
    writeFileSync(baselinePath, JSON.stringify(checks, null, 2), "utf-8");

    const passed = checks.filter((c) => c.passed).length;
    const failed = checks.length - passed;

    return {
      hostname: host,
      checks,
      controlsApplied: passed,
      controlsFailed: failed,
      driftDetected,
    };
  }

  // RBAC check — delegates to Evaluator
  async checkAccess(
    userId: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    const input: EvaluationInput = {
      principalId: userId,
      principalType: "human",
      action,
      resource,
      tags: [],
      context: {
        source: "quantum-shield",
      },
    };

    const decision = await this.config.evaluator.evaluate(input);
    return decision.effect === "ALLOW";
  }
}
