import { describe, expect, test } from "bun:test";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { PERMISSIONS } from "../../../../shared/auth/permissions";
import type { AuthUser } from "../../../auth/domain/entities/AuthUser";
import type { IUserRepository } from "../../../auth/domain/repositories/IUserRepository";
import type { Employee } from "../../../employees/domain/entities/Employee";
import type { IEmployeeRepository } from "../../../employees/domain/repositories/IEmployeeRepository";
import type { NotificationEvent } from "../../../notifications/domain/entities/Notification";
import type { INotificationDispatcher } from "../../../notifications/domain/ports/INotificationDispatcher";
import type {
  PerformanceCycle,
  PerformancePeerAssignment,
  PerformanceRating,
  PerformanceReview,
  PerformanceReviewDetail,
  ReviewScoreRow,
} from "../entities/Performance";
import { recommendationFromScore } from "../performance-invariants";
import type {
  CreateCycleInput,
  ICycleRepository,
  IReviewRepository,
  UpdateCycleInput,
} from "../repositories/IPerformanceRepository";
import { OpenCycleUseCase, CreateCycleUseCase, UpdateCycleUseCase, LockCycleUseCase, ListCyclesUseCase, GetCycleUseCase } from "./Cycle.usecase";
import type { PerformanceActor } from "./Goal.usecase";
import { GetDepartmentHeatmapUseCase, GetTeamDistributionUseCase } from "./PerformanceDashboard.usecase";
import { AssignPeersUseCase, CompleteReviewUseCase, GetReviewUseCase, ListEmployeeReviewsUseCase, ListMyReviewsUseCase, SubmitRatingUseCase } from "./Review.usecase";

const employee: Employee = {
  id: "e1",
  fullName: "Siti",
  nationalId: "1",
  birthDate: new Date("1995-01-01"),
  address: "Jakarta",
  phone: "081",
  emergencyContact: "082",
  employeeNumber: "EMP-1",
  departmentId: "d1",
  positionId: "p1",
  managerId: "m1",
  joinedAt: new Date("2024-01-01"),
  status: "ACTIVE",
  contractType: "PERMANENT",
};

const manager: Employee = {
  ...employee,
  id: "m1",
  fullName: "Ahmad",
  nationalId: "2",
  employeeNumber: "EMP-2",
  managerId: null,
};

const peer: Employee = {
  ...employee,
  id: "p1",
  fullName: "Peer",
  nationalId: "3",
  employeeNumber: "EMP-3",
  managerId: "m1",
};

const employeeUser: AuthUser = {
  id: "u-e",
  email: "siti@local",
  passwordHash: "x",
  employeeId: "e1",
  isActive: true,
  roleNames: ["employee"],
  permissionKeys: [],
};

class MemoryEmployees implements IEmployeeRepository {
  constructor(private readonly items: Employee[]) {}
  async create(): Promise<Employee> {
    return this.items[0]!;
  }
  async update(): Promise<Employee> {
    return this.items[0]!;
  }
  async findById(id: string): Promise<Employee | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }
  async findByNationalId(): Promise<Employee | null> {
    return null;
  }
  async findByEmployeeNumber(): Promise<Employee | null> {
    return null;
  }
  async list() {
    return { items: this.items, total: this.items.length };
  }
  async listDirectory(filter: { managerId?: string; statuses?: readonly Employee["status"][] }) {
    const items = this.items.filter((item) => {
      if (filter.managerId !== undefined && item.managerId !== filter.managerId) {
        return false;
      }
      if (filter.statuses && !filter.statuses.includes(item.status)) {
        return false;
      }
      return true;
    });
    return { items, total: items.length };
  }
}

class MemoryUsers implements IUserRepository {
  constructor(private readonly items: AuthUser[]) {}
  async findByEmail(): Promise<AuthUser | null> {
    return this.items[0] ?? null;
  }
  async findById(id: string): Promise<AuthUser | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }
  async findByEmployeeId(employeeId: string): Promise<AuthUser | null> {
    return this.items.find((item) => item.employeeId === employeeId) ?? null;
  }
  async listByRoleName(): Promise<readonly AuthUser[]> {
    return this.items;
  }
  async setActiveByEmployeeId(): Promise<void> {}
  async create(): Promise<AuthUser> {
    return this.items[0]!;
  }
}

class MemoryAudit implements IAuditLogRepository {
  async append(): Promise<void> {}
}

class MemoryDispatcher implements INotificationDispatcher {
  readonly events: NotificationEvent[] = [];
  async dispatch(event: NotificationEvent): Promise<void> {
    this.events.push(event);
  }
}

class MemoryCycles implements ICycleRepository {
  constructor(private cycle: PerformanceCycle) {}
  async create(input: CreateCycleInput): Promise<PerformanceCycle> {
    this.cycle = { ...this.cycle, ...input };
    return this.cycle;
  }
  async update(id: string, input: UpdateCycleInput): Promise<PerformanceCycle> {
    this.cycle = { ...this.cycle, ...input, id };
    return this.cycle;
  }
  async setStatus(id: string, status: PerformanceCycle["status"]): Promise<PerformanceCycle> {
    this.cycle = { ...this.cycle, id, status };
    return this.cycle;
  }
  async findById(id: string): Promise<PerformanceCycle | null> {
    return this.cycle.id === id ? this.cycle : null;
  }
  async list(): Promise<readonly PerformanceCycle[]> {
    return [this.cycle];
  }
}

class MemoryReviews implements IReviewRepository {
  private readonly reviews = new Map<string, PerformanceReviewDetail>();
  private ratings: PerformanceRating[] = [];

  seed(review: PerformanceReviewDetail): void {
    this.reviews.set(review.id, review);
  }

  async createMany(cycleId: string, employeeIds: readonly string[]): Promise<number> {
    for (const employeeId of employeeIds) {
      const id = `r-${employeeId}`;
      if (this.reviews.has(id)) {
        continue;
      }
      this.reviews.set(id, {
        id,
        cycleId,
        employeeId,
        status: "PENDING",
        finalScore: null,
        recommendation: null,
        peers: [],
        ratings: [],
      });
    }
    return employeeIds.length;
  }

  async findById(id: string): Promise<PerformanceReviewDetail | null> {
    const review = this.reviews.get(id);
    if (!review) {
      return null;
    }
    return { ...review, ratings: this.ratings.filter((item) => item.reviewId === id) };
  }

  async listByEmployee(employeeId: string): Promise<readonly PerformanceReview[]> {
    return [...this.reviews.values()].filter((item) => item.employeeId === employeeId);
  }

  async listByCycle(cycleId: string): Promise<readonly PerformanceReview[]> {
    return [...this.reviews.values()].filter((item) => item.cycleId === cycleId);
  }

  async listScoreRows(cycleId: string): Promise<readonly ReviewScoreRow[]> {
    const dept: Record<string, string> = { e1: "d1", p1: "d1", m1: "d1" };
    const mgr: Record<string, string | null> = { e1: "m1", p1: "m1", m1: null };
    return [...this.reviews.values()]
      .filter((item) => item.cycleId === cycleId)
      .map((item) => ({
        employeeId: item.employeeId,
        departmentId: dept[item.employeeId] ?? "d1",
        managerId: mgr[item.employeeId] ?? null,
        finalScore: item.finalScore,
        status: item.status,
      }));
  }

  async updateReview(
    id: string,
    input: Partial<Pick<PerformanceReview, "status" | "finalScore" | "recommendation">>,
  ): Promise<PerformanceReview> {
    const current = this.reviews.get(id)!;
    const next = { ...current, ...input };
    this.reviews.set(id, next);
    return next;
  }

  async replacePeers(
    reviewId: string,
    peerEmployeeIds: readonly string[],
  ): Promise<readonly PerformancePeerAssignment[]> {
    const current = this.reviews.get(reviewId)!;
    const peers = peerEmployeeIds.map((peerEmployeeId, index) => ({
      id: `peer-${index}`,
      reviewId,
      peerEmployeeId,
    }));
    this.reviews.set(reviewId, { ...current, peers });
    return peers;
  }

  async addRating(input: Omit<PerformanceRating, "id">): Promise<PerformanceRating> {
    const rating = { ...input, id: `rt-${this.ratings.length}` };
    this.ratings.push(rating);
    return rating;
  }

  async findRating(reviewId: string, raterEmployeeId: string): Promise<PerformanceRating | null> {
    return this.ratings.find((item) => item.reviewId === reviewId && item.raterEmployeeId === raterEmployeeId) ?? null;
  }
}

const cycle: PerformanceCycle = {
  id: "c1",
  name: "Q1",
  periodType: "QUARTERLY",
  startsAt: new Date("2026-01-01"),
  endsAt: new Date("2026-03-31"),
  status: "OPEN",
};

function actor(employeeId: string, keys: readonly string[]): PerformanceActor {
  return { userId: `u-${employeeId}`, employeeId, permissionKeys: keys };
}

describe("recommendation bands", () => {
  test("maps scores to promotion, development, and PIP", () => {
    expect(recommendationFromScore(4.5)).toBe("PROMOTION");
    expect(recommendationFromScore(3)).toBe("DEVELOPMENT");
    expect(recommendationFromScore(2.9)).toBe("PIP");
  });
});

describe("review ratings", () => {
  test("rejects a duplicate rating from the same rater", async () => {
    const reviews = new MemoryReviews();
    reviews.seed({
      id: "r1",
      cycleId: "c1",
      employeeId: "e1",
      status: "PENDING",
      finalScore: null,
      recommendation: null,
      peers: [],
      ratings: [],
    });
    const submit = new SubmitRatingUseCase(
      new MemoryCycles(cycle),
      reviews,
      new MemoryEmployees([employee, manager, peer]),
      new MemoryUsers([employeeUser]),
      new MemoryDispatcher(),
      new MemoryAudit(),
    );
    const self = actor("e1", [PERMISSIONS.PERFORMANCE_REVIEWS_ME]);
    await submit.execute(self, "r1", { raterType: "SELF", score: 4, comment: "ok" });
    await expect(submit.execute(self, "r1", { raterType: "SELF", score: 5, comment: "again" })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  test("complete requires self and manager ratings then stores the band", async () => {
    const reviews = new MemoryReviews();
    reviews.seed({
      id: "r1",
      cycleId: "c1",
      employeeId: "e1",
      status: "IN_PROGRESS",
      finalScore: null,
      recommendation: null,
      peers: [{ id: "x", reviewId: "r1", peerEmployeeId: "p1" }],
      ratings: [],
    });
    const cycles = new MemoryCycles(cycle);
    const employees = new MemoryEmployees([employee, manager, peer]);
    const submit = new SubmitRatingUseCase(
      cycles,
      reviews,
      employees,
      new MemoryUsers([employeeUser]),
      new MemoryDispatcher(),
      new MemoryAudit(),
    );
    const complete = new CompleteReviewUseCase(cycles, reviews, employees, new MemoryAudit());
    const managerActor = actor("m1", [PERMISSIONS.PERFORMANCE_REVIEWS_WRITE]);
    await expect(complete.execute(managerActor, "r1")).rejects.toBeInstanceOf(ValidationError);
    await submit.execute(actor("e1", []), "r1", { raterType: "SELF", score: 5, comment: "self" });
    await submit.execute(managerActor, "r1", { raterType: "MANAGER", score: 4, comment: "mgr" });
    const done = await complete.execute(managerActor, "r1");
    expect(done.finalScore).toBe(4.5);
    expect(done.recommendation).toBe("PROMOTION");
  });

  test("peer must be assigned before rating", async () => {
    const reviews = new MemoryReviews();
    reviews.seed({
      id: "r1",
      cycleId: "c1",
      employeeId: "e1",
      status: "PENDING",
      finalScore: null,
      recommendation: null,
      peers: [],
      ratings: [],
    });
    const cycles = new MemoryCycles(cycle);
    const employees = new MemoryEmployees([employee, manager, peer]);
    const assign = new AssignPeersUseCase(cycles, reviews, employees, new MemoryAudit());
    await assign.execute(actor("m1", [PERMISSIONS.PERFORMANCE_REVIEWS_WRITE]), "r1", ["p1"]);
    const submit = new SubmitRatingUseCase(
      cycles,
      reviews,
      employees,
      new MemoryUsers([employeeUser]),
      new MemoryDispatcher(),
      new MemoryAudit(),
    );
    const rating = await submit.execute(actor("p1", []), "r1", { raterType: "PEER", score: 3, comment: "peer" });
    expect(rating.raterType).toBe("PEER");
  });

  test("reviews:write without being manager or HR cannot assign peers or complete", async () => {
    const reviews = new MemoryReviews();
    reviews.seed({
      id: "r1",
      cycleId: "c1",
      employeeId: "e1",
      status: "IN_PROGRESS",
      finalScore: null,
      recommendation: null,
      peers: [],
      ratings: [
        {
          id: "s",
          reviewId: "r1",
          raterEmployeeId: "e1",
          raterType: "SELF",
          score: 5,
          comment: "self",
          submittedAt: new Date("2026-01-02"),
        },
        {
          id: "m",
          reviewId: "r1",
          raterEmployeeId: "m1",
          raterType: "MANAGER",
          score: 4,
          comment: "mgr",
          submittedAt: new Date("2026-01-02"),
        },
      ],
    });
    const cycles = new MemoryCycles(cycle);
    const employees = new MemoryEmployees([employee, manager, peer]);
    const writer = actor("p1", [PERMISSIONS.PERFORMANCE_REVIEWS_WRITE]);
    await expect(new AssignPeersUseCase(cycles, reviews, employees, new MemoryAudit()).execute(writer, "r1", ["p1"])).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await expect(
      new CompleteReviewUseCase(cycles, reviews, employees, new MemoryAudit()).execute(writer, "r1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("cycle open and dashboard", () => {
  test("opening a cycle creates reviews for active employees", async () => {
    const cycles = new MemoryCycles({ ...cycle, status: "DRAFT" });
    const reviews = new MemoryReviews();
    const open = new OpenCycleUseCase(
      cycles,
      reviews,
      new MemoryEmployees([employee, manager, peer]),
      new MemoryUsers([employeeUser]),
      new MemoryDispatcher(),
      new MemoryAudit(),
    );
    const opened = await open.execute(actor("hr", [PERMISSIONS.PERFORMANCE_CYCLES_WRITE]), "c1");
    expect(opened.status).toBe("OPEN");
    expect((await reviews.listByCycle("c1")).length).toBe(3);
  });

  test("team distribution uses the manager directory", async () => {
    const reviews = new MemoryReviews();
    reviews.seed({
      id: "r-e1",
      cycleId: "c1",
      employeeId: "e1",
      status: "COMPLETED",
      finalScore: 4.5,
      recommendation: "PROMOTION",
      peers: [],
      ratings: [],
    });
    reviews.seed({
      id: "r-p1",
      cycleId: "c1",
      employeeId: "p1",
      status: "COMPLETED",
      finalScore: 2,
      recommendation: "PIP",
      peers: [],
      ratings: [],
    });
    const team = await new GetTeamDistributionUseCase(
      new MemoryCycles(cycle),
      reviews,
      new MemoryEmployees([employee, manager, peer]),
    ).execute(actor("m1", [PERMISSIONS.PERFORMANCE_DASHBOARD]), "c1");
    expect(team.memberCount).toBe(2);
    expect(team.completedCount).toBe(2);
    expect(team.recommendations.PROMOTION).toBe(1);
    expect(team.recommendations.PIP).toBe(1);
  });

  test("heatmap groups completed scores by department", async () => {
    const reviews = new MemoryReviews();
    reviews.seed({
      id: "r-e1",
      cycleId: "c1",
      employeeId: "e1",
      status: "COMPLETED",
      finalScore: 4,
      recommendation: "DEVELOPMENT",
      peers: [],
      ratings: [],
    });
    const heatmap = await new GetDepartmentHeatmapUseCase(new MemoryCycles(cycle), reviews).execute(
      actor("hr", [PERMISSIONS.PERFORMANCE_CYCLES_WRITE]),
      "c1",
    );
    expect(heatmap.cells[0]?.departmentId).toBe("d1");
    expect(heatmap.cells[0]?.averageScore).toBe(4);
  });

  test("creates, updates, locks, and lists cycles", async () => {
    const cycles = new MemoryCycles({ ...cycle, status: "DRAFT" });
    const created = await new CreateCycleUseCase(cycles, new MemoryAudit()).execute(
      actor("hr", [PERMISSIONS.PERFORMANCE_CYCLES_WRITE]),
      {
        name: "Q2",
        periodType: "QUARTERLY",
        startsAt: new Date("2026-04-01"),
        endsAt: new Date("2026-06-30"),
      },
    );
    expect(created.name).toBe("Q2");
    await expect(
      new CreateCycleUseCase(cycles, new MemoryAudit()).execute(actor("hr", []), {
        name: "bad",
        periodType: "QUARTERLY",
        startsAt: new Date("2026-06-30"),
        endsAt: new Date("2026-04-01"),
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    const updated = await new UpdateCycleUseCase(cycles, new MemoryAudit()).execute(
      actor("hr", []),
      "c1",
      { name: "Q2 updated" },
    );
    expect(updated.name).toBe("Q2 updated");
    await new OpenCycleUseCase(
      cycles,
      new MemoryReviews(),
      new MemoryEmployees([employee]),
      new MemoryUsers([employeeUser]),
      new MemoryDispatcher(),
      new MemoryAudit(),
    ).execute(actor("hr", [PERMISSIONS.PERFORMANCE_CYCLES_WRITE]), "c1");
    const locked = await new LockCycleUseCase(cycles, new MemoryAudit()).execute(actor("hr", []), "c1");
    expect(locked.status).toBe("LOCKED");
    await expect(new UpdateCycleUseCase(cycles, new MemoryAudit()).execute(actor("hr", []), "c1", { name: "x" })).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(await new ListCyclesUseCase(cycles).execute()).toHaveLength(1);
    expect((await new GetCycleUseCase(cycles).execute("c1")).id).toBe("c1");
    await expect(new GetCycleUseCase(cycles).execute("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("review queries", () => {
  test("loads and lists reviews for the subject", async () => {
    const reviews = new MemoryReviews();
    reviews.seed({
      id: "r1",
      cycleId: "c1",
      employeeId: "e1",
      status: "PENDING",
      finalScore: null,
      recommendation: null,
      peers: [],
      ratings: [],
    });
    expect((await new GetReviewUseCase(reviews, new MemoryEmployees([employee])).execute(actor("e1", []), "r1")).id).toBe(
      "r1",
    );
    expect(await new ListMyReviewsUseCase(reviews).execute(actor("e1", []))).toHaveLength(1);
    expect(
      await new ListEmployeeReviewsUseCase(reviews, new MemoryEmployees([employee])).execute(
        actor("hr", [PERMISSIONS.PERFORMANCE_CYCLES_WRITE]),
        "e1",
      ),
    ).toHaveLength(1);
    await expect(
      new GetReviewUseCase(reviews, new MemoryEmployees([employee])).execute(actor("p1", []), "r1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
