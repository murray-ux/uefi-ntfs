// L1-conduit/antenna.ts
//
// ROOM: ANTENNA — External signal reception and webhook ingestion
//
// Receives signals from external sources, queues them for processing,
// and tracks acknowledgement state. Failed signals can be replayed.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel, Timestamp } from "../layer0-kernel";
import { Conduit, LayerId } from "../layer1-conduit";

type SignalStatus = "pending" | "acknowledged" | "failed";

interface Signal {
  id: string;
  source: string;
  payload: unknown;
  status: SignalStatus;
  timestamp: Timestamp;
}

type SignalHandler = (signal: Signal) => void;

export class Antenna {
  private kernel: Kernel;
  private conduit: Conduit;
  private signals: Map<string, Signal> = new Map();
  private listeners: Map<string, SignalHandler> = new Map();
  private idCounter = 0;

  constructor(kernel: Kernel, conduit: Conduit) {
    this.kernel = kernel;
    this.conduit = conduit;
  }

  listen(source: string, handler: SignalHandler): void {
    this.listeners.set(source, handler);
  }

  unlisten(source: string): void {
    this.listeners.delete(source);
  }

  ingest(source: string, payload: unknown): Signal {
    const signal: Signal = {
      id: `sig-${++this.idCounter}`,
      source,
      payload,
      status: "pending",
      timestamp: Date.now() as Timestamp,
    };
    this.signals.set(signal.id, signal);
    const handler = this.listeners.get(source);
    if (handler) {
      try {
        handler(signal);
      } catch {
        signal.status = "failed";
      }
    }
    return signal;
  }

  pending(): Signal[] {
    return [...this.signals.values()].filter((s) => s.status === "pending");
  }

  acknowledge(id: string): boolean {
    const signal = this.signals.get(id);
    if (!signal || signal.status !== "pending") return false;
    signal.status = "acknowledged";
    return true;
  }

  replayFailed(): Signal[] {
    const failed = [...this.signals.values()].filter((s) => s.status === "failed");
    const replayed: Signal[] = [];
    for (const sig of failed) {
      sig.status = "pending";
      const handler = this.listeners.get(sig.source);
      if (handler) {
        try {
          handler(sig);
          replayed.push(sig);
        } catch {
          sig.status = "failed";
        }
      }
    }
    return replayed;
  }

  stats(): Record<string, unknown> {
    const all = [...this.signals.values()];
    return {
      room: "ANTENNA",
      layer: "L1-conduit",
      totalSignals: all.length,
      pending: all.filter((s) => s.status === "pending").length,
      acknowledged: all.filter((s) => s.status === "acknowledged").length,
      failed: all.filter((s) => s.status === "failed").length,
      activeListeners: this.listeners.size,
    };
  }
}
