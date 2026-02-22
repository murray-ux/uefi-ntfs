// pentagon/underfloor/L2-reservoir/filter.ts
//
// ROOM: FILTER — Data filtering, transformation pipelines, and content gates.
// Rules are evaluated by priority (lower = first). Each rule tracks its own
// hit/miss counters. Pipelines chain multiple rules in sequence; bypass
// skips the rule engine entirely.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel } from "../layer0-kernel";

type FilterAction = "pass" | "block" | "transform";

interface FilterRule {
  id: string;
  name: string;
  pattern: string;
  action: FilterAction;
  priority: number;
  hits: number;
  misses: number;
}

export class Filter {
  private readonly kernel: Kernel;
  private readonly rules: Map<string, FilterRule> = new Map();
  private seq = 0;
  private throughput = 0;

  constructor(kernel: Kernel) {
    this.kernel = kernel;
  }

  addRule(name: string, pattern: string, action: FilterAction, priority = 100): FilterRule {
    const id = `rule-${++this.seq}`;
    const rule: FilterRule = { id, name, pattern, action, priority, hits: 0, misses: 0 };
    this.rules.set(id, rule);
    return rule;
  }

  removeRule(id: string): boolean {
    return this.rules.delete(id);
  }

  evaluate(data: string): { action: FilterAction; ruleId: string | null } {
    const sorted = [...this.rules.values()].sort((a, b) => a.priority - b.priority);
    for (const rule of sorted) {
      const re = new RegExp(rule.pattern);
      if (re.test(data)) {
        rule.hits++;
        this.throughput++;
        return { action: rule.action, ruleId: rule.id };
      }
      rule.misses++;
    }
    this.throughput++;
    return { action: "pass", ruleId: null };
  }

  pipeline(data: string, ruleIds: string[]): { data: string; applied: string[] } {
    const applied: string[] = [];
    let current = data;
    for (const rid of ruleIds) {
      const rule = this.rules.get(rid);
      if (!rule) continue;
      const re = new RegExp(rule.pattern);
      if (re.test(current)) {
        rule.hits++;
        applied.push(rid);
        if (rule.action === "block") { current = ""; break; }
        if (rule.action === "transform") { current = current.replace(re, `[${rule.name}]`); }
      } else {
        rule.misses++;
      }
    }
    this.throughput++;
    return { data: current, applied };
  }

  bypass(data: string): { data: string; bypassed: true } {
    this.throughput++;
    return { data, bypassed: true };
  }

  ruleSet(): FilterRule[] {
    return [...this.rules.values()].sort((a, b) => a.priority - b.priority);
  }

  stats(): Record<string, unknown> {
    const all = [...this.rules.values()];
    return {
      totalRules: all.length,
      totalHits: all.reduce((s, r) => s + r.hits, 0),
      totalMisses: all.reduce((s, r) => s + r.misses, 0),
      throughput: this.throughput,
    };
  }
}
