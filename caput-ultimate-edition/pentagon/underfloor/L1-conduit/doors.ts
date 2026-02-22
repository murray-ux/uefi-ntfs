// L1-conduit/doors.ts
//
// ROOM: DOORS — Ingress/egress access points between layers
//
// Every cross-layer call passes through a Door. Doors enforce:
//   - Direction (inbound vs outbound)
//   - Registration (only declared doors exist)
//   - Metering (count every transit)
//   - Sealing (doors can be shut — emergency isolation)
//
// Lives in L1 because doors govern the conduit between layers.

import { Kernel, Timestamp } from "../layer0-kernel";

export type DoorDirection = "inbound" | "outbound" | "bidirectional";
export type DoorState = "open" | "sealed" | "restricted";

export interface DoorSpec {
  id: string;
  from: string;
  to: string;
  direction: DoorDirection;
  description: string;
}

export interface DoorStatus {
  readonly spec: DoorSpec;
  state: DoorState;
  transits: number;
  blocked: number;
  lastTransit: Timestamp | null;
  sealedAt: Timestamp | null;
  sealReason: string | null;
}

export interface TransitRecord {
  doorId: string;
  direction: "in" | "out";
  principal: string;
  ts: Timestamp;
  allowed: boolean;
}

export class Doors {
  private readonly kernel: Kernel;
  private readonly registry = new Map<string, DoorStatus>();
  private readonly transitLog: TransitRecord[] = [];
  private readonly maxTransitLog: number;

  constructor(kernel: Kernel, maxTransitLog: number = 10000) {
    this.kernel = kernel;
    this.maxTransitLog = maxTransitLog;
  }

  // ── Registration ───────────────────────────────────────────────────────

  install(spec: DoorSpec): void {
    if (this.registry.has(spec.id)) throw new Error(`Door already exists: ${spec.id}`);
    this.registry.set(spec.id, {
      spec,
      state: "open",
      transits: 0,
      blocked: 0,
      lastTransit: null,
      sealedAt: null,
      sealReason: null,
    });
  }

  // ── Transit ────────────────────────────────────────────────────────────

  transit(doorId: string, direction: "in" | "out", principal: string): boolean {
    const door = this.registry.get(doorId);
    if (!door) throw new Error(`Unknown door: ${doorId}`);

    const ts = this.kernel.now();
    const record: TransitRecord = { doorId, direction, principal, ts, allowed: false };

    // Check state
    if (door.state === "sealed") {
      door.blocked++;
      this.logTransit(record);
      return false;
    }

    // Check direction
    if (door.spec.direction === "inbound" && direction === "out") {
      door.blocked++;
      this.logTransit(record);
      return false;
    }
    if (door.spec.direction === "outbound" && direction === "in") {
      door.blocked++;
      this.logTransit(record);
      return false;
    }

    // Allow
    record.allowed = true;
    door.transits++;
    door.lastTransit = ts;
    this.logTransit(record);
    return true;
  }

  // ── Control ────────────────────────────────────────────────────────────

  seal(doorId: string, reason: string): boolean {
    const door = this.registry.get(doorId);
    if (!door) return false;
    door.state = "sealed";
    door.sealedAt = this.kernel.now();
    door.sealReason = reason;
    return true;
  }

  unseal(doorId: string): boolean {
    const door = this.registry.get(doorId);
    if (!door) return false;
    door.state = "open";
    door.sealedAt = null;
    door.sealReason = null;
    return true;
  }

  restrict(doorId: string): boolean {
    const door = this.registry.get(doorId);
    if (!door) return false;
    door.state = "restricted";
    return true;
  }

  // ── Emergency: seal everything ─────────────────────────────────────────

  lockdown(reason: string): number {
    let sealed = 0;
    for (const [id] of this.registry) {
      if (this.seal(id, `LOCKDOWN: ${reason}`)) sealed++;
    }
    return sealed;
  }

  liftLockdown(): number {
    let opened = 0;
    for (const [id, door] of this.registry) {
      if (door.state === "sealed" && door.sealReason?.startsWith("LOCKDOWN:")) {
        this.unseal(id);
        opened++;
      }
    }
    return opened;
  }

  // ── Query ──────────────────────────────────────────────────────────────

  get(doorId: string): DoorStatus | null {
    return this.registry.get(doorId) ?? null;
  }

  list(): DoorStatus[] {
    return [...this.registry.values()];
  }

  sealed(): DoorStatus[] {
    return [...this.registry.values()].filter((d) => d.state === "sealed");
  }

  recentTransits(count = 50): TransitRecord[] {
    return this.transitLog.slice(-count);
  }

  private logTransit(record: TransitRecord): void {
    this.transitLog.push(record);
    while (this.transitLog.length > this.maxTransitLog) this.transitLog.shift();
  }

  stats(): { doors: number; open: number; sealed: number; totalTransits: number; totalBlocked: number } {
    let open = 0, sealedCount = 0, totalTransits = 0, totalBlocked = 0;
    for (const d of this.registry.values()) {
      if (d.state === "open") open++;
      if (d.state === "sealed") sealedCount++;
      totalTransits += d.transits;
      totalBlocked += d.blocked;
    }
    return { doors: this.registry.size, open, sealed: sealedCount, totalTransits, totalBlocked };
  }
}
