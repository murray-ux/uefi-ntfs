// L1-conduit/horn.ts
//
// ROOM: HORN — Broadcast announcements and system-wide notifications
//
// Pushes announcements across channels with priority levels.
// Subscribers register per-channel; broadcasts hit all channels.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel, Timestamp } from "../layer0-kernel";
import { Conduit, LayerId } from "../layer1-conduit";

export type Priority = "low" | "normal" | "high" | "urgent";

interface Announcement {
  id: string;
  channel: string;
  message: string;
  priority: Priority;
  timestamp: Timestamp;
}

type ChannelCallback = (announcement: Announcement) => void;

export class Horn {
  private kernel: Kernel;
  private conduit: Conduit;
  private announcements: Announcement[] = [];
  private subscribers: Map<string, Set<ChannelCallback>> = new Map();
  private idCounter = 0;

  constructor(kernel: Kernel, conduit: Conduit) {
    this.kernel = kernel;
    this.conduit = conduit;
  }

  announce(channel: string, message: string, priority: Priority = "normal"): Announcement {
    const entry: Announcement = {
      id: `horn-${++this.idCounter}`,
      channel,
      message,
      priority,
      timestamp: Date.now() as Timestamp,
    };
    this.announcements.push(entry);
    const subs = this.subscribers.get(channel);
    if (subs) {
      for (const cb of subs) cb(entry);
    }
    return entry;
  }

  subscribe(channel: string, callback: ChannelCallback): void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel)!.add(callback);
  }

  unsubscribe(channel: string): void {
    this.subscribers.delete(channel);
  }

  broadcast(message: string): Announcement[] {
    const results: Announcement[] = [];
    for (const channel of this.subscribers.keys()) {
      results.push(this.announce(channel, message, "normal"));
    }
    return results;
  }

  channels(): string[] {
    return [...this.subscribers.keys()];
  }

  history(last = 50): Announcement[] {
    return this.announcements.slice(-last);
  }

  stats(): Record<string, unknown> {
    const subscriberCounts: Record<string, number> = {};
    for (const [ch, subs] of this.subscribers) {
      subscriberCounts[ch] = subs.size;
    }
    return {
      room: "HORN",
      layer: "L1-conduit",
      totalAnnouncements: this.announcements.length,
      activeChannels: this.subscribers.size,
      subscriberCounts,
    };
  }
}
