/**
 * MALAKH MESSAGE BUS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Copyright 2025 Murray Bembrick
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * מלאך (Malakh) = Messenger/Angel — Divine Communication Channel
 *
 * High-performance message bus for inter-module communication:
 *   - Publish/Subscribe messaging
 *   - Request/Reply patterns
 *   - Topic-based routing
 *   - Message queuing with persistence
 *   - Dead letter handling
 *   - Message transformation
 *   - Circuit breaker integration
 *   - Distributed tracing
 *
 * "The messengers carry forth the word — swift, reliable, eternal."
 *
 * @module MALAKH
 * @author Murray Bembrick <Founder & Lead Developer>
 * @version 2.0.0
 * @license Apache-2.0
 */

import { EventEmitter } from 'events';
import { createHash, randomUUID } from 'crypto';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export const MESSAGE_TYPES = {
  EVENT: 'event',
  COMMAND: 'command',
  QUERY: 'query',
  REPLY: 'reply',
  BROADCAST: 'broadcast',
  HEARTBEAT: 'heartbeat',
  ERROR: 'error'
};

export const DELIVERY_MODES = {
  AT_MOST_ONCE: 'at_most_once',
  AT_LEAST_ONCE: 'at_least_once',
  EXACTLY_ONCE: 'exactly_once'
};

export const ROUTING_STRATEGIES = {
  DIRECT: 'direct',
  FANOUT: 'fanout',
  TOPIC: 'topic',
  ROUND_ROBIN: 'round_robin',
  LEAST_BUSY: 'least_busy'
};

// ══════════════════════════════════════════════════════════════════════════════
// MESSAGE CLASS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Immutable message envelope
 */
export class Message {
  constructor(type, topic, payload, options = {}) {
    this.id = options.id || randomUUID();
    this.correlationId = options.correlationId || null;
    this.causationId = options.causationId || null;
    this.type = type;
    this.topic = topic;
    this.payload = payload;
    this.source = options.source || 'unknown';
    this.destination = options.destination || null;
    this.timestamp = options.timestamp || Date.now();
    this.ttl = options.ttl || 0; // 0 = no expiry
    this.priority = options.priority || 5; // 1-10, 1 = highest
    this.headers = options.headers || {};
    this.retryCount = options.retryCount || 0;
    this.maxRetries = options.maxRetries || 3;

    // Compute hash for deduplication
    this.hash = this._computeHash();

    Object.freeze(this);
  }

  _computeHash() {
    const content = JSON.stringify({
      type: this.type,
      topic: this.topic,
      payload: this.payload,
      source: this.source
    });
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  isExpired() {
    if (this.ttl === 0) return false;
    return Date.now() > this.timestamp + this.ttl;
  }

  canRetry() {
    return this.retryCount < this.maxRetries;
  }

  withRetry() {
    return new Message(this.type, this.topic, this.payload, {
      ...this,
      retryCount: this.retryCount + 1
    });
  }

  reply(payload) {
    return new Message(MESSAGE_TYPES.REPLY, this.topic, payload, {
      correlationId: this.id,
      causationId: this.causationId || this.id,
      destination: this.source
    });
  }

  toJSON() {
    return {
      id: this.id,
      correlationId: this.correlationId,
      type: this.type,
      topic: this.topic,
      payload: this.payload,
      source: this.source,
      destination: this.destination,
      timestamp: this.timestamp,
      headers: this.headers
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Topic subscription with filtering
 */
export class Subscription {
  constructor(topic, handler, options = {}) {
    this.id = randomUUID();
    this.topic = topic;
    this.pattern = this._compilePattern(topic);
    this.handler = handler;
    this.filter = options.filter || null;
    this.group = options.group || null; // Consumer group
    this.priority = options.priority || 5;
    this.maxConcurrent = options.maxConcurrent || 10;
    this.active = true;
    this.processing = 0;
    this.processed = 0;
    this.errors = 0;
    this.createdAt = Date.now();
  }

  _compilePattern(topic) {
    // Convert topic pattern to regex
    // * matches single segment, # matches multiple segments
    const regex = topic
      .replace(/\./g, '\\.')
      .replace(/\*/g, '[^.]+')
      .replace(/#/g, '.*');
    return new RegExp(`^${regex}$`);
  }

  matches(topic) {
    return this.pattern.test(topic);
  }

  passesFilter(message) {
    if (!this.filter) return true;

    if (typeof this.filter === 'function') {
      return this.filter(message);
    }

    // Object-based filter
    for (const [key, value] of Object.entries(this.filter)) {
      if (message[key] !== value && message.payload?.[key] !== value) {
        return false;
      }
    }
    return true;
  }

  canProcess() {
    return this.active && this.processing < this.maxConcurrent;
  }

  async process(message) {
    this.processing++;
    try {
      const result = await this.handler(message);
      this.processed++;
      return result;
    } catch (error) {
      this.errors++;
      throw error;
    } finally {
      this.processing--;
    }
  }

  pause() {
    this.active = false;
  }

  resume() {
    this.active = true;
  }

  getStats() {
    return {
      id: this.id,
      topic: this.topic,
      active: this.active,
      processing: this.processing,
      processed: this.processed,
      errors: this.errors,
      errorRate: this.processed > 0 ? this.errors / this.processed : 0
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MESSAGE QUEUE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Priority-based message queue
 */
export class MessageQueue {
  constructor(name, options = {}) {
    this.name = name;
    this.maxSize = options.maxSize || 10000;
    this.queue = [];
    this.processing = new Map();
    this.deadLetter = [];
    this.maxDeadLetter = options.maxDeadLetter || 1000;
    this.stats = {
      enqueued: 0,
      dequeued: 0,
      deadLettered: 0
    };
  }

  enqueue(message) {
    if (this.queue.length >= this.maxSize) {
      // Remove lowest priority message
      this.queue.sort((a, b) => a.priority - b.priority);
      const removed = this.queue.pop();
      this._deadLetter(removed, 'queue_overflow');
    }

    // Insert by priority (lower number = higher priority)
    const index = this.queue.findIndex(m => m.priority > message.priority);
    if (index === -1) {
      this.queue.push(message);
    } else {
      this.queue.splice(index, 0, message);
    }

    this.stats.enqueued++;
    return message.id;
  }

  dequeue() {
    // Skip expired messages
    while (this.queue.length > 0) {
      const message = this.queue.shift();

      if (message.isExpired()) {
        this._deadLetter(message, 'expired');
        continue;
      }

      this.processing.set(message.id, {
        message,
        startedAt: Date.now()
      });

      this.stats.dequeued++;
      return message;
    }
    return null;
  }

  peek() {
    return this.queue[0] || null;
  }

  ack(messageId) {
    const entry = this.processing.get(messageId);
    if (entry) {
      this.processing.delete(messageId);
      return true;
    }
    return false;
  }

  nack(messageId, reason) {
    const entry = this.processing.get(messageId);
    if (entry) {
      this.processing.delete(messageId);

      if (entry.message.canRetry()) {
        // Re-enqueue with retry
        this.enqueue(entry.message.withRetry());
      } else {
        this._deadLetter(entry.message, reason || 'max_retries');
      }
      return true;
    }
    return false;
  }

  _deadLetter(message, reason) {
    this.deadLetter.push({
      message,
      reason,
      deadLetteredAt: Date.now()
    });

    if (this.deadLetter.length > this.maxDeadLetter) {
      this.deadLetter.shift();
    }

    this.stats.deadLettered++;
  }

  replayDeadLetter(count = 10) {
    const toReplay = this.deadLetter.splice(0, count);
    for (const entry of toReplay) {
      this.enqueue(new Message(
        entry.message.type,
        entry.message.topic,
        entry.message.payload,
        { ...entry.message, retryCount: 0 }
      ));
    }
    return toReplay.length;
  }

  getStats() {
    return {
      name: this.name,
      size: this.queue.length,
      processing: this.processing.size,
      deadLetter: this.deadLetter.length,
      ...this.stats
    };
  }

  clear() {
    this.queue = [];
    this.processing.clear();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXCHANGE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Message exchange with routing
 */
export class Exchange {
  constructor(name, type = ROUTING_STRATEGIES.TOPIC) {
    this.name = name;
    this.type = type;
    this.bindings = new Map();
    this.roundRobinIndex = new Map();
    this.stats = {
      routed: 0,
      unroutable: 0
    };
  }

  bind(routingKey, queue) {
    if (!this.bindings.has(routingKey)) {
      this.bindings.set(routingKey, []);
    }
    this.bindings.get(routingKey).push(queue);
  }

  unbind(routingKey, queue) {
    const queues = this.bindings.get(routingKey);
    if (queues) {
      const index = queues.indexOf(queue);
      if (index !== -1) {
        queues.splice(index, 1);
      }
    }
  }

  route(message) {
    const destinations = this._getDestinations(message.topic);

    if (destinations.length === 0) {
      this.stats.unroutable++;
      return [];
    }

    this.stats.routed++;
    return destinations;
  }

  _getDestinations(topic) {
    switch (this.type) {
      case ROUTING_STRATEGIES.DIRECT:
        return this.bindings.get(topic) || [];

      case ROUTING_STRATEGIES.FANOUT:
        // Return all bound queues
        const all = [];
        for (const queues of this.bindings.values()) {
          all.push(...queues);
        }
        return [...new Set(all)];

      case ROUTING_STRATEGIES.TOPIC:
        // Match against patterns
        const matches = [];
        for (const [pattern, queues] of this.bindings) {
          if (this._matchTopic(topic, pattern)) {
            matches.push(...queues);
          }
        }
        return [...new Set(matches)];

      case ROUTING_STRATEGIES.ROUND_ROBIN:
        const queues = this.bindings.get(topic) || [];
        if (queues.length === 0) return [];

        let index = this.roundRobinIndex.get(topic) || 0;
        const selected = queues[index % queues.length];
        this.roundRobinIndex.set(topic, index + 1);
        return [selected];

      case ROUTING_STRATEGIES.LEAST_BUSY:
        const candidates = this.bindings.get(topic) || [];
        if (candidates.length === 0) return [];

        // Sort by queue size and return least busy
        const sorted = [...candidates].sort((a, b) =>
          a.queue.length - b.queue.length
        );
        return [sorted[0]];

      default:
        return [];
    }
  }

  _matchTopic(topic, pattern) {
    const topicParts = topic.split('.');
    const patternParts = pattern.split('.');

    let ti = 0;
    let pi = 0;

    while (ti < topicParts.length && pi < patternParts.length) {
      if (patternParts[pi] === '#') {
        return true; // # matches everything remaining
      }

      if (patternParts[pi] === '*' || patternParts[pi] === topicParts[ti]) {
        ti++;
        pi++;
      } else {
        return false;
      }
    }

    return ti === topicParts.length && pi === patternParts.length;
  }

  getStats() {
    return {
      name: this.name,
      type: this.type,
      bindings: this.bindings.size,
      ...this.stats
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Circuit breaker for fault tolerance
 */
export class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.state = 'closed'; // closed, open, half-open
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 3;
    this.timeout = options.timeout || 30000;
    this.failures = 0;
    this.successes = 0;
    this.lastFailure = null;
    this.lastStateChange = Date.now();
  }

  async execute(fn) {
    if (this.state === 'open') {
      // Check if timeout has passed
      if (Date.now() - this.lastStateChange > this.timeout) {
        this._transition('half-open');
      } else {
        throw new Error(`Circuit breaker ${this.name} is open`);
      }
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure();
      throw error;
    }
  }

  _onSuccess() {
    this.failures = 0;

    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this._transition('closed');
      }
    }
  }

  _onFailure() {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.state === 'half-open') {
      this._transition('open');
    } else if (this.failures >= this.failureThreshold) {
      this._transition('open');
    }
  }

  _transition(newState) {
    this.state = newState;
    this.lastStateChange = Date.now();
    this.successes = 0;

    if (newState === 'closed') {
      this.failures = 0;
    }
  }

  getState() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailure,
      lastStateChange: this.lastStateChange
    };
  }

  reset() {
    this._transition('closed');
    this.failures = 0;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MESSAGE TRANSFORMER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Transform messages in transit
 */
export class MessageTransformer {
  constructor() {
    this.transformers = new Map();
  }

  register(name, transformer) {
    this.transformers.set(name, transformer);
  }

  async transform(message, transformerNames) {
    let result = message;

    for (const name of transformerNames) {
      const transformer = this.transformers.get(name);
      if (transformer) {
        result = await transformer(result);
      }
    }

    return result;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TRACE CONTEXT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Distributed tracing support
 */
export class TraceContext {
  constructor(traceId = null, spanId = null, parentSpanId = null) {
    this.traceId = traceId || randomUUID();
    this.spanId = spanId || this._generateSpanId();
    this.parentSpanId = parentSpanId;
    this.baggage = {};
    this.startTime = Date.now();
  }

  _generateSpanId() {
    return randomUUID().substring(0, 16);
  }

  createChild() {
    return new TraceContext(this.traceId, null, this.spanId);
  }

  setBaggage(key, value) {
    this.baggage[key] = value;
  }

  getBaggage(key) {
    return this.baggage[key];
  }

  toHeaders() {
    return {
      'x-trace-id': this.traceId,
      'x-span-id': this.spanId,
      'x-parent-span-id': this.parentSpanId,
      'x-baggage': JSON.stringify(this.baggage)
    };
  }

  static fromHeaders(headers) {
    return new TraceContext(
      headers['x-trace-id'],
      headers['x-span-id'],
      headers['x-parent-span-id']
    );
  }

  toJSON() {
    return {
      traceId: this.traceId,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      duration: Date.now() - this.startTime
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MALAKH MESSAGE BUS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Main Message Bus - The Divine Messenger
 */
export class Malakh extends EventEmitter {
  constructor(config = {}) {
    super();

    this.id = randomUUID();
    this.name = 'MALAKH';
    this.hebrew = 'מלאך';
    this.meaning = 'Messenger/Angel';

    this.config = {
      defaultDelivery: config.defaultDelivery || DELIVERY_MODES.AT_LEAST_ONCE,
      defaultTTL: config.defaultTTL || 300000, // 5 minutes
      processInterval: config.processInterval || 10,
      maxConcurrent: config.maxConcurrent || 100,
      enableTracing: config.enableTracing !== false,
      ...config
    };

    // Core components
    this.exchanges = new Map();
    this.queues = new Map();
    this.subscriptions = new Map();
    this.circuitBreakers = new Map();
    this.transformer = new MessageTransformer();

    // State
    this.status = 'inactive';
    this.processTimer = null;
    this.startTime = null;
    this.messagesSent = 0;
    this.messagesDelivered = 0;
    this.pendingReplies = new Map();
    this.seenMessages = new Set(); // For deduplication
    this.traces = [];

    // Create default exchange
    this._createDefaultExchange();
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async initialize() {
    this.status = 'initializing';
    this.startTime = Date.now();

    this.emit('initializing', { timestamp: Date.now() });

    // Start message processor
    this._startProcessor();

    this.status = 'active';
    this.emit('ready', { timestamp: Date.now() });

    return { success: true, status: this.status };
  }

  async shutdown() {
    this.status = 'shutting_down';

    // Stop processor
    if (this.processTimer) {
      clearInterval(this.processTimer);
      this.processTimer = null;
    }

    // Clear queues
    for (const queue of this.queues.values()) {
      queue.clear();
    }

    this.status = 'inactive';
    this.emit('shutdown', { timestamp: Date.now() });

    return { success: true };
  }

  _createDefaultExchange() {
    this.createExchange('default', ROUTING_STRATEGIES.TOPIC);
    this.createExchange('direct', ROUTING_STRATEGIES.DIRECT);
    this.createExchange('fanout', ROUTING_STRATEGIES.FANOUT);
  }

  // ─── Exchange Management ───────────────────────────────────────────────────

  createExchange(name, type = ROUTING_STRATEGIES.TOPIC) {
    const exchange = new Exchange(name, type);
    this.exchanges.set(name, exchange);
    return exchange;
  }

  getExchange(name) {
    return this.exchanges.get(name);
  }

  // ─── Queue Management ──────────────────────────────────────────────────────

  createQueue(name, options = {}) {
    const queue = new MessageQueue(name, options);
    this.queues.set(name, queue);
    return queue;
  }

  getQueue(name) {
    return this.queues.get(name);
  }

  bindQueue(queueName, exchangeName, routingKey) {
    const queue = this.queues.get(queueName);
    const exchange = this.exchanges.get(exchangeName);

    if (!queue || !exchange) {
      throw new Error('Queue or exchange not found');
    }

    exchange.bind(routingKey, queue);
    return true;
  }

  // ─── Publishing ────────────────────────────────────────────────────────────

  publish(topic, payload, options = {}) {
    const message = new Message(
      options.type || MESSAGE_TYPES.EVENT,
      topic,
      payload,
      {
        source: options.source || this.name,
        ttl: options.ttl || this.config.defaultTTL,
        priority: options.priority,
        headers: options.headers,
        correlationId: options.correlationId,
        causationId: options.causationId
      }
    );

    return this._route(message, options.exchange || 'default');
  }

  command(topic, payload, options = {}) {
    return this.publish(topic, payload, {
      ...options,
      type: MESSAGE_TYPES.COMMAND
    });
  }

  broadcast(topic, payload, options = {}) {
    return this.publish(topic, payload, {
      ...options,
      type: MESSAGE_TYPES.BROADCAST,
      exchange: 'fanout'
    });
  }

  async request(topic, payload, options = {}) {
    const timeout = options.timeout || 30000;

    const message = new Message(
      MESSAGE_TYPES.QUERY,
      topic,
      payload,
      {
        source: options.source || this.name,
        ttl: timeout,
        headers: { ...options.headers, replyTo: this.id }
      }
    );

    return new Promise((resolve, reject) => {
      // Set up reply handler
      this.pendingReplies.set(message.id, {
        resolve,
        reject,
        timeout: setTimeout(() => {
          this.pendingReplies.delete(message.id);
          reject(new Error('Request timeout'));
        }, timeout)
      });

      // Send the request
      this._route(message, options.exchange || 'default');
    });
  }

  reply(originalMessage, payload) {
    const replyMessage = originalMessage.reply(payload);
    this._deliverReply(replyMessage);
  }

  _route(message, exchangeName) {
    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeName} not found`);
    }

    // Check for duplicates (exactly-once delivery)
    if (this.config.defaultDelivery === DELIVERY_MODES.EXACTLY_ONCE) {
      if (this.seenMessages.has(message.hash)) {
        return { duplicate: true, messageId: message.id };
      }
      this.seenMessages.add(message.hash);

      // Clean up old hashes
      if (this.seenMessages.size > 100000) {
        const toDelete = Array.from(this.seenMessages).slice(0, 50000);
        toDelete.forEach(h => this.seenMessages.delete(h));
      }
    }

    // Add trace context
    if (this.config.enableTracing) {
      const trace = new TraceContext();
      message.headers['x-trace-id'] = trace.traceId;
      message.headers['x-span-id'] = trace.spanId;
      this._recordTrace(message, trace);
    }

    const destinations = exchange.route(message);

    if (destinations.length === 0) {
      this.emit('message:unroutable', { message, exchange: exchangeName });
      return { routed: false, messageId: message.id };
    }

    // Enqueue to all destinations
    for (const queue of destinations) {
      queue.enqueue(message);
    }

    this.messagesSent++;
    this.emit('message:published', {
      messageId: message.id,
      topic: message.topic,
      destinations: destinations.length
    });

    return { routed: true, messageId: message.id, destinations: destinations.length };
  }

  _deliverReply(message) {
    const pending = this.pendingReplies.get(message.correlationId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingReplies.delete(message.correlationId);
      pending.resolve(message.payload);
    }
  }

  // ─── Subscribing ───────────────────────────────────────────────────────────

  subscribe(topic, handler, options = {}) {
    const subscription = new Subscription(topic, handler, options);
    this.subscriptions.set(subscription.id, subscription);

    // Create queue for subscription if not exists
    const queueName = options.queue || `sub.${subscription.id}`;
    if (!this.queues.has(queueName)) {
      this.createQueue(queueName);
    }

    // Bind to exchange
    const exchangeName = options.exchange || 'default';
    this.bindQueue(queueName, exchangeName, topic);

    // Link subscription to queue
    subscription.queue = this.queues.get(queueName);

    this.emit('subscription:created', {
      subscriptionId: subscription.id,
      topic
    });

    return subscription.id;
  }

  unsubscribe(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.pause();
      this.subscriptions.delete(subscriptionId);

      this.emit('subscription:removed', { subscriptionId });
      return true;
    }
    return false;
  }

  // ─── Message Processing ────────────────────────────────────────────────────

  _startProcessor() {
    this.processTimer = setInterval(() => {
      this._processMessages();
    }, this.config.processInterval);
  }

  async _processMessages() {
    let processed = 0;

    for (const [subId, subscription] of this.subscriptions) {
      if (!subscription.canProcess()) continue;

      // Find matching messages in the subscription's queue
      const queue = subscription.queue;
      if (!queue) continue;

      const message = queue.dequeue();
      if (!message) continue;

      if (!subscription.matches(message.topic)) {
        queue.enqueue(message);
        continue;
      }

      if (!subscription.passesFilter(message)) {
        queue.ack(message.id);
        continue;
      }

      // Process with circuit breaker
      const breakerName = `sub.${subId}`;
      let breaker = this.circuitBreakers.get(breakerName);
      if (!breaker) {
        breaker = new CircuitBreaker(breakerName);
        this.circuitBreakers.set(breakerName, breaker);
      }

      try {
        await breaker.execute(async () => {
          await subscription.process(message);
        });

        queue.ack(message.id);
        this.messagesDelivered++;

        this.emit('message:delivered', {
          messageId: message.id,
          subscriptionId: subId
        });
      } catch (error) {
        queue.nack(message.id, error.message);

        this.emit('message:failed', {
          messageId: message.id,
          subscriptionId: subId,
          error: error.message
        });
      }

      processed++;
      if (processed >= this.config.maxConcurrent) break;
    }
  }

  // ─── Circuit Breaker ───────────────────────────────────────────────────────

  getCircuitBreaker(name) {
    return this.circuitBreakers.get(name);
  }

  resetCircuitBreaker(name) {
    const breaker = this.circuitBreakers.get(name);
    if (breaker) {
      breaker.reset();
      return true;
    }
    return false;
  }

  // ─── Transformers ──────────────────────────────────────────────────────────

  registerTransformer(name, transformer) {
    this.transformer.register(name, transformer);
  }

  // ─── Tracing ───────────────────────────────────────────────────────────────

  _recordTrace(message, trace) {
    this.traces.push({
      messageId: message.id,
      topic: message.topic,
      trace: trace.toJSON(),
      timestamp: Date.now()
    });

    // Keep last 10000 traces
    if (this.traces.length > 10000) {
      this.traces = this.traces.slice(-10000);
    }
  }

  getTraces(traceId) {
    return this.traces.filter(t => t.trace.traceId === traceId);
  }

  // ─── Status & Metrics ──────────────────────────────────────────────────────

  getStatus() {
    return {
      id: this.id,
      name: this.name,
      hebrew: this.hebrew,
      status: this.status,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      exchanges: this.exchanges.size,
      queues: this.queues.size,
      subscriptions: this.subscriptions.size,
      circuitBreakers: this.circuitBreakers.size,
      messages: {
        sent: this.messagesSent,
        delivered: this.messagesDelivered,
        pending: Array.from(this.queues.values())
          .reduce((sum, q) => sum + q.queue.length, 0)
      }
    };
  }

  getQueueStats() {
    const stats = {};
    for (const [name, queue] of this.queues) {
      stats[name] = queue.getStats();
    }
    return stats;
  }

  getSubscriptionStats() {
    const stats = {};
    for (const [id, sub] of this.subscriptions) {
      stats[id] = sub.getStats();
    }
    return stats;
  }

  getCircuitBreakerStats() {
    const stats = {};
    for (const [name, breaker] of this.circuitBreakers) {
      stats[name] = breaker.getState();
    }
    return stats;
  }

  getDiagnostics() {
    return {
      status: this.getStatus(),
      queues: this.getQueueStats(),
      subscriptions: this.getSubscriptionStats(),
      circuitBreakers: this.getCircuitBreakerStats(),
      exchanges: Array.from(this.exchanges.values()).map(e => e.getStats()),
      recentTraces: this.traces.slice(-100)
    };
  }

  healthCheck() {
    const openBreakers = Array.from(this.circuitBreakers.values())
      .filter(b => b.state === 'open').length;

    return {
      healthy: this.status === 'active' && openBreakers === 0,
      status: this.status,
      openCircuitBreakers: openBreakers,
      pendingMessages: Array.from(this.queues.values())
        .reduce((sum, q) => sum + q.queue.length, 0)
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FACTORY & EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create and initialize MALAKH Message Bus
 */
export async function createMalakh(config = {}) {
  const malakh = new Malakh(config);
  await malakh.initialize();
  return malakh;
}

export default Malakh;
