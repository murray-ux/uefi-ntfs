// L4-manifold/mods.ts
//
// ROOM: MODS — Plugin and extension system
//
// Allows runtime registration of modular capabilities. Mods are
// named, versioned, typed extensions that hook into the manifold.
// Each mod declares what events it handles and what services it provides.
//
// Lives in L4 because plugins extend orchestration capabilities.

import { Kernel, Timestamp } from "../layer0-kernel";

export interface ModSpec {
  name: string;
  version: string;
  description: string;
  hooks: string[];             // event names this mod handles
  provides: string[];          // service names this mod provides
}

export interface ModHandle {
  readonly id: string;
  readonly spec: ModSpec;
  readonly installedAt: Timestamp;
  enabled: boolean;
  invocations: number;
  errors: number;
}

export type ModHandler = (event: string, payload: unknown) => Promise<unknown> | unknown;

interface InstalledMod {
  handle: ModHandle;
  handler: ModHandler;
}

export class Mods {
  private readonly kernel: Kernel;
  private readonly registry = new Map<string, InstalledMod>();
  private readonly hookIndex = new Map<string, string[]>();  // hook → mod IDs

  constructor(kernel: Kernel) {
    this.kernel = kernel;
  }

  // ── Install / Uninstall ────────────────────────────────────────────────

  install(spec: ModSpec, handler: ModHandler): ModHandle {
    if (this.findByName(spec.name)) {
      throw new Error(`Mod already installed: ${spec.name}`);
    }

    const id = this.kernel.deriveId("mod", spec.name, spec.version);
    const handle: ModHandle = {
      id,
      spec,
      installedAt: this.kernel.now(),
      enabled: true,
      invocations: 0,
      errors: 0,
    };

    this.registry.set(id, { handle, handler });

    // Build hook index
    for (const hook of spec.hooks) {
      const ids = this.hookIndex.get(hook) ?? [];
      ids.push(id);
      this.hookIndex.set(hook, ids);
    }

    return handle;
  }

  uninstall(name: string): boolean {
    const mod = this.findByName(name);
    if (!mod) return false;

    // Remove from hook index
    for (const hook of mod.handle.spec.hooks) {
      const ids = this.hookIndex.get(hook);
      if (ids) {
        const idx = ids.indexOf(mod.handle.id);
        if (idx !== -1) ids.splice(idx, 1);
        if (ids.length === 0) this.hookIndex.delete(hook);
      }
    }

    this.registry.delete(mod.handle.id);
    return true;
  }

  // ── Enable / Disable ───────────────────────────────────────────────────

  enable(name: string): boolean {
    const mod = this.findByName(name);
    if (!mod) return false;
    mod.handle.enabled = true;
    return true;
  }

  disable(name: string): boolean {
    const mod = this.findByName(name);
    if (!mod) return false;
    mod.handle.enabled = false;
    return true;
  }

  // ── Dispatch event to hooked mods ──────────────────────────────────────

  async dispatch(event: string, payload: unknown): Promise<Array<{ mod: string; output: unknown; error: string | null }>> {
    const ids = this.hookIndex.get(event) ?? [];
    const results: Array<{ mod: string; output: unknown; error: string | null }> = [];

    for (const id of ids) {
      const mod = this.registry.get(id);
      if (!mod || !mod.handle.enabled) continue;

      mod.handle.invocations++;
      try {
        const output = await mod.handler(event, payload);
        results.push({ mod: mod.handle.spec.name, output, error: null });
      } catch (err) {
        mod.handle.errors++;
        results.push({ mod: mod.handle.spec.name, output: null, error: String(err) });
      }
    }

    return results;
  }

  // ── Query services provided by mods ────────────────────────────────────

  provides(service: string): ModHandle[] {
    return [...this.registry.values()]
      .filter((m) => m.handle.enabled && m.handle.spec.provides.includes(service))
      .map((m) => m.handle);
  }

  // ── Query ──────────────────────────────────────────────────────────────

  private findByName(name: string): InstalledMod | null {
    for (const mod of this.registry.values()) {
      if (mod.handle.spec.name === name) return mod;
    }
    return null;
  }

  list(): ModHandle[] {
    return [...this.registry.values()].map((m) => m.handle);
  }

  hooks(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [hook, ids] of this.hookIndex) {
      result[hook] = ids.map((id) => {
        const mod = this.registry.get(id);
        return mod?.handle.spec.name ?? id;
      });
    }
    return result;
  }

  stats(): { installed: number; enabled: number; hooks: number; totalInvocations: number; totalErrors: number } {
    let enabled = 0, totalInvocations = 0, totalErrors = 0;
    for (const m of this.registry.values()) {
      if (m.handle.enabled) enabled++;
      totalInvocations += m.handle.invocations;
      totalErrors += m.handle.errors;
    }
    return { installed: this.registry.size, enabled, hooks: this.hookIndex.size, totalInvocations, totalErrors };
  }
}
