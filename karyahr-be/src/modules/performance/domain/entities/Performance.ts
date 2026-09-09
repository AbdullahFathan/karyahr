export const GOAL_LEVELS = ["COMPANY", "DEPARTMENT", "EMPLOYEE"] as const;
export type GoalLevel = (typeof GOAL_LEVELS)[number];

export const GOAL_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "ACTIVE",
  "REJECTED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const PERFORMANCE_PERIOD_TYPES = ["MONTHLY", "QUARTERLY", "YEARLY"] as const;
export type PerformancePeriodType = (typeof PERFORMANCE_PERIOD_TYPES)[number];

export const PERFORMANCE_CYCLE_STATUSES = ["DRAFT", "OPEN", "LOCKED"] as const;
export type PerformanceCycleStatus = (typeof PERFORMANCE_CYCLE_STATUSES)[number];

export const PERFORMANCE_REVIEW_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;
export type PerformanceReviewStatus = (typeof PERFORMANCE_REVIEW_STATUSES)[number];

export const PERFORMANCE_RATER_TYPES = ["SELF", "MANAGER", "PEER"] as const;
export type PerformanceRaterType = (typeof PERFORMANCE_RATER_TYPES)[number];

export const PERFORMANCE_RECOMMENDATIONS = ["PROMOTION", "DEVELOPMENT", "PIP"] as const;
export type PerformanceRecommendation = (typeof PERFORMANCE_RECOMMENDATIONS)[number];

export type GoalKeyResult = {
  readonly id: string;
  readonly goalId: string;
  readonly title: string;
  readonly targetValue: number;
  readonly currentValue: number;
  readonly weight: number;
};

export type Goal = {
  readonly id: string;
  readonly level: GoalLevel;
  readonly parentGoalId: string | null;
  readonly departmentId: string | null;
  readonly employeeId: string | null;
  readonly ownerUserId: string;
  readonly status: GoalStatus;
  readonly title: string;
  readonly description: string;
  readonly progressPercent: number;
};

export type GoalDetail = Goal & {
  readonly keyResults: readonly GoalKeyResult[];
};

export type PerformanceCycle = {
  readonly id: string;
  readonly name: string;
  readonly periodType: PerformancePeriodType;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly status: PerformanceCycleStatus;
};

export type PerformancePeerAssignment = {
  readonly id: string;
  readonly reviewId: string;
  readonly peerEmployeeId: string;
};

export type PerformanceRating = {
  readonly id: string;
  readonly reviewId: string;
  readonly raterEmployeeId: string;
  readonly raterType: PerformanceRaterType;
  readonly score: number;
  readonly comment: string;
  readonly submittedAt: Date;
};

export type PerformanceReview = {
  readonly id: string;
  readonly cycleId: string;
  readonly employeeId: string;
  readonly status: PerformanceReviewStatus;
  readonly finalScore: number | null;
  readonly recommendation: PerformanceRecommendation | null;
};

export type PerformanceReviewDetail = PerformanceReview & {
  readonly peers: readonly PerformancePeerAssignment[];
  readonly ratings: readonly PerformanceRating[];
};

export type ReviewScoreRow = {
  readonly employeeId: string;
  readonly departmentId: string;
  readonly managerId: string | null;
  readonly finalScore: number | null;
  readonly status: PerformanceReviewStatus;
};

export type ScoreBucket = {
  readonly label: string;
  readonly count: number;
};

export type TeamDistribution = {
  readonly cycleId: string;
  readonly managerId: string;
  readonly memberCount: number;
  readonly completedCount: number;
  readonly averageScore: number | null;
  readonly buckets: readonly ScoreBucket[];
  readonly recommendations: {
    readonly PROMOTION: number;
    readonly DEVELOPMENT: number;
    readonly PIP: number;
  };
};

export type HeatmapCell = {
  readonly departmentId: string;
  readonly count: number;
  readonly averageScore: number | null;
};

export type DepartmentHeatmap = {
  readonly cycleId: string;
  readonly cells: readonly HeatmapCell[];
};
