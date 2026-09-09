import type { PrismaClient } from "../../../../prisma/generated/prisma/client";
import type {
  GoalDetail,
  GoalKeyResult,
  PerformanceCycle,
  PerformancePeerAssignment,
  PerformanceRating,
  PerformanceReview,
  PerformanceReviewDetail,
  ReviewScoreRow,
} from "../domain/entities/Performance";
import type {
  CreateCycleInput,
  CreateGoalInput,
  GoalListFilter,
  ICycleRepository,
  IGoalRepository,
  IReviewRepository,
  UpdateCycleInput,
  UpdateGoalInput,
} from "../domain/repositories/IPerformanceRepository";

function toKeyResult(row: {
  id: string;
  goalId: string;
  title: string;
  targetValue: number;
  currentValue: number;
  weight: number;
}): GoalKeyResult {
  return {
    id: row.id,
    goalId: row.goalId,
    title: row.title,
    targetValue: row.targetValue,
    currentValue: row.currentValue,
    weight: row.weight,
  };
}

function toGoalDetail(row: {
  id: string;
  level: GoalDetail["level"];
  parentGoalId: string | null;
  departmentId: string | null;
  employeeId: string | null;
  ownerUserId: string;
  status: GoalDetail["status"];
  title: string;
  description: string;
  progressPercent: number;
  keyResults: Parameters<typeof toKeyResult>[0][];
}): GoalDetail {
  return {
    id: row.id,
    level: row.level,
    parentGoalId: row.parentGoalId,
    departmentId: row.departmentId,
    employeeId: row.employeeId,
    ownerUserId: row.ownerUserId,
    status: row.status,
    title: row.title,
    description: row.description,
    progressPercent: row.progressPercent,
    keyResults: row.keyResults.map(toKeyResult),
  };
}

function toCycle(row: PerformanceCycle): PerformanceCycle {
  return {
    id: row.id,
    name: row.name,
    periodType: row.periodType,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.status,
  };
}

function toReview(row: PerformanceReview): PerformanceReview {
  return {
    id: row.id,
    cycleId: row.cycleId,
    employeeId: row.employeeId,
    status: row.status,
    finalScore: row.finalScore,
    recommendation: row.recommendation,
  };
}

function toPeer(row: PerformancePeerAssignment): PerformancePeerAssignment {
  return {
    id: row.id,
    reviewId: row.reviewId,
    peerEmployeeId: row.peerEmployeeId,
  };
}

function toRating(row: PerformanceRating): PerformanceRating {
  return {
    id: row.id,
    reviewId: row.reviewId,
    raterEmployeeId: row.raterEmployeeId,
    raterType: row.raterType,
    score: row.score,
    comment: row.comment,
    submittedAt: row.submittedAt,
  };
}

/**
 * Goal persistence with Prisma.
 */
export class PrismaGoalRepository implements IGoalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateGoalInput): Promise<GoalDetail> {
    const row = await this.prisma.goal.create({
      data: {
        level: input.level,
        parentGoalId: input.parentGoalId,
        departmentId: input.departmentId,
        employeeId: input.employeeId,
        ownerUserId: input.ownerUserId,
        status: input.status,
        title: input.title,
        description: input.description,
        progressPercent: input.progressPercent,
        keyResults: { create: [...input.keyResults] },
      },
      include: { keyResults: true },
    });
    return toGoalDetail(row);
  }

  async update(id: string, input: UpdateGoalInput): Promise<GoalDetail> {
    const row = await this.prisma.goal.update({
      where: { id },
      data: input,
      include: { keyResults: true },
    });
    return toGoalDetail(row);
  }

  async replaceKeyResults(
    goalId: string,
    keyResults: CreateGoalInput["keyResults"],
    progressPercent: number,
  ): Promise<GoalDetail> {
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.goalKeyResult.deleteMany({ where: { goalId } });
      return tx.goal.update({
        where: { id: goalId },
        data: {
          progressPercent,
          keyResults: { create: [...keyResults] },
        },
        include: { keyResults: true },
      });
    });
    return toGoalDetail(row);
  }

  async findById(id: string): Promise<GoalDetail | null> {
    const row = await this.prisma.goal.findUnique({
      where: { id },
      include: { keyResults: true },
    });
    return row ? toGoalDetail(row) : null;
  }

  async list(filter: GoalListFilter): Promise<readonly GoalDetail[]> {
    const rows = await this.prisma.goal.findMany({
      where: {
        employeeId: filter.employeeId,
        departmentId: filter.departmentId,
        level: filter.level,
        status: filter.status,
        parentGoalId: filter.parentGoalId,
        ...(filter.employeeIds
          ? {
              OR: [{ employeeId: { in: [...filter.employeeIds] } }, { employeeId: null }],
            }
          : {}),
      },
      include: { keyResults: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toGoalDetail);
  }
}

/**
 * Review-cycle persistence with Prisma.
 */
export class PrismaCycleRepository implements ICycleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateCycleInput): Promise<PerformanceCycle> {
    return toCycle(await this.prisma.performanceCycle.create({ data: input }));
  }

  async update(id: string, input: UpdateCycleInput): Promise<PerformanceCycle> {
    return toCycle(await this.prisma.performanceCycle.update({ where: { id }, data: input }));
  }

  async setStatus(id: string, status: PerformanceCycle["status"]): Promise<PerformanceCycle> {
    return toCycle(await this.prisma.performanceCycle.update({ where: { id }, data: { status } }));
  }

  async findById(id: string): Promise<PerformanceCycle | null> {
    const row = await this.prisma.performanceCycle.findUnique({ where: { id } });
    return row ? toCycle(row) : null;
  }

  async list(): Promise<readonly PerformanceCycle[]> {
    const rows = await this.prisma.performanceCycle.findMany({ orderBy: { startsAt: "desc" } });
    return rows.map(toCycle);
  }
}

/**
 * Review, peer, and rating persistence with Prisma.
 */
export class PrismaReviewRepository implements IReviewRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createMany(cycleId: string, employeeIds: readonly string[]): Promise<number> {
    const result = await this.prisma.performanceReview.createMany({
      data: employeeIds.map((employeeId) => ({ cycleId, employeeId })),
      skipDuplicates: true,
    });
    return result.count;
  }

  async findById(id: string): Promise<PerformanceReviewDetail | null> {
    const row = await this.prisma.performanceReview.findUnique({
      where: { id },
      include: { peers: true, ratings: true },
    });
    if (!row) {
      return null;
    }
    return {
      ...toReview(row),
      peers: row.peers.map(toPeer),
      ratings: row.ratings.map(toRating),
    };
  }

  async listByEmployee(employeeId: string): Promise<readonly PerformanceReview[]> {
    const rows = await this.prisma.performanceReview.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toReview);
  }

  async listByCycle(cycleId: string): Promise<readonly PerformanceReview[]> {
    const rows = await this.prisma.performanceReview.findMany({
      where: { cycleId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toReview);
  }

  async listScoreRows(cycleId: string): Promise<readonly ReviewScoreRow[]> {
    const rows = await this.prisma.performanceReview.findMany({
      where: { cycleId },
      include: { employee: { select: { departmentId: true, managerId: true } } },
    });
    return rows.map((row) => ({
      employeeId: row.employeeId,
      departmentId: row.employee.departmentId,
      managerId: row.employee.managerId,
      finalScore: row.finalScore,
      status: row.status,
    }));
  }

  async updateReview(
    id: string,
    input: {
      readonly status?: PerformanceReview["status"];
      readonly finalScore?: number | null;
      readonly recommendation?: PerformanceReview["recommendation"];
    },
  ): Promise<PerformanceReview> {
    return toReview(await this.prisma.performanceReview.update({ where: { id }, data: input }));
  }

  async replacePeers(
    reviewId: string,
    peerEmployeeIds: readonly string[],
  ): Promise<readonly PerformancePeerAssignment[]> {
    const rows = await this.prisma.$transaction(async (tx) => {
      await tx.performancePeerAssignment.deleteMany({ where: { reviewId } });
      if (peerEmployeeIds.length === 0) {
        return [];
      }
      await tx.performancePeerAssignment.createMany({
        data: peerEmployeeIds.map((peerEmployeeId) => ({ reviewId, peerEmployeeId })),
      });
      return tx.performancePeerAssignment.findMany({ where: { reviewId } });
    });
    return rows.map(toPeer);
  }

  async addRating(input: Omit<PerformanceRating, "id">): Promise<PerformanceRating> {
    return toRating(await this.prisma.performanceRating.create({ data: input }));
  }

  async findRating(reviewId: string, raterEmployeeId: string): Promise<PerformanceRating | null> {
    const row = await this.prisma.performanceRating.findUnique({
      where: { reviewId_raterEmployeeId: { reviewId, raterEmployeeId } },
    });
    return row ? toRating(row) : null;
  }
}
