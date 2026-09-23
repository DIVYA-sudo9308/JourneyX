import type { PipelineResult, PipelineSuccess } from "@/lib/pipeline/types";

/**
 * Wire shapes for ingestion responses. Snake_case matches the request schema,
 * so a producer sees the same vocabulary going out as coming in.
 */
export function presentResult(result: PipelineSuccess) {
  return {
    accepted: true,
    duplicate: result.duplicate,
    event_id: result.eventId,
    profile_id: result.customerId,
    resolution: {
      method: result.method,
      confidence: result.confidence,
      evidence: result.evidence.map((e) => ({
        signal: e.signal,
        matched: e.matched,
        contribution: e.contribution,
        description: e.description,
      })),
      identifiers_added: result.identifiersAdded.map((i) => ({
        type: i.type,
        link_method: i.linkMethod,
        link_confidence: i.linkConfidence,
      })),
      ambiguous: result.ambiguous,
      conflict: result.conflict,
    },
    patterns: result.patterns.map((p) => ({
      type: p.patternType,
      key: p.patternKey,
      description: p.description,
    })),
    churn_risk: result.churnRisk,
    pipeline: {
      stage_reached: result.stageReached,
      latency_ms: result.latencyMs,
      stage_timings_ms: result.stageTimings,
    },
  };
}

export function presentFailure(result: Extract<PipelineResult, { ok: false }>) {
  return {
    accepted: false,
    error: { code: result.code, message: result.message, details: result.details },
    pipeline: { stage_reached: result.stageReached, latency_ms: result.latencyMs },
  };
}
