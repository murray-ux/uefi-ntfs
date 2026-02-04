/**
 * Pentagon Architecture - Core Module
 * 5 Layers × 8 Rooms = 40 Rooms Total
 * Single Facade: CMD (all traffic enters here)
 *
 * GENESIS 2.0 — Forbidden Ninja City
 */

import { EventEmitter } from 'node:events';

// ═══════════════════════════════════════════════════════════════════════════
// Layer Definitions
// ═══════════════════════════════════════════════════════════════════════════

export const LAYERS = {
  L0_KERNEL: {
    id: 'L0',
    name: 'Kernel',
    description: 'Crypto & Primitives',
    rooms: ['thermostat', 'chip', 'battery', 'clock', 'compass', 'fuse', 'spark']
  },
  L1_CONDUIT: {
    id: 'L1',
    name: 'Conduit',
    description: 'Messaging',
    rooms: ['flares', 'locks', 'doors', 'horn', 'mirrors', 'antenna', 'relay']
  },
  L2_RESERVOIR: {
    id: 'L2',
    name: 'Reservoir',
    description: 'State & Storage',
    rooms: ['trunk', 'spares', 'coolant', 'wash', 'tank', 'filter', 'jack', 'glove']
  },
  L3_VALVE: {
    id: 'L3',
    name: 'Valve',
    description: 'Policy & Control',
    rooms: ['brakes', 'tint', 'wipers', 'fuel', 'clutch', 'gears', 'pedals', 'gauges', 'seatbelts']
  },
  L4_MANIFOLD: {
    id: 'L4',
    name: 'Manifold',
    description: 'Orchestration',
    rooms: ['engine', 'wings', 'mods', 'exhaust', 'turbo', 'chassis', 'bumper', 'spoiler', 'wheels']
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Room Registry
// ═══════════════════════════════════════════════════════════════════════════

const ROOM_REGISTRY = new Map();

// L0 Kernel - Crypto & Primitives
ROOM_REGISTRY.set('thermostat', { layer: 'L0', purpose: 'Temperature/entropy monitoring', status: 'operational' });
ROOM_REGISTRY.set('chip', { layer: 'L0', purpose: 'Hardware security module interface', status: 'operational' });
ROOM_REGISTRY.set('battery', { layer: 'L0', purpose: 'Power state and UPS management', status: 'operational' });
ROOM_REGISTRY.set('clock', { layer: 'L0', purpose: 'Time synchronization (NTP/PTP)', status: 'operational' });
ROOM_REGISTRY.set('compass', { layer: 'L0', purpose: 'System orientation and config', status: 'operational' });
ROOM_REGISTRY.set('fuse', { layer: 'L0', purpose: 'Circuit breaker / kill switch', status: 'operational' });
ROOM_REGISTRY.set('spark', { layer: 'L0', purpose: 'Cryptographic key ignition', status: 'operational' });

// L1 Conduit - Messaging
ROOM_REGISTRY.set('flares', { layer: 'L1', purpose: 'Alert and notification dispatch', status: 'operational' });
ROOM_REGISTRY.set('locks', { layer: 'L1', purpose: 'Distributed locking service', status: 'operational' });
ROOM_REGISTRY.set('doors', { layer: 'L1', purpose: 'API gateway and ingress', status: 'operational' });
ROOM_REGISTRY.set('horn', { layer: 'L1', purpose: 'Broadcast messaging', status: 'operational' });
ROOM_REGISTRY.set('mirrors', { layer: 'L1', purpose: 'Request/response reflection', status: 'operational' });
ROOM_REGISTRY.set('antenna', { layer: 'L1', purpose: 'External communication interface', status: 'operational' });
ROOM_REGISTRY.set('relay', { layer: 'L1', purpose: 'Message routing and forwarding', status: 'operational' });

// L2 Reservoir - State & Storage
ROOM_REGISTRY.set('trunk', { layer: 'L2', purpose: 'Primary data storage', status: 'operational' });
ROOM_REGISTRY.set('spares', { layer: 'L2', purpose: 'Backup and redundancy', status: 'operational' });
ROOM_REGISTRY.set('coolant', { layer: 'L2', purpose: 'Cache management', status: 'operational' });
ROOM_REGISTRY.set('wash', { layer: 'L2', purpose: 'Data sanitization', status: 'operational' });
ROOM_REGISTRY.set('tank', { layer: 'L2', purpose: 'Blob storage', status: 'operational' });
ROOM_REGISTRY.set('filter', { layer: 'L2', purpose: 'Data validation and filtering', status: 'operational' });
ROOM_REGISTRY.set('jack', { layer: 'L2', purpose: 'Emergency data lift/recovery', status: 'operational' });
ROOM_REGISTRY.set('glove', { layer: 'L2', purpose: 'Secure document storage', status: 'operational' });

// L3 Valve - Policy & Control
ROOM_REGISTRY.set('brakes', { layer: 'L3', purpose: 'Rate limiting and throttling', status: 'operational' });
ROOM_REGISTRY.set('tint', { layer: 'L3', purpose: 'Data masking and redaction', status: 'operational' });
ROOM_REGISTRY.set('wipers', { layer: 'L3', purpose: 'Log rotation and cleanup', status: 'operational' });
ROOM_REGISTRY.set('fuel', { layer: 'L3', purpose: 'Resource allocation', status: 'operational' });
ROOM_REGISTRY.set('clutch', { layer: 'L3', purpose: 'Service coupling control', status: 'operational' });
ROOM_REGISTRY.set('gears', { layer: 'L3', purpose: 'Workflow state machine', status: 'operational' });
ROOM_REGISTRY.set('pedals', { layer: 'L3', purpose: 'Manual override controls', status: 'operational' });
ROOM_REGISTRY.set('gauges', { layer: 'L3', purpose: 'Metrics and instrumentation', status: 'operational' });
ROOM_REGISTRY.set('seatbelts', { layer: 'L3', purpose: 'Safety constraints enforcement', status: 'operational' });

// L4 Manifold - Orchestration
ROOM_REGISTRY.set('engine', { layer: 'L4', purpose: 'Core orchestration engine', status: 'operational' });
ROOM_REGISTRY.set('wings', { layer: 'L4', purpose: 'Horizontal scaling', status: 'operational' });
ROOM_REGISTRY.set('mods', { layer: 'L4', purpose: 'Plugin and extension system', status: 'operational' });
ROOM_REGISTRY.set('exhaust', { layer: 'L4', purpose: 'Output and export pipelines', status: 'operational' });
ROOM_REGISTRY.set('turbo', { layer: 'L4', purpose: 'Performance optimization', status: 'operational' });
ROOM_REGISTRY.set('chassis', { layer: 'L4', purpose: 'Infrastructure framework', status: 'operational' });
ROOM_REGISTRY.set('bumper', { layer: 'L4', purpose: 'Error handling and recovery', status: 'operational' });
ROOM_REGISTRY.set('spoiler', { layer: 'L4', purpose: 'Preview and staging', status: 'operational' });
ROOM_REGISTRY.set('wheels', { layer: 'L4', purpose: 'Deployment and rollout', status: 'operational' });

// ═══════════════════════════════════════════════════════════════════════════
// Pentagon Class
// ═══════════════════════════════════════════════════════════════════════════

export class Pentagon extends EventEmitter {
  constructor() {
    super();
    this.rooms = ROOM_REGISTRY;
    this.handlers = new Map();
    this.metrics = {
      requests: 0,
      errors: 0,
      startTime: Date.now()
    };
  }

  /**
   * Register a handler for a room
   */
  registerHandler(room, handler) {
    if (!this.rooms.has(room)) {
      throw new Error(`Unknown room: ${room}`);
    }
    this.handlers.set(room, handler);
    this.emit('handler:registered', { room });
  }

  /**
   * CMD Facade - Single entry point for all requests
   */
  async cmd(room, action, payload = {}) {
    this.metrics.requests++;

    if (!this.rooms.has(room)) {
      this.metrics.errors++;
      throw new Error(`Unknown room: ${room}`);
    }

    const roomInfo = this.rooms.get(room);
    const handler = this.handlers.get(room);

    const request = {
      room,
      action,
      payload,
      timestamp: new Date().toISOString(),
      layer: roomInfo.layer
    };

    this.emit('cmd:before', request);

    let result;
    if (handler) {
      try {
        result = await handler(action, payload);
      } catch (err) {
        this.metrics.errors++;
        this.emit('cmd:error', { request, error: err });
        throw err;
      }
    } else {
      // Default handler - return room status
      result = {
        room,
        layer: roomInfo.layer,
        purpose: roomInfo.purpose,
        status: roomInfo.status,
        action,
        message: `Room ${room} received action: ${action}`,
        timestamp: new Date().toISOString()
      };
    }

    this.emit('cmd:after', { request, result });
    return result;
  }

  /**
   * Get room information
   */
  getRoom(room) {
    return this.rooms.get(room);
  }

  /**
   * Get all rooms in a layer
   */
  getLayer(layerId) {
    const layer = Object.values(LAYERS).find(l => l.id === layerId);
    if (!layer) return null;

    return {
      ...layer,
      rooms: layer.rooms.map(room => ({
        name: room,
        ...this.rooms.get(room)
      }))
    };
  }

  /**
   * Get full Pentagon status
   */
  getStatus() {
    const layers = Object.values(LAYERS).map(layer => ({
      id: layer.id,
      name: layer.name,
      description: layer.description,
      roomCount: layer.rooms.length,
      operational: layer.rooms.every(r => this.rooms.get(r)?.status === 'operational')
    }));

    return {
      status: 'operational',
      layers,
      totalRooms: this.rooms.size,
      handlersRegistered: this.handlers.size,
      metrics: {
        ...this.metrics,
        uptime: Date.now() - this.metrics.startTime
      }
    };
  }

  /**
   * Health check
   */
  health() {
    const status = this.getStatus();
    return {
      healthy: status.status === 'operational',
      ...status
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Default Export
// ═══════════════════════════════════════════════════════════════════════════

export default Pentagon;
