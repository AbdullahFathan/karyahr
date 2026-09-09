import { describe, expect, test } from "bun:test";
import { ForbiddenError, ValidationError } from "../../../../shared/errors/app-error";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { PERMISSIONS } from "../../../../shared/auth/permissions";
import type { AuthUser } from "../../../auth/domain/entities/AuthUser";
import type { IUserRepository } from "../../../auth/domain/repositories/IUserRepository";
import type { Employee } from "../../../employees/domain/entities/Employee";
import type { IEmployeeRepository } from "../../../employees/domain/repositories/IEmployeeRepository";
import type { NotificationEvent } from "../../../notifications/domain/entities/Notification";
import type { INotificationDispatcher } from "../../../notifications/domain/ports/INotificationDispatcher";
import type { GoalDetail } from "../entities/Performance";
import { assertParentLevel, computeProgressPercent } from "../performance-invariants";
import type { CreateGoalInput, GoalListFilter, IGoalRepository, UpdateGoalInput } from "../repositories/IPerformanceRepository";
import {
  ApproveGoalUseCase,
  CloseGoalUseCase,
  CreateGoalUseCase,
  DecideGoalUseCase,
  GetGoalUseCase,
  ListGoalsUseCase,
  RejectGoalUseCase,
  SubmitGoalUseCase,
  UpdateGoalProgressUseCase,
  UpdateGoalUseCase,
  type PerformanceActor,
} from "./Goal.usecase";

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

const employeeUser: AuthUser = {
  id: "u-e",
  email: "siti@local",
  passwordHash: "x",
  employeeId: "e1",
  isActive: true,
  roleNames: ["employee"],
  permissionKeys: [],
};

const managerUser: AuthUser = {
  id: "u-m",
  email: "manager@local",
  passwordHash: "x",
  employeeId: "m1",
  isActive: true,
  roleNames: ["manager"],
  permissionKeys: [],
};

class MemoryGoals implements IGoalRepository {
  private readonly items: GoalDetail[] = [];

  async create(input: CreateGoalInput): Promise<GoalDetail> {
    const id = `g${this.items.length + 1}`;
    const detail: GoalDetail = {
      id,
      level: input.level,
      parentGoalId: input.parentGoalId,
      departmentId: input.departmentId,
      employeeId: input.employeeId,
      ownerUserId: input.ownerUserId,
      status: input.status,
      title: input.title,
      description: input.description,
      progressPercent: input.progressPercent,
      keyResults: input.keyResults.map((item, index) => ({
        id: `${id}-kr${index}`,
        goalId: id,
        ...item,
      })),
    };
    this.items.push(detail);
    return detail;
  }

  async update(id: string, input: UpdateGoalInput): Promise<GoalDetail> {
    const index = this.items.findIndex((item) => item.id === id);
    const current = this.items[index]!;
    const next = { ...current, ...input };
    this.items[index] = next;
    return next;
  }

  async replaceKeyResults(
    goalId: string,
    keyResults: CreateGoalInput["keyResults"],
    progressPercent: number,
  ): Promise<GoalDetail> {
    const index = this.items.findIndex((item) => item.id === goalId);
    const current = this.items[index]!;
    const next: GoalDetail = {
      ...current,
      progressPercent,
      keyResults: keyResults.map((item, krIndex) => ({
        id: `${goalId}-kr${krIndex}`,
        goalId,
        ...item,
      })),
    };
    this.items[index] = next;
    return next;
  }

  async findById(id: string): Promise<GoalDetail | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  async list(filter: GoalListFilter) {
    const items = this.items.filter((item) => {
      if (filter.employeeId && item.employeeId !== filter.employeeId) {
        return false;
      }
      if (filter.level && item.level !== filter.level) {
        return false;
      }
      if (filter.status && item.status !== filter.status) {
        return false;
      }
      return true;
    });
    const page = filter.pagination
      ? items.slice(filter.pagination.skip, filter.pagination.skip + filter.pagination.take)
      : items;
    return { items: page, total: items.length };
  }
}

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
  async listByRoleName(roleName: string): Promise<readonly AuthUser[]> {
    return this.items.filter((item) => item.roleNames.includes(roleName));
  }
  async setActiveByEmployeeId(): Promise<void> {}
  async create(): Promise<AuthUser> {
    return this.items[0]!;
  }
}

class MemoryAudit implements IAuditLogRepository {
  readonly records: unknown[] = [];
  async append(record: { actorUserId: string; entityType: string; entityId: string; action: string }): Promise<void> {
    this.records.push(record);
  }
}

class MemoryDispatcher implements INotificationDispatcher {
  readonly events: NotificationEvent[] = [];
  async dispatch(event: NotificationEvent): Promise<void> {
    this.events.push(event);
  }
}

function employeeActor(): PerformanceActor {
  return {
    userId: employeeUser.id,
    employeeId: employee.id,
    permissionKeys: [PERMISSIONS.PERFORMANCE_GOALS_ME],
  };
}

function managerActor(): PerformanceActor {
  return {
    userId: managerUser.id,
    employeeId: manager.id,
    permissionKeys: [PERMISSIONS.PERFORMANCE_GOALS_APPROVE, PERMISSIONS.PERFORMANCE_GOALS_READ],
  };
}

function hrActor(): PerformanceActor {
  return {
    userId: "u-hr",
    employeeId: "hr1",
    permissionKeys: [PERMISSIONS.PERFORMANCE_GOALS_WRITE, PERMISSIONS.PERFORMANCE_CYCLES_WRITE],
  };
}

describe("goal cascade invariants", () => {
  test("rejects an employee parent for a department goal", () => {
    expect(() => assertParentLevel("DEPARTMENT", "EMPLOYEE")).toThrow(ValidationError);
  });

  test("computes weighted progress", () => {
    expect(
      computeProgressPercent([
        { id: "1", goalId: "g", title: "a", targetValue: 10, currentValue: 5, weight: 50 },
        { id: "2", goalId: "g", title: "b", targetValue: 10, currentValue: 10, weight: 50 },
      ]),
    ).toBe(75);
  });
});

describe("CreateGoalUseCase", () => {
  test("forces employee-level goals onto the caller without write permission", async () => {
    const goals = new MemoryGoals();
    const usecase = new CreateGoalUseCase(goals, new MemoryEmployees([employee, manager]), new MemoryAudit());
    const created = await usecase.execute(employeeActor(), {
      level: "EMPLOYEE",
      employeeId: "someone-else",
      title: "Ship ATS",
      description: "Close recruitment v1",
      keyResults: [{ title: "PRs", targetValue: 10, weight: 100 }],
    });
    expect(created.employeeId).toBe("e1");
    expect(created.status).toBe("DRAFT");
  });

  test("rejects company goals from employees", async () => {
    const usecase = new CreateGoalUseCase(
      new MemoryGoals(),
      new MemoryEmployees([employee]),
      new MemoryAudit(),
    );
    await expect(
      usecase.execute(employeeActor(), { level: "COMPANY", title: "OKR", description: "x" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("rejects a lower-level parent", async () => {
    const goals = new MemoryGoals();
    const employees = new MemoryEmployees([employee, manager]);
    const create = new CreateGoalUseCase(goals, employees, new MemoryAudit());
    const child = await create.execute(employeeActor(), {
      level: "EMPLOYEE",
      title: "Leaf",
      description: "x",
    });
    await expect(
      create.execute(hrActor(), {
        level: "COMPANY",
        parentGoalId: child.id,
        title: "Up",
        description: "x",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("goal approval", () => {
  test("manager approves a submitted employee goal", async () => {
    const goals = new MemoryGoals();
    const employees = new MemoryEmployees([employee, manager]);
    const users = new MemoryUsers([employeeUser, managerUser]);
    const dispatcher = new MemoryDispatcher();
    const create = new CreateGoalUseCase(goals, employees, new MemoryAudit());
    const submit = new SubmitGoalUseCase(goals, employees, users, dispatcher, new MemoryAudit());
    const decide = new DecideGoalUseCase(goals, employees, users, dispatcher, new MemoryAudit());
    const created = await create.execute(employeeActor(), {
      level: "EMPLOYEE",
      title: "KPI",
      description: "x",
    });
    await submit.execute(employeeActor(), created.id);
    expect(dispatcher.events.some((event) => event.type === "performance.goal_submitted")).toBe(true);
    const approved = await new ApproveGoalUseCase(decide).execute(managerActor(), created.id);
    expect(approved.status).toBe("ACTIVE");
  });

  test("non-manager cannot approve", async () => {
    const goals = new MemoryGoals();
    const employees = new MemoryEmployees([employee, manager]);
    const users = new MemoryUsers([employeeUser, managerUser]);
    const dispatcher = new MemoryDispatcher();
    const create = new CreateGoalUseCase(goals, employees, new MemoryAudit());
    const submit = new SubmitGoalUseCase(goals, employees, users, dispatcher, new MemoryAudit());
    const decide = new DecideGoalUseCase(goals, employees, users, dispatcher, new MemoryAudit());
    const created = await create.execute(employeeActor(), { level: "EMPLOYEE", title: "KPI", description: "x" });
    await submit.execute(employeeActor(), created.id);
    await expect(new RejectGoalUseCase(decide).execute(employeeActor(), created.id)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});

describe("goal update progress close and list", () => {
  test("owner updates a draft, then progress after approval, then closes", async () => {
    const goals = new MemoryGoals();
    const employees = new MemoryEmployees([employee, manager]);
    const users = new MemoryUsers([employeeUser, managerUser]);
    const dispatcher = new MemoryDispatcher();
    const audit = new MemoryAudit();
    const create = new CreateGoalUseCase(goals, employees, audit);
    const created = await create.execute(employeeActor(), {
      level: "EMPLOYEE",
      title: "KPI",
      description: "x",
      keyResults: [{ title: "PRs", targetValue: 10, weight: 100, currentValue: 0 }],
    });
    const updated = await new UpdateGoalUseCase(goals, audit).execute(employeeActor(), created.id, {
      title: "KPI v2",
    });
    expect(updated.title).toBe("KPI v2");
    await new SubmitGoalUseCase(goals, employees, users, dispatcher, audit).execute(employeeActor(), created.id);
    await new ApproveGoalUseCase(
      new DecideGoalUseCase(goals, employees, users, dispatcher, audit),
    ).execute(managerActor(), created.id);
    const progressed = await new UpdateGoalProgressUseCase(goals, audit).execute(employeeActor(), created.id, [
      { title: "PRs", targetValue: 10, weight: 100, currentValue: 5 },
    ]);
    expect(progressed.progressPercent).toBe(50);
    const closed = await new CloseGoalUseCase(goals, audit).execute(employeeActor(), created.id, "COMPLETED");
    expect(closed.status).toBe("COMPLETED");
    const listed = await new ListGoalsUseCase(goals, employees).execute(hrActor(), {
      pagination: { page: 1, pageSize: 20, skip: 0, take: 20 },
    });
    expect(listed.total).toBe(1);
    const mine = await new ListGoalsUseCase(goals, employees).execute(employeeActor(), {
      mine: true,
      pagination: { page: 1, pageSize: 20, skip: 0, take: 20 },
    });
    expect(mine.total).toBe(1);
    expect((await new GetGoalUseCase(goals, employees).execute(employeeActor(), created.id)).id).toBe(created.id);
  });

  test("forbids a stranger from viewing or updating", async () => {
    const goals = new MemoryGoals();
    const employees = new MemoryEmployees([employee, manager]);
    const created = await new CreateGoalUseCase(goals, employees, new MemoryAudit()).execute(employeeActor(), {
      level: "EMPLOYEE",
      title: "KPI",
      description: "x",
    });
    const stranger: PerformanceActor = { userId: "u-x", employeeId: "x1", permissionKeys: [] };
    await expect(new GetGoalUseCase(goals, employees).execute(stranger, created.id)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await expect(
      new UpdateGoalUseCase(goals, new MemoryAudit()).execute(stranger, created.id, { title: "no" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
