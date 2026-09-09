import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { ForbiddenError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import { HR_ADMIN_ROLE, PERMISSIONS } from "../../../../shared/auth/permissions";
import type { IUserRepository } from "../../../auth/domain/repositories/IUserRepository";
import type { IEmployeeRepository } from "../../../employees/domain/repositories/IEmployeeRepository";
import type { INotificationDispatcher } from "../../../notifications/domain/ports/INotificationDispatcher";
import type { GoalDetail, GoalLevel, GoalStatus } from "../entities/Performance";
import {
  assertGoalOwnerFields,
  assertKeyResultWeights,
  assertParentLevel,
  computeProgressPercent,
} from "../performance-invariants";
import type { IGoalRepository } from "../repositories/IPerformanceRepository";

export type PerformanceActor = {
  readonly userId: string;
  readonly employeeId: string;
  readonly permissionKeys: readonly string[];
};

export type KeyResultInput = {
  readonly title: string;
  readonly targetValue: number;
  readonly currentValue?: number;
  readonly weight: number;
};

function isHr(actor: PerformanceActor): boolean {
  return actor.permissionKeys.includes(PERMISSIONS.PERFORMANCE_CYCLES_WRITE);
}

function has(actor: PerformanceActor, key: string): boolean {
  return actor.permissionKeys.includes(key);
}

async function notifyUsers(
  dispatcher: INotificationDispatcher,
  userIds: readonly string[],
  event: {
    readonly type: "performance.goal_submitted" | "performance.goal_decided";
    readonly title: string;
    readonly body: string;
    readonly entityId: string;
  },
): Promise<void> {
  await Promise.all(
    userIds.map((recipientUserId) =>
      dispatcher.dispatch({
        type: event.type,
        recipientUserId,
        title: event.title,
        body: event.body,
        entityType: "Goal",
        entityId: event.entityId,
      }),
    ),
  );
}

function normalizeKeyResults(keyResults: readonly KeyResultInput[]): {
  readonly title: string;
  readonly targetValue: number;
  readonly currentValue: number;
  readonly weight: number;
}[] {
  const normalized = keyResults.map((item) => ({
    title: item.title,
    targetValue: item.targetValue,
    currentValue: item.currentValue ?? 0,
    weight: item.weight,
  }));
  assertKeyResultWeights(normalized);
  return normalized;
}

async function resolveParent(
  goals: IGoalRepository,
  parentGoalId: string | null,
  level: GoalLevel,
): Promise<void> {
  if (!parentGoalId) {
    return;
  }
  const parent = await goals.findById(parentGoalId);
  if (!parent) {
    throw new NotFoundError("Parent goal not found");
  }
  assertParentLevel(level, parent.level);
}

function canReadGoal(actor: PerformanceActor, goal: GoalDetail, reportIds: ReadonlySet<string>): boolean {
  if (isHr(actor) || has(actor, PERMISSIONS.PERFORMANCE_GOALS_WRITE)) {
    return true;
  }
  if (goal.level !== "EMPLOYEE") {
    return has(actor, PERMISSIONS.PERFORMANCE_GOALS_READ) || has(actor, PERMISSIONS.PERFORMANCE_GOALS_ME);
  }
  if (goal.employeeId === actor.employeeId) {
    return true;
  }
  return has(actor, PERMISSIONS.PERFORMANCE_GOALS_READ) && goal.employeeId !== null && reportIds.has(goal.employeeId);
}

/**
 * Creates a cascading OKR/KPI goal.
 */
export class CreateGoalUseCase {
  constructor(
    private readonly goals: IGoalRepository,
    private readonly employees: IEmployeeRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(
    actor: PerformanceActor,
    input: {
      readonly level: GoalLevel;
      readonly parentGoalId?: string | null;
      readonly departmentId?: string | null;
      readonly employeeId?: string | null;
      readonly title: string;
      readonly description: string;
      readonly keyResults?: readonly KeyResultInput[];
    },
  ): Promise<GoalDetail> {
    const keyResults = normalizeKeyResults(input.keyResults ?? []);
    const level = input.level;
    let employeeId = input.employeeId ?? null;
    let departmentId = input.departmentId ?? null;

    if (!has(actor, PERMISSIONS.PERFORMANCE_GOALS_WRITE)) {
      if (!has(actor, PERMISSIONS.PERFORMANCE_GOALS_ME) || level !== "EMPLOYEE") {
        throw new ForbiddenError("Not allowed to create this goal");
      }
      employeeId = actor.employeeId;
    }

    if (level === "EMPLOYEE" && employeeId) {
      const employee = await this.employees.findById(employeeId);
      if (!employee) {
        throw new NotFoundError("Employee not found");
      }
      departmentId = null;
    }

    assertGoalOwnerFields({ level, departmentId, employeeId });
    await resolveParent(this.goals, input.parentGoalId ?? null, level);

    const status = level === "EMPLOYEE" ? "DRAFT" : "ACTIVE";
    const created = await this.goals.create({
      level,
      parentGoalId: input.parentGoalId ?? null,
      departmentId,
      employeeId,
      ownerUserId: actor.userId,
      status,
      title: input.title,
      description: input.description,
      progressPercent: computeProgressPercent(
        keyResults.map((item, index) => ({
          id: String(index),
          goalId: "new",
          ...item,
        })),
      ),
      keyResults,
    });
    await this.audit.append({
      actorUserId: actor.userId,
      entityType: "Goal",
      entityId: created.id,
      action: "create",
      metadata: { level, status },
    });
    return created;
  }
}

/**
 * Updates draft or HR-owned goal metadata and key results.
 */
export class UpdateGoalUseCase {
  constructor(
    private readonly goals: IGoalRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(
    actor: PerformanceActor,
    id: string,
    input: {
      readonly parentGoalId?: string | null;
      readonly title?: string;
      readonly description?: string;
      readonly keyResults?: readonly KeyResultInput[];
      readonly progressPercent?: number;
    },
  ): Promise<GoalDetail> {
    const goal = await this.goals.findById(id);
    if (!goal) {
      throw new NotFoundError("Goal not found");
    }
    const ownerOrHr = goal.ownerUserId === actor.userId || isHr(actor) || has(actor, PERMISSIONS.PERFORMANCE_GOALS_WRITE);
    if (!ownerOrHr) {
      throw new ForbiddenError("Not allowed to update this goal");
    }
    if (goal.level === "EMPLOYEE" && goal.status !== "DRAFT" && !isHr(actor)) {
      throw new ValidationError("Only draft employee goals can be edited");
    }
    if (input.parentGoalId !== undefined) {
      await resolveParent(this.goals, input.parentGoalId, goal.level);
    }

    let updated = await this.goals.update(id, {
      parentGoalId: input.parentGoalId,
      title: input.title,
      description: input.description,
      progressPercent:
        input.keyResults === undefined && goal.keyResults.length === 0 ? input.progressPercent : undefined,
    });

    if (input.keyResults) {
      const keyResults = normalizeKeyResults(input.keyResults);
      updated = await this.goals.replaceKeyResults(
        id,
        keyResults,
        computeProgressPercent(
          keyResults.map((item, index) => ({
            id: String(index),
            goalId: id,
            ...item,
          })),
        ),
      );
    }

    await this.audit.append({
      actorUserId: actor.userId,
      entityType: "Goal",
      entityId: id,
      action: "update",
    });
    return updated;
  }
}

/**
 * Updates key-result progress on an active goal.
 */
export class UpdateGoalProgressUseCase {
  constructor(
    private readonly goals: IGoalRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(
    actor: PerformanceActor,
    id: string,
    keyResults: readonly KeyResultInput[],
  ): Promise<GoalDetail> {
    const goal = await this.goals.findById(id);
    if (!goal) {
      throw new NotFoundError("Goal not found");
    }
    if (goal.status !== "ACTIVE") {
      throw new ValidationError("Progress can only be updated on active goals");
    }
    const canEdit =
      goal.employeeId === actor.employeeId ||
      goal.ownerUserId === actor.userId ||
      isHr(actor) ||
      has(actor, PERMISSIONS.PERFORMANCE_GOALS_WRITE);
    if (!canEdit) {
      throw new ForbiddenError("Not allowed to update progress");
    }
    const normalized = normalizeKeyResults(keyResults);
    const updated = await this.goals.replaceKeyResults(
      id,
      normalized,
      computeProgressPercent(
        normalized.map((item, index) => ({
          id: String(index),
          goalId: id,
          ...item,
        })),
      ),
    );
    await this.audit.append({
      actorUserId: actor.userId,
      entityType: "Goal",
      entityId: id,
      action: "progress",
    });
    return updated;
  }
}

/**
 * Submits an employee goal for manager approval.
 */
export class SubmitGoalUseCase {
  constructor(
    private readonly goals: IGoalRepository,
    private readonly employees: IEmployeeRepository,
    private readonly users: IUserRepository,
    private readonly dispatcher: INotificationDispatcher,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(actor: PerformanceActor, id: string): Promise<GoalDetail> {
    const goal = await this.goals.findById(id);
    if (!goal) {
      throw new NotFoundError("Goal not found");
    }
    if (goal.level !== "EMPLOYEE" || !goal.employeeId) {
      throw new ValidationError("Only employee goals require approval");
    }
    if (goal.status !== "DRAFT") {
      throw new ValidationError("Only draft goals can be submitted");
    }
    if (goal.employeeId !== actor.employeeId && !isHr(actor)) {
      throw new ForbiddenError("Not allowed to submit this goal");
    }
    const updated = await this.goals.update(id, { status: "PENDING_APPROVAL" });
    const employee = await this.employees.findById(goal.employeeId);
    const recipientIds: string[] = [];
    if (employee?.managerId) {
      const manager = await this.users.findByEmployeeId(employee.managerId);
      if (manager) {
        recipientIds.push(manager.id);
      }
    }
    if (recipientIds.length === 0) {
      const hrs = await this.users.listByRoleName(HR_ADMIN_ROLE);
      recipientIds.push(...hrs.map((item) => item.id));
    }
    await notifyUsers(this.dispatcher, recipientIds, {
      type: "performance.goal_submitted",
      title: "Goal submitted for approval",
      body: `${goal.title} is waiting for approval.`,
      entityId: goal.id,
    });
    await this.audit.append({
      actorUserId: actor.userId,
      entityType: "Goal",
      entityId: id,
      action: "submit",
    });
    return updated;
  }
}

/**
 * Approves or rejects a pending employee goal.
 */
export class DecideGoalUseCase {
  constructor(
    private readonly goals: IGoalRepository,
    private readonly employees: IEmployeeRepository,
    private readonly users: IUserRepository,
    private readonly dispatcher: INotificationDispatcher,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(
    actor: PerformanceActor,
    id: string,
    decision: "ACTIVE" | "REJECTED",
  ): Promise<GoalDetail> {
    const action = decision === "ACTIVE" ? "approved" : "rejected";
    const goal = await this.goals.findById(id);
    if (!goal) {
      throw new NotFoundError("Goal not found");
    }
    if (goal.status !== "PENDING_APPROVAL" || goal.level !== "EMPLOYEE" || !goal.employeeId) {
      throw new ValidationError("Goal is not waiting for approval");
    }
    const employee = await this.employees.findById(goal.employeeId);
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }
    const isManager = employee.managerId === actor.employeeId;
    if (!isManager && !has(actor, PERMISSIONS.PERFORMANCE_GOALS_APPROVE)) {
      throw new ForbiddenError("Not allowed to decide this goal");
    }
    const updated = await this.goals.update(id, { status: decision });
    const owner = await this.users.findByEmployeeId(goal.employeeId);
    if (owner) {
      await notifyUsers(this.dispatcher, [owner.id], {
        type: "performance.goal_decided",
        title: `Goal ${action}`,
        body: `${goal.title} was ${action}.`,
        entityId: goal.id,
      });
    }
    await this.audit.append({
      actorUserId: actor.userId,
      entityType: "Goal",
      entityId: id,
      action,
    });
    return updated;
  }
}

/**
 * Approves a pending employee goal.
 */
export class ApproveGoalUseCase {
  constructor(private readonly decide: DecideGoalUseCase) {}

  async execute(actor: PerformanceActor, id: string): Promise<GoalDetail> {
    return this.decide.execute(actor, id, "ACTIVE");
  }
}

/**
 * Rejects a pending employee goal.
 */
export class RejectGoalUseCase {
  constructor(private readonly decide: DecideGoalUseCase) {}

  async execute(actor: PerformanceActor, id: string): Promise<GoalDetail> {
    return this.decide.execute(actor, id, "REJECTED");
  }
}

/**
 * Completes or cancels an active goal.
 */
export class CloseGoalUseCase {
  constructor(
    private readonly goals: IGoalRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(
    actor: PerformanceActor,
    id: string,
    status: "COMPLETED" | "CANCELLED",
  ): Promise<GoalDetail> {
    const goal = await this.goals.findById(id);
    if (!goal) {
      throw new NotFoundError("Goal not found");
    }
    if (goal.status !== "ACTIVE") {
      throw new ValidationError("Only active goals can be closed");
    }
    const canClose =
      goal.employeeId === actor.employeeId ||
      goal.ownerUserId === actor.userId ||
      isHr(actor) ||
      has(actor, PERMISSIONS.PERFORMANCE_GOALS_WRITE);
    if (!canClose) {
      throw new ForbiddenError("Not allowed to close this goal");
    }
    const updated = await this.goals.update(id, { status });
    await this.audit.append({
      actorUserId: actor.userId,
      entityType: "Goal",
      entityId: id,
      action: status.toLowerCase(),
    });
    return updated;
  }
}

/**
 * Lists goals visible to the actor.
 */
export class ListGoalsUseCase {
  constructor(
    private readonly goals: IGoalRepository,
    private readonly employees: IEmployeeRepository,
  ) {}

  async execute(
    actor: PerformanceActor,
    filter: {
      readonly employeeId?: string;
      readonly departmentId?: string;
      readonly level?: GoalLevel;
      readonly status?: GoalStatus;
      readonly parentGoalId?: string;
      readonly mine?: boolean;
      readonly pagination: import("../../../../shared/utils/pagination").PaginationParams;
    },
  ) {
    const reports = has(actor, PERMISSIONS.PERFORMANCE_GOALS_READ)
      ? (await this.employees.listDirectory({ managerId: actor.employeeId })).items
      : [];
    const reportIds = new Set(reports.map((item) => item.id));

    if (filter.mine) {
      return this.goals.list({ employeeId: actor.employeeId, pagination: filter.pagination });
    }

    if (isHr(actor) || has(actor, PERMISSIONS.PERFORMANCE_GOALS_WRITE)) {
      return this.goals.list({
        employeeId: filter.employeeId,
        departmentId: filter.departmentId,
        level: filter.level,
        status: filter.status,
        parentGoalId: filter.parentGoalId,
        pagination: filter.pagination,
      });
    }

    const result = await this.goals.list({
      employeeId: filter.employeeId,
      employeeIds:
        filter.employeeId || filter.mine
          ? undefined
          : has(actor, PERMISSIONS.PERFORMANCE_GOALS_READ)
            ? [actor.employeeId, ...reportIds]
            : [actor.employeeId],
      departmentId: filter.departmentId,
      level: filter.level,
      status: filter.status,
      parentGoalId: filter.parentGoalId,
      pagination: filter.pagination,
    });
    return {
      total: result.total,
      items: result.items.filter((item) => canReadGoal(actor, item, reportIds)),
    };
  }
}

/**
 * Loads a single goal if the actor may see it.
 */
export class GetGoalUseCase {
  constructor(
    private readonly goals: IGoalRepository,
    private readonly employees: IEmployeeRepository,
  ) {}

  async execute(actor: PerformanceActor, id: string): Promise<GoalDetail> {
    const goal = await this.goals.findById(id);
    if (!goal) {
      throw new NotFoundError("Goal not found");
    }
    const reports = has(actor, PERMISSIONS.PERFORMANCE_GOALS_READ)
      ? (await this.employees.listDirectory({ managerId: actor.employeeId })).items
      : [];
    if (!canReadGoal(actor, goal, new Set(reports.map((item) => item.id)))) {
      throw new ForbiddenError("Not allowed to view this goal");
    }
    return goal;
  }
}
