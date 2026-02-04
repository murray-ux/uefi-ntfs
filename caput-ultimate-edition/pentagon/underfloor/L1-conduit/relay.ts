// L1-conduit/relay.ts
//
// ROOM: RELAY — Message forwarding and routing between layers
//
// Routes messages between Pentagon layers using pattern-matched
// routing tables. Queues messages when targets are unavailable
// and supports flushing the pending queue.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel, Timestamp } from "../layer0-kernel";
import { Conduit, LayerId } from "../layer1-conduit";

interface RelayMessage {
  id: string;
  from: string;
  to: string;
  payload: unknown;
  timestamp: Timestamp;
  delivered: boolean;
}

interface Route {
  pattern: string;
  target: string;
}

export class Relay {
  private kernel: Kernel;
  private conduit: Conduit;
  private messages: RelayMessage[] = [];
  private queue: RelayMessage[] = [];
  private routes: Map<string, Route> = new Map();
  private idCounter = 0;

  constructor(kernel: Kernel, conduit: Conduit) {
    this.kernel = kernel;
    this.conduit = conduit;
  }

  forward(from: string, to: string, payload: unknown): RelayMessage {
    const msg: RelayMessage = {
      id: `relay-${++this.idCounter}`,
      from,
      to,
      payload,
      timestamp: Date.now() as Timestamp,
      delivered: false,
    };
    this.messages.push(msg);
    const matched = this.matchRoute(to);
    if (matched) {
      msg.to = matched.target;
      msg.delivered = true;
    } else {
      this.queue.push(msg);
    }
    return msg;
  }

  route(destination: string, message: unknown): RelayMessage {
    return this.forward("system", destination, message);
  }

  addRoute(pattern: string, target: string): void {
    this.routes.set(pattern, { pattern, target });
  }

  removeRoute(pattern: string): void {
    this.routes.delete(pattern);
  }

  pending(): RelayMessage[] {
    return [...this.queue];
  }

  flush(): RelayMessage[] {
    const flushed: RelayMessage[] = [];
    const remaining: RelayMessage[] = [];
    for (const msg of this.queue) {
      const matched = this.matchRoute(msg.to);
      if (matched) {
        msg.to = matched.target;
        msg.delivered = true;
        flushed.push(msg);
      } else {
        remaining.push(msg);
      }
    }
    this.queue = remaining;
    return flushed;
  }

  private matchRoute(destination: string): Route | null {
    for (const [pattern, route] of this.routes) {
      if (destination.includes(pattern)) return route;
    }
    return null;
  }

  stats(): Record<string, unknown> {
    return {
      room: "RELAY",
      layer: "L1-conduit",
      totalMessages: this.messages.length,
      delivered: this.messages.filter((m) => m.delivered).length,
      queueDepth: this.queue.length,
      activeRoutes: this.routes.size,
    };
  }
}
