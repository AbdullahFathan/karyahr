import type {
  Goal,
  GoalDetail,
  GoalKeyResult,
  GoalLevel,
  GoalStatus,
  PerformanceCycle,
  PerformanceCycleStatus,
  PerformancePeerAssignment,
  PerformancePeriodType,
  PerformanceRating,
  PerformanceRecommendation,
  PerformanceReview,
  PerformanceReviewDetail,
  PerformanceReviewStatus,
  ReviewScoreRow,
} from "../entities/Performance";

export type CreateGoalInput = {
  readonly level: GoalLevel;
  readonly parentGoalId: string | null;
  readonly departmentId: string | null;
  readonly employeeId: string | null;
  readonly ownerUserId: string;
  readonly status: GoalStatus;
  readonly title: string;
  readonly description: string;
  readonly progressPercent: number;
  readonly keyResults: readonly {
    readonly title: string;
    readonly targetValue: number;
    readonly currentValue: number;
    readonly weight: number;
  }[];
};

export type UpdateGoalInput = {
  readonly parentGoalId?: string | null;
  readonly title?: string;
  readonly description?: string;
  readonly status?: GoalStatus;
  readonly progressPercent?: number;
};

export type GoalListFilter = {
  readonly employeeId?: string;
  readonly employeeIds?: readonly string[];
  readonly departmentId?: string;
  readonly level?: GoalLevel;
  readonly status?: GoalStatus;
  readonly parentGoalId?: string;
};

export type IGoalRepository = {
  create(input: CreateGoalInput): Promise<GoalDetail>;
  update(id: string, input: UpdateGoalInput): Promise<GoalDetail>;
  replaceKeyResults(
    goalId: string,
    keyResults: readonly {
      readonly title: string;
      readonly targetValue: number;
      readonly currentValue: number;
      readonly weight: number;
    }[],
    progressPercent: number,
  ): Promise<GoalDetail>;
  findById(id: string): Promise<GoalDetail | null>;
  list(filter: GoalListFilter): Promise<readonly GoalDetail[]>;
};

export type CreateCycleInput = {
  readonly name: string;
  readonly periodType: PerformancePeriodType;
  readonly startsAt: Date;
  readonly endsAt: Date;
};

export type UpdateCycleInput = {
  readonly name?: string;
  readonly periodType?: PerformancePeriodType;
  readonly startsAt?: Date;
  readonly endsAt?: Date;
};

export type ICycleRepository = {
  create(input: CreateCycleInput): Promise<PerformanceCycle>;
  update(id: string, input: UpdateCycleInput): Promise<PerformanceCycle>;
  setStatus(id: string, status: PerformanceCycleStatus): Promise<PerformanceCycle>;
  findById(id: string): Promise<PerformanceCycle | null>;
  list(): Promise<readonly PerformanceCycle[]>;
};

export type IReviewRepository = {
  createMany(cycleId: string, employeeIds: readonly string[]): Promise<number>;
  findById(id: string): Promise<PerformanceReviewDetail | null>;
  listByEmployee(employeeId: string): Promise<readonly PerformanceReview[]>;
  listByCycle(cycleId: string): Promise<readonly PerformanceReview[]>;
  listScoreRows(cycleId: string): Promise<readonly ReviewScoreRow[]>;
  updateReview(
    id: string,
    input: {
      readonly status?: PerformanceReviewStatus;
      readonly finalScore?: number | null;
      readonly recommendation?: PerformanceRecommendation | null;
    },
  ): Promise<PerformanceReview>;
  replacePeers(reviewId: string, peerEmployeeIds: readonly string[]): Promise<readonly PerformancePeerAssignment[]>;
  addRating(input: Omit<PerformanceRating, "id">): Promise<PerformanceRating>;
  findRating(reviewId: string, raterEmployeeId: string): Promise<PerformanceRating | null>;
};

export type { Goal, GoalKeyResult };
