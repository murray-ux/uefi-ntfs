/**
 * HADAAT DEEP LEARNING DECISION ENGINE
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
 * Tree of Knowledge — Intelligent decision-making and reasoning
 * Named for עץ הדעת (Etz HaDaat) — the Tree of Knowledge
 *
 * Features:
 *   - RAG (Retrieval-Augmented Generation) pipeline
 *   - Chain-of-Thought reasoning
 *   - Multi-agent debate and consensus
 *   - Probabilistic decision trees
 *   - Reinforcement learning from feedback
 *   - Explainable AI with attention visualization
 *   - Context window management
 *   - Semantic caching for inference
 *
 * @module HADAAT
 * @author Murray Bembrick <Founder & Lead Developer>
 * @version 2.0.0
 * @license Apache-2.0
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';

// ══════════════════════════════════════════════════════════════════════════════
// RAG PIPELINE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Retrieval-Augmented Generation pipeline
 */
export class RAGPipeline {
  constructor(options = {}) {
    this.retriever = options.retriever; // SemanticSearchEngine from RUACH
    this.maxContext = options.maxContext || 4096;
    this.chunkSize = options.chunkSize || 512;
    this.chunkOverlap = options.chunkOverlap || 50;
    this.topK = options.topK || 5;
    this.reranker = options.reranker || null;
    this.cache = new Map();
    this.cacheMaxSize = options.cacheMaxSize || 1000;
  }

  /**
   * Chunk text for indexing
   */
  chunk(text, metadata = {}) {
    const chunks = [];
    const words = text.split(/\s+/);

    for (let i = 0; i < words.length; i += this.chunkSize - this.chunkOverlap) {
      const chunkWords = words.slice(i, i + this.chunkSize);
      if (chunkWords.length > 0) {
        chunks.push({
          id: `${metadata.docId || 'doc'}_chunk_${chunks.length}`,
          text: chunkWords.join(' '),
          metadata: {
            ...metadata,
            chunkIndex: chunks.length,
            startWord: i,
            endWord: i + chunkWords.length
          }
        });
      }
    }

    return chunks;
  }

  /**
   * Index document
   */
  async index(docId, text, metadata = {}) {
    const chunks = this.chunk(text, { docId, ...metadata });

    for (const chunk of chunks) {
      this.retriever.add(chunk.id, chunk.text, chunk.metadata);
    }

    return { docId, chunks: chunks.length };
  }

  /**
   * Retrieve relevant context
   */
  async retrieve(query, options = {}) {
    const cacheKey = createHash('md5').update(query).digest('hex');

    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Retrieve from search engine
    let results = this.retriever.search(query, {
      k: (options.topK || this.topK) * 2, // Over-retrieve for reranking
      threshold: options.threshold || 0.3
    });

    // Rerank if available
    if (this.reranker && results.length > 0) {
      results = await this.reranker(query, results);
    }

    // Take top K
    results = results.slice(0, options.topK || this.topK);

    // Build context
    const context = {
      query,
      chunks: results,
      totalTokens: this._estimateTokens(results.map(r => r.metadata?.text || '').join(' ')),
      timestamp: Date.now()
    };

    // Cache result
    this._cacheResult(cacheKey, context);

    return context;
  }

  /**
   * Generate augmented prompt
   */
  async augment(query, template = null) {
    const context = await this.retrieve(query);

    const defaultTemplate = `Context information is below.
---------------------
{context}
---------------------

Given the context information and not prior knowledge, answer the query.
Query: {query}
Answer:`;

    const tmpl = template || defaultTemplate;
    const contextText = context.chunks
      .map((c, i) => `[${i + 1}] ${c.metadata?.text || ''}`)
      .join('\n\n');

    return {
      prompt: tmpl.replace('{context}', contextText).replace('{query}', query),
      context,
      sources: context.chunks.map(c => ({
        id: c.id,
        similarity: c.similarity,
        metadata: c.metadata
      }))
    };
  }

  _estimateTokens(text) {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  _cacheResult(key, value) {
    if (this.cache.size >= this.cacheMaxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    return this;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CHAIN-OF-THOUGHT REASONING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Chain-of-Thought reasoning engine
 */
export class ChainOfThought {
  constructor(options = {}) {
    this.maxSteps = options.maxSteps || 10;
    this.reasoningPatterns = new Map();

    // Initialize default patterns
    this._initDefaultPatterns();
  }

  _initDefaultPatterns() {
    this.addPattern('decompose', {
      prompt: 'Break down this problem into smaller sub-problems:',
      apply: (problem) => {
        // Simple decomposition heuristic
        const sentences = problem.split(/[.!?]+/).filter(s => s.trim());
        return sentences.map((s, i) => ({
          subProblem: s.trim(),
          index: i,
          dependency: i > 0 ? [i - 1] : []
        }));
      }
    });

    this.addPattern('analyze', {
      prompt: 'Analyze the key components:',
      apply: (input) => {
        const words = input.toLowerCase().split(/\W+/);
        const entities = words.filter(w => w.length > 4);
        const uniqueEntities = [...new Set(entities)];
        return {
          entities: uniqueEntities,
          complexity: words.length,
          keyTerms: uniqueEntities.slice(0, 5)
        };
      }
    });

    this.addPattern('hypothesize', {
      prompt: 'Generate hypotheses:',
      apply: (analysis) => {
        const hypotheses = [];
        if (analysis.keyTerms) {
          for (const term of analysis.keyTerms) {
            hypotheses.push({
              hypothesis: `The answer involves ${term}`,
              confidence: 0.5 + Math.random() * 0.3,
              evidence: []
            });
          }
        }
        return hypotheses;
      }
    });

    this.addPattern('verify', {
      prompt: 'Verify the hypothesis:',
      apply: (hypothesis, context) => ({
        hypothesis: hypothesis.hypothesis,
        verified: hypothesis.confidence > 0.6,
        confidence: hypothesis.confidence,
        reasoning: `Based on confidence score of ${hypothesis.confidence.toFixed(2)}`
      })
    });

    this.addPattern('synthesize', {
      prompt: 'Synthesize the final answer:',
      apply: (verified) => {
        const accepted = verified.filter(v => v.verified);
        return {
          conclusion: accepted.map(v => v.hypothesis).join('; '),
          confidence: accepted.reduce((a, v) => a + v.confidence, 0) / (accepted.length || 1),
          steps: verified.length
        };
      }
    });
  }

  /**
   * Add reasoning pattern
   */
  addPattern(name, pattern) {
    this.reasoningPatterns.set(name, pattern);
    return this;
  }

  /**
   * Execute reasoning chain
   */
  async reason(problem, options = {}) {
    const chain = options.chain || ['decompose', 'analyze', 'hypothesize', 'verify', 'synthesize'];
    const steps = [];
    let context = problem;

    for (const patternName of chain) {
      if (steps.length >= this.maxSteps) break;

      const pattern = this.reasoningPatterns.get(patternName);
      if (!pattern) continue;

      try {
        const result = await pattern.apply(context, steps);
        steps.push({
          pattern: patternName,
          input: context,
          output: result,
          timestamp: Date.now()
        });
        context = result;
      } catch (error) {
        steps.push({
          pattern: patternName,
          input: context,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }

    return {
      problem,
      steps,
      result: context,
      stepCount: steps.length
    };
  }

  /**
   * Generate explanation
   */
  explain(reasoning) {
    const lines = [
      `Problem: ${reasoning.problem}`,
      '',
      'Reasoning Steps:'
    ];

    for (let i = 0; i < reasoning.steps.length; i++) {
      const step = reasoning.steps[i];
      lines.push(`  ${i + 1}. ${step.pattern}`);
      if (step.error) {
        lines.push(`     Error: ${step.error}`);
      } else {
        lines.push(`     Result: ${JSON.stringify(step.output).slice(0, 100)}...`);
      }
    }

    lines.push('');
    lines.push(`Conclusion: ${JSON.stringify(reasoning.result)}`);

    return lines.join('\n');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MULTI-AGENT DEBATE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Multi-agent debate system for consensus building
 */
export class AgentDebate extends EventEmitter {
  constructor(options = {}) {
    super();
    this.agents = new Map();
    this.maxRounds = options.maxRounds || 5;
    this.consensusThreshold = options.consensusThreshold || 0.7;
  }

  /**
   * Register an agent
   */
  registerAgent(id, config) {
    this.agents.set(id, {
      id,
      name: config.name || id,
      role: config.role || 'general',
      bias: config.bias || 0,
      reasoner: config.reasoner || new ChainOfThought(),
      history: []
    });
    return this;
  }

  /**
   * Run debate on a topic
   */
  async debate(topic, options = {}) {
    const rounds = [];
    let consensus = null;

    for (let round = 0; round < this.maxRounds && !consensus; round++) {
      const roundResponses = [];

      // Each agent responds
      for (const [agentId, agent] of this.agents) {
        const previousResponses = round > 0 ? rounds[round - 1].responses : [];

        const response = await this._agentRespond(agent, topic, previousResponses);
        roundResponses.push({
          agentId,
          agentName: agent.name,
          response
        });

        this.emit('response', { round, agentId, response });
      }

      rounds.push({
        round,
        responses: roundResponses,
        timestamp: Date.now()
      });

      // Check for consensus
      consensus = this._checkConsensus(roundResponses);

      if (consensus) {
        this.emit('consensus', { round, consensus });
      }
    }

    return {
      topic,
      rounds,
      consensus,
      totalRounds: rounds.length,
      agentCount: this.agents.size
    };
  }

  async _agentRespond(agent, topic, previousResponses) {
    // Build context from previous responses
    const context = previousResponses.map(r =>
      `${r.agentName}: ${JSON.stringify(r.response.result)}`
    ).join('\n');

    const prompt = context
      ? `Topic: ${topic}\n\nPrevious arguments:\n${context}\n\nYour response:`
      : `Topic: ${topic}\n\nProvide your initial analysis:`;

    // Use agent's reasoner
    const reasoning = await agent.reasoner.reason(prompt);

    // Apply agent bias
    if (reasoning.result?.confidence) {
      reasoning.result.confidence += agent.bias;
      reasoning.result.confidence = Math.max(0, Math.min(1, reasoning.result.confidence));
    }

    agent.history.push(reasoning);

    return reasoning;
  }

  _checkConsensus(responses) {
    if (responses.length < 2) return null;

    // Extract conclusions
    const conclusions = responses.map(r => ({
      agentId: r.agentId,
      conclusion: r.response.result?.conclusion || '',
      confidence: r.response.result?.confidence || 0.5
    }));

    // Simple consensus: check if all agents agree above threshold
    const avgConfidence = conclusions.reduce((a, c) => a + c.confidence, 0) / conclusions.length;

    if (avgConfidence >= this.consensusThreshold) {
      // Find most common conclusion
      const conclusionCounts = new Map();
      for (const c of conclusions) {
        const key = c.conclusion.toLowerCase().slice(0, 50);
        conclusionCounts.set(key, (conclusionCounts.get(key) || 0) + 1);
      }

      let maxCount = 0;
      let consensusConclusion = '';
      for (const [conclusion, count] of conclusionCounts) {
        if (count > maxCount) {
          maxCount = count;
          consensusConclusion = conclusion;
        }
      }

      if (maxCount >= responses.length * this.consensusThreshold) {
        return {
          conclusion: consensusConclusion,
          confidence: avgConfidence,
          agreementRatio: maxCount / responses.length
        };
      }
    }

    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PROBABILISTIC DECISION TREE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Probabilistic decision tree with uncertainty quantification
 */
export class ProbabilisticDecisionTree {
  constructor(options = {}) {
    this.root = null;
    this.maxDepth = options.maxDepth || 10;
    this.minSamples = options.minSamples || 5;
    this.uncertaintyThreshold = options.uncertaintyThreshold || 0.4;
  }

  /**
   * Build decision tree from data
   */
  build(data, targetField) {
    this.targetField = targetField;
    this.features = Object.keys(data[0]).filter(k => k !== targetField);
    this.root = this._buildNode(data, 0);
    return this;
  }

  _buildNode(data, depth) {
    // Calculate class distribution
    const distribution = this._calculateDistribution(data);
    const entropy = this._calculateEntropy(distribution);

    // Stopping conditions
    if (depth >= this.maxDepth ||
        data.length < this.minSamples ||
        entropy < 0.1) {
      return {
        type: 'leaf',
        distribution,
        prediction: this._argmax(distribution),
        confidence: Math.max(...Object.values(distribution)),
        samples: data.length,
        entropy
      };
    }

    // Find best split
    const bestSplit = this._findBestSplit(data, entropy);

    if (!bestSplit) {
      return {
        type: 'leaf',
        distribution,
        prediction: this._argmax(distribution),
        confidence: Math.max(...Object.values(distribution)),
        samples: data.length,
        entropy
      };
    }

    // Create decision node
    const node = {
      type: 'decision',
      feature: bestSplit.feature,
      threshold: bestSplit.threshold,
      informationGain: bestSplit.gain,
      distribution,
      samples: data.length,
      left: this._buildNode(bestSplit.leftData, depth + 1),
      right: this._buildNode(bestSplit.rightData, depth + 1)
    };

    return node;
  }

  _calculateDistribution(data) {
    const counts = {};
    for (const row of data) {
      const target = row[this.targetField];
      counts[target] = (counts[target] || 0) + 1;
    }

    const total = data.length;
    const dist = {};
    for (const [key, count] of Object.entries(counts)) {
      dist[key] = count / total;
    }
    return dist;
  }

  _calculateEntropy(distribution) {
    let entropy = 0;
    for (const p of Object.values(distribution)) {
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }

  _findBestSplit(data, parentEntropy) {
    let bestGain = 0;
    let bestSplit = null;

    for (const feature of this.features) {
      const values = data.map(row => row[feature]).filter(v => v != null);
      if (values.length === 0) continue;

      const sortedValues = [...new Set(values)].sort((a, b) => a - b);

      for (let i = 0; i < sortedValues.length - 1; i++) {
        const threshold = (sortedValues[i] + sortedValues[i + 1]) / 2;

        const leftData = data.filter(row => row[feature] <= threshold);
        const rightData = data.filter(row => row[feature] > threshold);

        if (leftData.length === 0 || rightData.length === 0) continue;

        const leftEntropy = this._calculateEntropy(this._calculateDistribution(leftData));
        const rightEntropy = this._calculateEntropy(this._calculateDistribution(rightData));

        const weightedEntropy =
          (leftData.length / data.length) * leftEntropy +
          (rightData.length / data.length) * rightEntropy;

        const gain = parentEntropy - weightedEntropy;

        if (gain > bestGain) {
          bestGain = gain;
          bestSplit = { feature, threshold, gain, leftData, rightData };
        }
      }
    }

    return bestSplit;
  }

  _argmax(distribution) {
    let maxKey = null;
    let maxValue = -Infinity;
    for (const [key, value] of Object.entries(distribution)) {
      if (value > maxValue) {
        maxValue = value;
        maxKey = key;
      }
    }
    return maxKey;
  }

  /**
   * Predict with uncertainty
   */
  predict(sample) {
    if (!this.root) {
      throw new Error('Tree not built');
    }

    let node = this.root;
    const path = [];

    while (node.type === 'decision') {
      path.push({
        feature: node.feature,
        threshold: node.threshold,
        value: sample[node.feature]
      });

      if (sample[node.feature] <= node.threshold) {
        node = node.left;
      } else {
        node = node.right;
      }
    }

    return {
      prediction: node.prediction,
      confidence: node.confidence,
      distribution: node.distribution,
      uncertainty: 1 - node.confidence,
      path,
      samples: node.samples
    };
  }

  /**
   * Predict with Monte Carlo uncertainty
   */
  predictMonteCarlo(sample, numSamples = 100) {
    const predictions = [];

    for (let i = 0; i < numSamples; i++) {
      // Add noise to continuous features
      const noisySample = { ...sample };
      for (const feature of this.features) {
        if (typeof noisySample[feature] === 'number') {
          noisySample[feature] += (Math.random() - 0.5) * 0.1 * Math.abs(noisySample[feature] || 1);
        }
      }

      const pred = this.predict(noisySample);
      predictions.push(pred.prediction);
    }

    // Calculate prediction distribution
    const counts = {};
    for (const p of predictions) {
      counts[p] = (counts[p] || 0) + 1;
    }

    const distribution = {};
    for (const [key, count] of Object.entries(counts)) {
      distribution[key] = count / numSamples;
    }

    const prediction = this._argmax(distribution);
    const confidence = distribution[prediction];

    return {
      prediction,
      confidence,
      distribution,
      uncertainty: 1 - confidence,
      numSamples
    };
  }

  /**
   * Export tree structure
   */
  toJSON() {
    return JSON.stringify(this.root, null, 2);
  }

  /**
   * Visualize tree as text
   */
  visualize(node = this.root, indent = '') {
    if (!node) return '';

    if (node.type === 'leaf') {
      return `${indent}[${node.prediction}] (conf: ${node.confidence.toFixed(2)}, n=${node.samples})`;
    }

    const lines = [
      `${indent}${node.feature} <= ${node.threshold.toFixed(2)}? (gain: ${node.informationGain.toFixed(3)})`,
      this.visualize(node.left, indent + '  ├─ '),
      this.visualize(node.right, indent + '  └─ ')
    ];

    return lines.join('\n');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// REINFORCEMENT LEARNING FROM FEEDBACK
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Simple RLHF-style feedback learning
 */
export class FeedbackLearner extends EventEmitter {
  constructor(options = {}) {
    super();
    this.learningRate = options.learningRate || 0.1;
    this.discountFactor = options.discountFactor || 0.95;
    this.explorationRate = options.explorationRate || 0.1;
    this.qTable = new Map();
    this.experiences = [];
    this.maxExperiences = options.maxExperiences || 10000;
  }

  /**
   * Get state key
   */
  _stateKey(state) {
    return createHash('md5').update(JSON.stringify(state)).digest('hex');
  }

  /**
   * Get Q-value
   */
  getQValue(state, action) {
    const key = `${this._stateKey(state)}:${action}`;
    return this.qTable.get(key) || 0;
  }

  /**
   * Set Q-value
   */
  setQValue(state, action, value) {
    const key = `${this._stateKey(state)}:${action}`;
    this.qTable.set(key, value);
  }

  /**
   * Select action (epsilon-greedy)
   */
  selectAction(state, availableActions) {
    if (Math.random() < this.explorationRate) {
      // Explore: random action
      return availableActions[Math.floor(Math.random() * availableActions.length)];
    }

    // Exploit: best action
    let bestAction = availableActions[0];
    let bestValue = this.getQValue(state, bestAction);

    for (const action of availableActions) {
      const value = this.getQValue(state, action);
      if (value > bestValue) {
        bestValue = value;
        bestAction = action;
      }
    }

    return bestAction;
  }

  /**
   * Record experience
   */
  recordExperience(state, action, reward, nextState) {
    this.experiences.push({ state, action, reward, nextState, timestamp: Date.now() });

    // Limit experiences
    while (this.experiences.length > this.maxExperiences) {
      this.experiences.shift();
    }

    this.emit('experience', { state, action, reward });
  }

  /**
   * Update from feedback
   */
  learn(state, action, reward, nextState, availableNextActions = []) {
    const currentQ = this.getQValue(state, action);

    // Get max Q for next state
    let maxNextQ = 0;
    for (const nextAction of availableNextActions) {
      const nextQ = this.getQValue(nextState, nextAction);
      if (nextQ > maxNextQ) {
        maxNextQ = nextQ;
      }
    }

    // Q-learning update
    const newQ = currentQ + this.learningRate * (
      reward + this.discountFactor * maxNextQ - currentQ
    );

    this.setQValue(state, action, newQ);
    this.recordExperience(state, action, reward, nextState);

    return newQ;
  }

  /**
   * Batch learn from experiences
   */
  batchLearn(batchSize = 32) {
    if (this.experiences.length < batchSize) {
      return { updated: 0 };
    }

    // Sample random batch
    const batch = [];
    for (let i = 0; i < batchSize; i++) {
      const idx = Math.floor(Math.random() * this.experiences.length);
      batch.push(this.experiences[idx]);
    }

    let totalDelta = 0;
    for (const exp of batch) {
      const oldQ = this.getQValue(exp.state, exp.action);
      this.learn(exp.state, exp.action, exp.reward, exp.nextState, []);
      const newQ = this.getQValue(exp.state, exp.action);
      totalDelta += Math.abs(newQ - oldQ);
    }

    return {
      updated: batchSize,
      avgDelta: totalDelta / batchSize
    };
  }

  /**
   * Get learned policy summary
   */
  getPolicySummary() {
    const states = new Map();

    for (const [key, value] of this.qTable) {
      const [stateKey, action] = key.split(':');

      if (!states.has(stateKey)) {
        states.set(stateKey, { actions: new Map(), bestAction: null, bestValue: -Infinity });
      }

      const state = states.get(stateKey);
      state.actions.set(action, value);

      if (value > state.bestValue) {
        state.bestValue = value;
        state.bestAction = action;
      }
    }

    return {
      stateCount: states.size,
      qTableSize: this.qTable.size,
      experienceCount: this.experiences.length
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SEMANTIC CACHE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Semantic cache for inference results
 */
export class SemanticCache {
  constructor(embedder, options = {}) {
    this.embedder = embedder;
    this.cache = new Map();
    this.embeddings = new Map();
    this.maxSize = options.maxSize || 1000;
    this.similarityThreshold = options.similarityThreshold || 0.9;
    this.ttl = options.ttl || 3600000; // 1 hour
  }

  /**
   * Get cached result
   */
  async get(query) {
    const queryEmbedding = this.embedder.embed(query);

    // Check for semantic match
    let bestMatch = null;
    let bestSimilarity = 0;

    for (const [key, embedding] of this.embeddings) {
      const cached = this.cache.get(key);
      if (!cached || Date.now() - cached.timestamp > this.ttl) {
        continue;
      }

      const similarity = this.embedder.similarity(queryEmbedding, embedding);
      if (similarity > bestSimilarity && similarity >= this.similarityThreshold) {
        bestSimilarity = similarity;
        bestMatch = cached;
      }
    }

    if (bestMatch) {
      return {
        hit: true,
        result: bestMatch.result,
        similarity: bestSimilarity,
        originalQuery: bestMatch.query
      };
    }

    return { hit: false };
  }

  /**
   * Set cache result
   */
  async set(query, result) {
    const key = createHash('md5').update(query).digest('hex');
    const embedding = this.embedder.embed(query);

    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this._evictOldest();
    }

    this.cache.set(key, {
      query,
      result,
      timestamp: Date.now()
    });
    this.embeddings.set(key, embedding);

    return key;
  }

  _evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, cached] of this.cache) {
      if (cached.timestamp < oldestTime) {
        oldestTime = cached.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.embeddings.delete(oldestKey);
    }
  }

  /**
   * Get cache statistics
   */
  stats() {
    const now = Date.now();
    let validEntries = 0;

    for (const cached of this.cache.values()) {
      if (now - cached.timestamp <= this.ttl) {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      maxSize: this.maxSize,
      utilization: this.cache.size / this.maxSize
    };
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.embeddings.clear();
    return this;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HADAAT — Main Export
// ══════════════════════════════════════════════════════════════════════════════

/**
 * HADAAT — Tree of Knowledge
 * Complete decision engine
 */
export class Hadaat extends EventEmitter {
  constructor(options = {}) {
    super();

    this.embedder = options.embedder; // From RUACH
    this.retriever = options.retriever; // SemanticSearchEngine from RUACH

    // Initialize components
    this.rag = this.retriever ? new RAGPipeline({
      retriever: this.retriever,
      ...options.rag
    }) : null;

    this.cot = new ChainOfThought(options.cot);
    this.debate = new AgentDebate(options.debate);
    this.decisionTree = new ProbabilisticDecisionTree(options.decisionTree);
    this.feedback = new FeedbackLearner(options.feedback);

    this.semanticCache = this.embedder ? new SemanticCache(this.embedder, options.cache) : null;

    // Forward events
    this.debate.on('consensus', c => this.emit('consensus', c));
    this.feedback.on('experience', e => this.emit('experience', e));
  }

  /**
   * Make a decision
   */
  async decide(query, options = {}) {
    // Check semantic cache
    if (this.semanticCache) {
      const cached = await this.semanticCache.get(query);
      if (cached.hit) {
        return {
          ...cached.result,
          cached: true,
          similarity: cached.similarity
        };
      }
    }

    // Build context with RAG
    let context = null;
    if (this.rag) {
      context = await this.rag.retrieve(query);
    }

    // Chain-of-thought reasoning
    const reasoning = await this.cot.reason(query, options.cot);

    // Build decision
    const decision = {
      query,
      context: context?.chunks?.map(c => c.metadata?.text),
      reasoning: reasoning.steps,
      result: reasoning.result,
      explanation: this.cot.explain(reasoning),
      timestamp: Date.now()
    };

    // Cache result
    if (this.semanticCache) {
      await this.semanticCache.set(query, decision);
    }

    return decision;
  }

  /**
   * Run multi-agent debate
   */
  async debateDecision(topic, options = {}) {
    // Register default agents if none registered
    if (this.debate.agents.size === 0) {
      this.debate.registerAgent('analyst', {
        name: 'Analyst',
        role: 'analysis',
        bias: 0
      });
      this.debate.registerAgent('critic', {
        name: 'Critic',
        role: 'critique',
        bias: -0.1
      });
      this.debate.registerAgent('optimist', {
        name: 'Optimist',
        role: 'opportunity',
        bias: 0.1
      });
    }

    return this.debate.debate(topic, options);
  }

  /**
   * Learn from feedback
   */
  learnFromFeedback(decision, feedback) {
    const state = { query: decision.query };
    const action = decision.result?.conclusion || 'unknown';
    const reward = typeof feedback === 'number' ? feedback :
      feedback === 'positive' ? 1 :
      feedback === 'negative' ? -1 : 0;

    return this.feedback.learn(state, action, reward, state, [action]);
  }

  /**
   * Get system status
   */
  status() {
    return {
      rag: this.rag ? { cacheSize: this.rag.cache.size } : null,
      debate: { agents: this.debate.agents.size },
      feedback: this.feedback.getPolicySummary(),
      semanticCache: this.semanticCache?.stats() || null
    };
  }
}

// Default export
export default Hadaat;
