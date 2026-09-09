import { ForbiddenError, NotFoundError } from "../../../../shared/errors/app-error";
import { PERMISSIONS } from "../../../../shared/auth/permissions";
import type { IEmployeeRepository } from "../../../employees/domain/repositories/IEmployeeRepository";
import type { DepartmentHeatmap, HeatmapCell, TeamDistribution } from "../entities/Performance";
import { recommendationFromScore, scoreBuckets } from "../performance-invariants";
import type { ICycleRepository, IReviewRepository } from "../repositories/IPerformanceRepository";
import type { PerformanceActor } from "./Goal.usecase";

function isHr(actor: PerformanceActor): boolean {
  return actor.permissionKeys.includes(PERMISSIONS.PERFORMANCE_CYCLES_WRITE);
}

/**
 * Builds score distribution for a manager's direct reports in a cycle.
 */
export class GetTeamDistributionUseCase {
  constructor(
    private readonly cycles: ICycleRepository,
    private readonly reviews: IReviewRepository,
    private readonly employees: IEmployeeRepository,
  ) {}

  async execute(actor: PerformanceActor, cycleId: string, managerId?: string): Promise<TeamDistribution> {
    const cycle = await this.cycles.findById(cycleId);
    if (!cycle) {
      throw new NotFoundError("Review cycle not found");
    }
    const targetManagerId = managerId ?? actor.employeeId;
    if (targetManagerId !== actor.employeeId && !isHr(actor)) {
      throw new ForbiddenError("Not allowed to view another manager's team");
    }
    const members = await this.employees.listDirectory({
      managerId: targetManagerId,
      statuses: ["ACTIVE", "PROBATION"],
    });
    const memberIds = new Set(members.map((item) => item.id));
    const rows = (await this.reviews.listScoreRows(cycleId)).filter((row) => memberIds.has(row.employeeId));
    const completed = rows.filter((row) => row.status === "COMPLETED" && row.finalScore !== null);
    const scores = completed.map((row) => row.finalScore!);
    const recommendations = { PROMOTION: 0, DEVELOPMENT: 0, PIP: 0 };
    for (const score of scores) {
      recommendations[recommendationFromScore(score)] += 1;
    }
    const averageScore =
      scores.length === 0
        ? null
        : Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100;
    return {
      cycleId,
      managerId: targetManagerId,
      memberCount: members.length,
      completedCount: completed.length,
      averageScore,
      buckets: scoreBuckets(scores),
      recommendations,
    };
  }
}

/**
 * Builds department heatmap averages for a cycle (HR).
 */
export class GetDepartmentHeatmapUseCase {
  constructor(
    private readonly cycles: ICycleRepository,
    private readonly reviews: IReviewRepository,
  ) {}

  async execute(actor: PerformanceActor, cycleId: string): Promise<DepartmentHeatmap> {
    if (!isHr(actor) && !actor.permissionKeys.includes(PERMISSIONS.PERFORMANCE_GOALS_WRITE)) {
      throw new ForbiddenError("Not allowed to view the department heatmap");
    }
    const cycle = await this.cycles.findById(cycleId);
    if (!cycle) {
      throw new NotFoundError("Review cycle not found");
    }
    const rows = await this.reviews.listScoreRows(cycleId);
    const byDept = new Map<string, number[]>();
    for (const row of rows) {
      if (row.status !== "COMPLETED" || row.finalScore === null) {
        continue;
      }
      const list = byDept.get(row.departmentId) ?? [];
      list.push(row.finalScore);
      byDept.set(row.departmentId, list);
    }
    const cells: HeatmapCell[] = [...byDept.entries()].map(([departmentId, scores]) => ({
      departmentId,
      count: scores.length,
      averageScore: Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100,
    }));
    return { cycleId, cells };
  }
}
