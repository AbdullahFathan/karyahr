import { ValidationError } from "../../../shared/errors/app-error";
import type {
  GoalKeyResult,
  GoalLevel,
  PerformanceRecommendation,
} from "./entities/Performance";

const LEVEL_RANK: Record<GoalLevel, number> = {
  COMPANY: 0,
  DEPARTMENT: 1,
  EMPLOYEE: 2,
};

/**
 * Ensures a parent goal sits at a higher cascade level, or both are company goals.
 */
export function assertParentLevel(child: GoalLevel, parent: GoalLevel): void {
  if (parent === "COMPANY" && child === "COMPANY") {
    return;
  }
  if (LEVEL_RANK[parent] >= LEVEL_RANK[child]) {
    throw new ValidationError("Parent goal must be at a higher cascade level");
  }
}

/**
 * Ensures level-specific owner fields are present and unused fields stay empty.
 */
export function assertGoalOwnerFields(input: {
  readonly level: GoalLevel;
  readonly departmentId: string | null;
  readonly employeeId: string | null;
}): void {
  if (input.level === "COMPANY") {
    if (input.departmentId || input.employeeId) {
      throw new ValidationError("Company goals cannot target a department or employee");
    }
    return;
  }
  if (input.level === "DEPARTMENT") {
    if (!input.departmentId) {
      throw new ValidationError("Department goals require a department");
    }
    if (input.employeeId) {
      throw new ValidationError("Department goals cannot target an employee");
    }
    return;
  }
  if (!input.employeeId) {
    throw new ValidationError("Employee goals require an employee");
  }
}

/**
 * Ensures key-result weights sum to 100 when any key result exists.
 */
export function assertKeyResultWeights(
  keyResults: readonly { readonly weight: number; readonly targetValue: number }[],
): void {
  if (keyResults.length === 0) {
    return;
  }
  for (const item of keyResults) {
    if (item.weight < 0 || item.targetValue <= 0) {
      throw new ValidationError("Each key result needs a positive target and non-negative weight");
    }
  }
  const total = keyResults.reduce((sum, item) => sum + item.weight, 0);
  if (total !== 100) {
    throw new ValidationError("Key result weights must sum to 100");
  }
}

/**
 * Computes weighted progress percent from key results.
 */
export function computeProgressPercent(keyResults: readonly GoalKeyResult[]): number {
  if (keyResults.length === 0) {
    return 0;
  }
  const raw = keyResults.reduce((sum, item) => {
    const ratio = Math.min(item.currentValue / item.targetValue, 1);
    return sum + ratio * item.weight;
  }, 0);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * Maps an average review score to a career recommendation band.
 */
export function recommendationFromScore(score: number): PerformanceRecommendation {
  if (score >= 4.5) {
    return "PROMOTION";
  }
  if (score >= 3) {
    return "DEVELOPMENT";
  }
  return "PIP";
}

/**
 * Averages submitted rating scores.
 */
export function averageScore(scores: readonly number[]): number {
  if (scores.length === 0) {
    throw new ValidationError("Cannot average an empty score set");
  }
  const total = scores.reduce((sum, score) => sum + score, 0);
  return Math.round((total / scores.length) * 100) / 100;
}

/**
 * Buckets completed scores for a team dashboard.
 */
export function scoreBuckets(scores: readonly number[]): readonly {
  readonly label: string;
  readonly count: number;
}[] {
  const buckets = [
    { label: "1-2", count: 0 },
    { label: "2-3", count: 0 },
    { label: "3-4", count: 0 },
    { label: "4-5", count: 0 },
  ] as { label: string; count: number }[];
  for (const score of scores) {
    if (score < 2) {
      buckets[0]!.count += 1;
    } else if (score < 3) {
      buckets[1]!.count += 1;
    } else if (score < 4) {
      buckets[2]!.count += 1;
    } else {
      buckets[3]!.count += 1;
    }
  }
  return buckets;
}

export function assertScoreRange(score: number): void {
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new ValidationError("Rating score must be an integer from 1 to 5");
  }
}
