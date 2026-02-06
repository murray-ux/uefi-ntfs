// ai/ai_orchestrator.ts
//
// AI Orchestrator — LLM-assisted workflows for legal drafting,
// evidence summarisation, and automation planning.
//
// Uses the OpenAI-compatible API shape (works with OpenAI, Azure OpenAI,
// or any compatible endpoint). The API key and base URL are injected
// via constructor or environment variables.
//
// IMPORTANT: AI outputs are drafts only — never final legal advice.
// All outputs must be reviewed by a qualified human before use.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { AuditService } from "../src/audit/audit-service";

// ---------------------------------------------------------------------------
// Types — minimal OpenAI-compatible interface (no hard dependency)
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletion {
  id: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

interface LLMClient {
  chat: {
    completions: {
      create(params: {
        model: string;
        messages: ChatMessage[];
        temperature?: number;
        max_tokens?: number;
      }): Promise<ChatCompletion>;
    };
  };
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface AiOrchestratorConfig {
  /** LLM client instance (OpenAI SDK or compatible). */
  llmClient: LLMClient;
  /** Model for complex tasks (legal drafting, evidence). Default: gpt-4o */
  primaryModel?: string;
  /** Model for lighter tasks (planning, summaries). Default: gpt-4o-mini */
  secondaryModel?: string;
  /** Optional audit service for logging AI interactions. */
  audit?: AuditService;
  /** Jurisdiction context (injected, not hardcoded). */
  jurisdiction?: string;
}

// ---------------------------------------------------------------------------
// AiOrchestrator
// ---------------------------------------------------------------------------

export class AiOrchestrator {
  private llm: LLMClient;
  private primaryModel: string;
  private secondaryModel: string;
  private audit?: AuditService;
  private jurisdiction: string;

  constructor(config: AiOrchestratorConfig) {
    this.llm = config.llmClient;
    this.primaryModel = config.primaryModel || "gpt-4o";
    this.secondaryModel = config.secondaryModel || "gpt-4o-mini";
    this.audit = config.audit;
    this.jurisdiction = config.jurisdiction || process.env.GENESIS_JURISDICTION || "general";
  }

  // -----------------------------------------------------------------------
  // 1. Legal Drafting Assistant
  // -----------------------------------------------------------------------

  /**
   * Draft a legal document based on a prompt and context.
   *
   * AI acts as assistant/collaborator only — output is a DRAFT
   * that must be reviewed by a qualified legal professional.
   */
  async draftLegalDoc(
    prompt: string,
    context: Record<string, unknown>
  ): Promise<{ draft: string; model: string; disclaimer: string }> {
    const system = `You are a legal drafting assistant for the ${this.jurisdiction} jurisdiction.
You help prepare drafts ONLY — you do not provide final legal advice.
You must:
- Respect applicable court practice directions and evidence rules.
- Never invent case citations. Never state something is law unless confirmed by the user.
- Flag any assumptions you make.
- Include a disclaimer that this is an AI-generated draft requiring professional review.
Return clean Markdown.`;

    const user = `Context:\n${JSON.stringify(context, null, 2)}\n\nTask:\n${prompt}`;

    const result = await this._complete(this.primaryModel, system, user);

    await this._audit("LEGAL_DRAFT", { promptLength: prompt.length, model: this.primaryModel });

    const disclaimer =
      "AI-GENERATED DRAFT — This document was produced by an AI assistant " +
      "and must be reviewed by a qualified legal professional before any use. " +
      "It does not constitute legal advice.";

    return { draft: result, model: this.primaryModel, disclaimer };
  }

  // -----------------------------------------------------------------------
  // 2. Evidence Summariser
  // -----------------------------------------------------------------------

  /**
   * Summarise an evidence bundle into neutral bullet points.
   *
   * Output is factual and neutral — no opinion, no legal advice.
   */
  async summariseEvidence(
    bundle: Record<string, unknown> | unknown[]
  ): Promise<{ summary: string; model: string }> {
    const system = `You are a legal evidence summariser for the ${this.jurisdiction} jurisdiction.
Summarise the evidence bundle neutrally in 5-10 bullet points.
Rules:
- State facts only. No opinion, no inference, no legal advice.
- Note any gaps or inconsistencies in the evidence.
- Use plain language accessible to non-lawyers.`;

    const user = `Evidence bundle:\n${JSON.stringify(bundle, null, 2)}`;

    const result = await this._complete(this.primaryModel, system, user);

    await this._audit("EVIDENCE_SUMMARY", { bundleSize: JSON.stringify(bundle).length, model: this.primaryModel });

    return { summary: result, model: this.primaryModel };
  }

  // -----------------------------------------------------------------------
  // 3. Automation Planner
  // -----------------------------------------------------------------------

  /**
   * Plan an automation or infrastructure change.
   *
   * Outputs: risk assessment, step-by-step plan, rollback steps.
   */
  async planAutomationChange(
    request: string
  ): Promise<{ plan: string; model: string }> {
    const system = `You are a senior DevSecOps/SDLC architect for the GENESIS 2.0 stack.
For each change request, output:
1. A short risk assessment (what could go wrong).
2. A concrete step-by-step implementation plan.
3. Rollback steps if the change fails.
4. Any security implications.
Be concise and actionable.`;

    const result = await this._complete(this.secondaryModel, system, request);

    await this._audit("AUTOMATION_PLAN", { requestLength: request.length, model: this.secondaryModel });

    return { plan: result, model: this.secondaryModel };
  }

  // -----------------------------------------------------------------------
  // 4. General Query (catch-all)
  // -----------------------------------------------------------------------

  /**
   * General-purpose LLM query with a custom system prompt.
   */
  async query(
    systemPrompt: string,
    userMessage: string,
    options?: { model?: string; temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const model = options?.model || this.secondaryModel;

    const completion = await this.llm.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
    });

    return completion.choices[0]?.message?.content || "";
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private async _complete(model: string, system: string, user: string): Promise<string> {
    const completion = await this.llm.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    return completion.choices[0]?.message?.content || "";
  }

  private async _audit(eventType: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.audit) return;
    try {
      await this.audit.writeAgentAction({
        agentId: "ai-orchestrator",
        actionName: eventType,
        targetType: "llm",
        targetId: this.primaryModel,
        actorId: "ai-orchestrator",
        actorType: "service",
        source: "ai/ai_orchestrator.ts",
      });
    } catch {
      // Audit failure must not break the workflow
    }
  }
}
