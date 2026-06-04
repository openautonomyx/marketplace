import type { EvaluationDimensionId } from "./dimensions";

/** A single dimension's score, 0..100, with the weight applied for the context. */
export interface DimensionScore {
  dimension: EvaluationDimensionId;
  score: number;
  weight: number;
  rationale: string;
}

/**
 * The contextual evaluation of a skill. Because the score is always tied to a
 * contextId, the same skill yields different evaluations across deployments.
 */
export interface SkillEvaluation {
  skillId: string;
  contextId: string;
  scores: DimensionScore[];
  /** Weighted aggregate across all dimensions, 0..100. */
  weightedScore: number;
  evaluatedAt: string;
}
