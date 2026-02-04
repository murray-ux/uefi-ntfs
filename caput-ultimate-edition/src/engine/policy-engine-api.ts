// src/engine/policy-engine-api.ts
// Policy Decision Point (PDP) — Express server exposing POST /evaluate.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Evaluator, EvaluationInput, Decision } from "../core/evaluator";
import { getDoctrine } from "../core/doctrine";

const evaluator = new Evaluator(getDoctrine());

export interface PDPRequest {
  principalId: string;
  principalType: "human" | "agent" | "service";
  action: string;
  resource: string;
  tags: string[];
  context: Record<string, unknown>;
}

export interface PDPResponse {
  decision: Decision;
  effect: Decision["effect"];
}

export async function evaluatePolicy(req: PDPRequest): Promise<PDPResponse> {
  const input: EvaluationInput = {
    principalId: req.principalId,
    principalType: req.principalType,
    action: req.action,
    resource: req.resource,
    tags: req.tags,
    context: req.context,
  };

  const decision = await evaluator.evaluate(input);

  return {
    decision,
    effect: decision.effect,
  };
}

// Express wiring (uncomment when express is available):
//
// import express from "express";
// const app = express();
// app.use(express.json());
//
// app.post("/evaluate", async (req, res) => {
//   try {
//     const result = await evaluatePolicy(req.body);
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({ error: "policy evaluation failed" });
//   }
// });
//
// app.listen(8080, () => console.log("PDP listening on :8080"));
