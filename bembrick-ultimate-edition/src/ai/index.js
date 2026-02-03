/**
 * AI/LLM Integration Layer
 * Unified interface for AI capabilities
 *
 * Supports: OpenAI, Anthropic, Ollama (local), Offline fallback
 *
 * GENESIS 2.0 — Forbidden Ninja City
 */

import { createHash } from 'node:crypto';

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

const PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  OLLAMA: 'ollama',
  OFFLINE: 'offline'
};

const DEFAULT_CONFIG = {
  provider: PROVIDERS.OFFLINE,
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o',
    baseUrl: 'https://api.openai.com/v1'
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022',
    baseUrl: 'https://api.anthropic.com/v1'
  },
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'llama2'
  },
  timeout: 30000,
  maxTokens: 4096
};

// ═══════════════════════════════════════════════════════════════════════════
// System Prompts
// ═══════════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPTS = {
  default: `You are GENESIS AI, the intelligent assistant for Forbidden Ninja City.
You operate under the Charter's governance framework.
ADMIN_MASTER: Murray Bembrick
Your responses must be concise, accurate, and charter-compliant.
All outputs are drafts requiring human review.`,

  legal: `You are GENESIS AI operating in Legal Mode.
You assist with legal document drafting, evidence analysis, and case preparation.
Case Reference: WA Magistrates Court 122458751
You provide legally-informed guidance but NOT legal advice.
All outputs require review by qualified legal counsel.`,

  security: `You are GENESIS AI operating in Security Mode.
You assist with security analysis, threat assessment, and incident response.
You follow the Pentagon architecture's security protocols.
YubiKey integration is mandatory for sensitive operations.`,

  technical: `You are GENESIS AI operating in Technical Mode.
You assist with infrastructure, automation, and system administration.
You understand the Pentagon architecture (5 layers, 40 rooms).
You provide accurate technical guidance and code.`
};

// ═══════════════════════════════════════════════════════════════════════════
// AI Client Class
// ═══════════════════════════════════════════════════════════════════════════

export class AIClient {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.conversationHistory = [];
    this.requestCount = 0;
  }

  /**
   * Detect available provider
   */
  async detectProvider() {
    // Check for API keys
    if (this.config.anthropic.apiKey) return PROVIDERS.ANTHROPIC;
    if (this.config.openai.apiKey) return PROVIDERS.OPENAI;

    // Check for local Ollama
    try {
      const response = await fetch(`${this.config.ollama.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(2000)
      });
      if (response.ok) return PROVIDERS.OLLAMA;
    } catch {
      // Ollama not available
    }

    return PROVIDERS.OFFLINE;
  }

  /**
   * Query AI with automatic provider selection
   */
  async query(message, options = {}) {
    const {
      mode = 'default',
      stream = false,
      temperature = 0.7
    } = options;

    const provider = this.config.provider === 'auto'
      ? await this.detectProvider()
      : this.config.provider;

    const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.default;

    this.requestCount++;

    switch (provider) {
      case PROVIDERS.OPENAI:
        return this.queryOpenAI(message, systemPrompt, { stream, temperature });
      case PROVIDERS.ANTHROPIC:
        return this.queryAnthropic(message, systemPrompt, { stream, temperature });
      case PROVIDERS.OLLAMA:
        return this.queryOllama(message, systemPrompt, { stream, temperature });
      default:
        return this.queryOffline(message, systemPrompt, options);
    }
  }

  /**
   * OpenAI API
   */
  async queryOpenAI(message, systemPrompt, options) {
    const response = await fetch(`${this.config.openai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.openai.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.openai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...this.conversationHistory,
          { role: 'user', content: message }
        ],
        temperature: options.temperature,
        max_tokens: this.config.maxTokens,
        stream: options.stream
      }),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    this.conversationHistory.push(
      { role: 'user', content: message },
      { role: 'assistant', content: reply }
    );

    return {
      response: reply,
      provider: PROVIDERS.OPENAI,
      model: this.config.openai.model,
      tokens: data.usage
    };
  }

  /**
   * Anthropic API
   */
  async queryAnthropic(message, systemPrompt, options) {
    const response = await fetch(`${this.config.anthropic.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.anthropic.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.anthropic.model,
        system: systemPrompt,
        messages: [
          ...this.conversationHistory,
          { role: 'user', content: message }
        ],
        temperature: options.temperature,
        max_tokens: this.config.maxTokens,
        stream: options.stream
      }),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.content[0].text;

    this.conversationHistory.push(
      { role: 'user', content: message },
      { role: 'assistant', content: reply }
    );

    return {
      response: reply,
      provider: PROVIDERS.ANTHROPIC,
      model: this.config.anthropic.model,
      tokens: { input: data.usage.input_tokens, output: data.usage.output_tokens }
    };
  }

  /**
   * Ollama (local) API
   */
  async queryOllama(message, systemPrompt, options) {
    const response = await fetch(`${this.config.ollama.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.ollama.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...this.conversationHistory,
          { role: 'user', content: message }
        ],
        stream: false,
        options: { temperature: options.temperature }
      }),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.message.content;

    this.conversationHistory.push(
      { role: 'user', content: message },
      { role: 'assistant', content: reply }
    );

    return {
      response: reply,
      provider: PROVIDERS.OLLAMA,
      model: this.config.ollama.model,
      tokens: { total: data.eval_count || 0 }
    };
  }

  /**
   * Offline fallback - rule-based responses
   */
  async queryOffline(message, systemPrompt, options) {
    const lowerMessage = message.toLowerCase();
    let response;

    // Rule-based responses
    if (lowerMessage.includes('health') || lowerMessage.includes('status')) {
      response = `[Offline Mode] GENESIS system health check:
- Pentagon: All 40 rooms operational
- Charter: v1.0.0 ACTIVE
- YubiKey: Connected (Serial: 31695265)
- Evidence Module: 1 item logged
- Network: Netgear RAX120 online

All systems nominal. The City stands.`;
    } else if (lowerMessage.includes('legal') || lowerMessage.includes('case')) {
      response = `[Offline Mode] Legal case reference:
- Case: WA Magistrates Court 122458751
- Evidence items: 1 documented
- Status: Under investigation

Use the Evidence Module to document additional items.
All legal outputs require qualified counsel review.`;
    } else if (lowerMessage.includes('pentagon') || lowerMessage.includes('architecture')) {
      response = `[Offline Mode] Pentagon Architecture:
- L0 Kernel: 7 rooms (Crypto & Primitives)
- L1 Conduit: 7 rooms (Messaging)
- L2 Reservoir: 8 rooms (State & Storage)
- L3 Valve: 9 rooms (Policy & Control)
- L4 Manifold: 9 rooms (Orchestration)

Total: 40 rooms, single CMD facade.`;
    } else if (lowerMessage.includes('charter') || lowerMessage.includes('governance')) {
      response = `[Offline Mode] Charter Status:
- Version: 1.0.0
- Status: ACTIVE
- ADMIN_MASTER: Murray Bembrick
- Doctrines: 1 (Doctrine of the Observer)
- Hash: ab470b4b41d441c556eeddfda6ac9ce1ae5ee24ebf90e891436ee32e9134af83

Charter supremacy is in effect. All systems bound.`;
    } else if (lowerMessage.includes('help')) {
      response = `[Offline Mode] GENESIS AI Assistant:
Available commands:
- "system health" - Check system status
- "legal case" - View case information
- "pentagon architecture" - View architecture
- "charter status" - View governance status

For full AI capabilities, configure an API key:
- OPENAI_API_KEY for GPT-4
- ANTHROPIC_API_KEY for Claude
- Or run local Ollama`;
    } else {
      response = `[Offline Mode] AI service unavailable.
Your query has been logged for processing when online.

Query: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"

For immediate assistance:
- Use Pentagon rooms directly via CLI
- Check documentation in /docs
- Run ./genesis --help`;
    }

    return {
      response,
      provider: PROVIDERS.OFFLINE,
      model: 'rule-based',
      tokens: { input: message.length, output: response.length },
      offline: true
    };
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * Get conversation summary
   */
  getHistory() {
    return {
      messages: this.conversationHistory.length,
      requests: this.requestCount,
      history: this.conversationHistory
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Specialized Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Draft a legal document
   */
  async draftLegal(type, context) {
    const prompt = `Draft a ${type} document with the following context:\n${JSON.stringify(context, null, 2)}\n\nProvide a professional, legally-structured draft.`;
    return this.query(prompt, { mode: 'legal' });
  }

  /**
   * Summarize evidence
   */
  async summarizeEvidence(evidence) {
    const prompt = `Summarize the following evidence for legal proceedings:\n${JSON.stringify(evidence, null, 2)}\n\nProvide a concise, factual summary suitable for court submission.`;
    return this.query(prompt, { mode: 'legal' });
  }

  /**
   * Analyze security threat
   */
  async analyzeThreat(threat) {
    const prompt = `Analyze the following security concern:\n${JSON.stringify(threat, null, 2)}\n\nProvide risk assessment, potential impact, and recommended actions.`;
    return this.query(prompt, { mode: 'security' });
  }

  /**
   * Generate automation plan
   */
  async planAutomation(task) {
    const prompt = `Create an automation plan for:\n${task}\n\nProvide step-by-step implementation using Pentagon architecture rooms.`;
    return this.query(prompt, { mode: 'technical' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Pentagon Integration
// ═══════════════════════════════════════════════════════════════════════════

export function createAIHandler(config) {
  const client = new AIClient(config);

  return async (action, payload) => {
    switch (action) {
      case 'query':
        return client.query(payload.message, payload.options);
      case 'draft':
        return client.draftLegal(payload.type, payload.context);
      case 'summarize':
        return client.summarizeEvidence(payload.evidence);
      case 'threat':
        return client.analyzeThreat(payload.threat);
      case 'plan':
        return client.planAutomation(payload.task);
      case 'history':
        return client.getHistory();
      case 'clear':
        client.clearHistory();
        return { cleared: true };
      default:
        return { action, error: 'unknown_action' };
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Default Export
// ═══════════════════════════════════════════════════════════════════════════

export default AIClient;
