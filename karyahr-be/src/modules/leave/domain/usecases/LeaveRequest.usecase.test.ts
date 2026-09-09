import { describe, expect, test } from "bun:test";
import { ConflictError, ForbiddenError, ValidationError } from "../../../../shared/errors/app-error";
import { jakartaDateToWorkDate } from "../../../../shared/utils/jakarta-time";
import type { AuthUser } from "../../../auth/domain/entities/AuthUser";
import type { IUserRepository } from "../../../auth/domain/repositories/IUserRepository";
import type { Employee } from "../../../employees/domain/entities/Employee";
import type { IEmployeeRepository } from "../../../employees/domain/repositories/IEmployeeRepository";
import type { NotificationEvent } from "../../../notifications/domain/entities/Notification";
import type { INotificationDispatcher } from "../../../notifications/domain/ports/INotificationDispatcher";
import type { IObjectStorage } from "../../../../shared/storage/IObjectStorage";
import type { Readable } from "node:stream";
import type {
  LeaveApproval,
  LeaveAttachment,
  LeaveBalance,
  LeavePolicy,
  LeaveRequest,
  LeaveRequestDetail,
  LeaveType,
} from "../entities/Leave";
import { availableBalanceDays, resolveLeavePolicy } from "../leave-invariants";
import type {
  ILeaveApprovalRepository,
  ILeaveAttachmentRepository,
  ILeaveBalanceRepository,
  ILeavePolicyRepository,
  ILeaveRequestRepository,
  ILeaveTypeRepository,
} from "../repositories/ILeaveRepository";
import { AccrueAnnualLeaveUseCase } from "./AccrueAnnualLeave.usecase";
import {
  ApproveLeaveRequestUseCase,
  CreateLeaveRequestUseCase,
  RejectLeaveRequestUseCase,
  type LeaveActor,
} from "./LeaveRequest.usecase";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";

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

const annual: LeaveType = {
  id: "t-annual",
  code: "ANNUAL",
  name: "Cuti tahunan",
  requiresBalance: true,
  requiresAttachment: false,
  isActive: true,
};

const policy: LeavePolicy = {
  id: "pol1",
  leaveTypeId: annual.id,
  departmentId: null,
  positionId: null,
  annualAllowanceDays: 12,
  approvalLevelCount: 2,
  accrualPerMonth: 1,
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
  async listDirectory() {
    return this.items;
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

class MemoryTypes implements ILeaveTypeRepository {
  constructor(private readonly item: LeaveType) {}
  async create(): Promise<LeaveType> {
    return this.item;
  }
  async update(): Promise<LeaveType> {
    return this.item;
  }
  async findById(id: string): Promise<LeaveType | null> {
    return this.item.id === id ? this.item : null;
  }
  async findByCode(code: string): Promise<LeaveType | null> {
    return this.item.code === code ? this.item : null;
  }
  async list(): Promise<readonly LeaveType[]> {
    return [this.item];
  }
}

class MemoryPolicies implements ILeavePolicyRepository {
  constructor(private readonly items: LeavePolicy[]) {}
  async create(): Promise<LeavePolicy> {
    return this.items[0]!;
  }
  async update(): Promise<LeavePolicy> {
    return this.items[0]!;
  }
  async findById(): Promise<LeavePolicy | null> {
    return this.items[0] ?? null;
  }
  async listByLeaveType(): Promise<readonly LeavePolicy[]> {
    return this.items;
  }
  async list(): Promise<readonly LeavePolicy[]> {
    return this.items;
  }
}

class MemoryBalances implements ILeaveBalanceRepository {
  rows: LeaveBalance[] = [];
  async findByEmployeeTypeYear(
    employeeId: string,
    leaveTypeId: string,
    year: number,
  ): Promise<LeaveBalance | null> {
    return (
      this.rows.find(
        (row) => row.employeeId === employeeId && row.leaveTypeId === leaveTypeId && row.year === year,
      ) ?? null
    );
  }
  async upsert(input: {
    readonly employeeId: string;
    readonly leaveTypeId: string;
    readonly year: number;
    readonly entitledDays: number;
    readonly usedDays: number;
    readonly pendingDays: number;
    readonly lastAccruedYearMonth: number | null;
  }): Promise<LeaveBalance> {
    const existing = await this.findByEmployeeTypeYear(input.employeeId, input.leaveTypeId, input.year);
    if (!existing) {
      const row: LeaveBalance = { ...input, id: `b${this.rows.length + 1}` };
      this.rows.push(row);
      return row;
    }
    const next: LeaveBalance = { ...existing, ...input };
    this.rows = this.rows.map((row) => (row.id === existing.id ? next : row));
    return next;
  }
  async listByEmployee(employeeId: string, year: number): Promise<readonly LeaveBalance[]> {
    return this.rows.filter((row) => row.employeeId === employeeId && row.year === year);
  }
}

class MemoryRequests implements ILeaveRequestRepository {
  details: Array<{
    request: LeaveRequest;
    approvals: LeaveApproval[];
    attachments: LeaveAttachment[];
  }> = [];
  async create(
    input: Omit<LeaveRequest, "id">,
    approvals: readonly Omit<LeaveApproval, "id" | "requestId">[],
  ): Promise<LeaveRequestDetail> {
    const id = `lr${this.details.length + 1}`;
    const request: LeaveRequest = { ...input, id };
    const detail = {
      request,
      approvals: approvals.map((item, index) => ({
        ...item,
        id: `${id}-a${index + 1}`,
        requestId: id,
      })),
      attachments: [] as LeaveAttachment[],
    };
    this.details.push(detail);
    return detail;
  }
  async findById(id: string): Promise<LeaveRequestDetail | null> {
    return this.details.find((item) => item.request.id === id) ?? null;
  }
  async listByEmployee(employeeId: string): Promise<readonly LeaveRequest[]> {
    return this.details.filter((item) => item.request.employeeId === employeeId).map((item) => item.request);
  }
  async listPending(): Promise<readonly LeaveRequest[]> {
    return this.details.filter((item) => item.request.status === "PENDING").map((item) => item.request);
  }
  async listPendingForApprover(): Promise<readonly LeaveRequest[]> {
    return this.listPending();
  }
  async updateStatus(
    id: string,
    input: { readonly status: LeaveRequest["status"]; readonly currentStep: number },
  ): Promise<LeaveRequest> {
    const detail = this.details.find((item) => item.request.id === id)!;
    detail.request = { ...detail.request, ...input };
    return detail.request;
  }
  async findOverlapping(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<readonly LeaveRequest[]> {
    return this.details
      .filter(
        (item) =>
          item.request.employeeId === employeeId &&
          (item.request.status === "PENDING" || item.request.status === "APPROVED") &&
          item.request.startDate.getTime() <= endDate.getTime() &&
          item.request.endDate.getTime() >= startDate.getTime(),
      )
      .map((item) => item.request);
  }
}

class MemoryApprovals implements ILeaveApprovalRepository {
  constructor(private readonly requests: MemoryRequests) {}
  async decide(
    id: string,
    input: {
      readonly status: "APPROVED" | "REJECTED";
      readonly comment: string | null;
      readonly decidedAt: Date;
      readonly approverEmployeeId: string;
    },
  ): Promise<LeaveApproval> {
    for (const detail of this.requests.details) {
      const step = detail.approvals.find((item) => item.id === id);
      if (step) {
        Object.assign(step, input);
        return step;
      }
    }
    throw new Error("missing approval");
  }
}

class MemoryAttachments implements ILeaveAttachmentRepository {
  async create(input: Omit<LeaveAttachment, "id"> & { readonly id: string }): Promise<LeaveAttachment> {
    return input;
  }
}

const storage: IObjectStorage = {
  putObject: async () => {},
  getObject: async () => ({ stream: {} as Readable }),
  deleteObject: async () => {},
};

class MemoryAudit implements IAuditLogRepository {
  async append(): Promise<void> {}
}

class MemoryDispatcher implements INotificationDispatcher {
  events: NotificationEvent[] = [];
  async dispatch(event: NotificationEvent): Promise<void> {
    this.events.push(event);
  }
}

const employeeActor: LeaveActor = { userId: "u-e", employeeId: "e1", isHr: false };
const managerActor: LeaveActor = { userId: "u-m", employeeId: "m1", isHr: false };
const hrActor: LeaveActor = { userId: "u-hr", employeeId: "hr1", isHr: true };

function harness() {
  const balances = new MemoryBalances();
  balances.rows.push({
    id: "b1",
    employeeId: "e1",
    leaveTypeId: annual.id,
    year: 2026,
    entitledDays: 12,
    usedDays: 0,
    pendingDays: 0,
    lastAccruedYearMonth: 202608,
  });
  const requests = new MemoryRequests();
  const dispatcher = new MemoryDispatcher();
  const users = new MemoryUsers([
    managerUser,
    employeeUser,
    {
      id: "u-hr",
      email: "hr@local",
      passwordHash: "x",
      employeeId: "hr1",
      isActive: true,
      roleNames: ["hr_admin"],
      permissionKeys: [],
    },
  ]);
  const create = new CreateLeaveRequestUseCase(
    new MemoryEmployees([employee]),
    users,
    new MemoryTypes(annual),
    new MemoryPolicies([policy]),
    balances,
    requests,
    new MemoryAttachments(),
    storage,
    dispatcher,
    new MemoryAudit(),
    1024,
    () => new Date("2026-09-08T01:00:00.000Z"),
  );
  const approve = new ApproveLeaveRequestUseCase(
    new MemoryEmployees([employee]),
    users,
    new MemoryTypes(annual),
    balances,
    requests,
    new MemoryApprovals(requests),
    dispatcher,
    new MemoryAudit(),
    () => new Date("2026-09-08T02:00:00.000Z"),
  );
  const reject = new RejectLeaveRequestUseCase(
    users,
    new MemoryTypes(annual),
    balances,
    requests,
    new MemoryApprovals(requests),
    dispatcher,
    new MemoryAudit(),
    () => new Date("2026-09-08T02:00:00.000Z"),
  );
  return { create, approve, reject, balances, requests, dispatcher };
}

describe("leave invariants", () => {
  test("prefers position policy over global", () => {
    const picked = resolveLeavePolicy(
      [
        policy,
        { ...policy, id: "pos", positionId: "p1", annualAllowanceDays: 15 },
      ],
      "d1",
      "p1",
    );
    expect(picked?.id).toBe("pos");
  });

  test("computes remaining balance", () => {
    expect(
      availableBalanceDays({
        id: "b",
        employeeId: "e1",
        leaveTypeId: "t",
        year: 2026,
        entitledDays: 12,
        usedDays: 2,
        pendingDays: 3,
        lastAccruedYearMonth: null,
      }),
    ).toBe(7);
  });
});

describe("leave request flow", () => {
  test("reserves balance and notifies the manager", async () => {
    const { create, balances, dispatcher } = harness();
    const detail = await create.execute(employeeActor, {
      leaveTypeId: annual.id,
      startDate: jakartaDateToWorkDate(2026, 9, 10),
      endDate: jakartaDateToWorkDate(2026, 9, 11),
      reason: "family",
    });
    expect(detail.request.days).toBe(2);
    expect(balances.rows[0]?.pendingDays).toBe(2);
    expect(dispatcher.events[0]?.type).toBe("leave.submitted");
    expect(dispatcher.events[0]?.recipientUserId).toBe("u-m");
  });

  test("rejects overlapping pending leave", async () => {
    const { create } = harness();
    const input = {
      leaveTypeId: annual.id,
      startDate: jakartaDateToWorkDate(2026, 9, 10),
      endDate: jakartaDateToWorkDate(2026, 9, 11),
      reason: "family",
    };
    await create.execute(employeeActor, input);
    expect(create.execute(employeeActor, input)).rejects.toBeInstanceOf(ValidationError);
  });

  test("rejects a manager acting on the HR step", async () => {
    const { create, approve } = harness();
    const detail = await create.execute(employeeActor, {
      leaveTypeId: annual.id,
      startDate: jakartaDateToWorkDate(2026, 9, 10),
      endDate: jakartaDateToWorkDate(2026, 9, 10),
      reason: "one day",
    });
    await approve.execute(managerActor, detail.request.id, null);
    expect(approve.execute(managerActor, detail.request.id, null)).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("consumes balance on final HR approval", async () => {
    const { create, approve, balances } = harness();
    const detail = await create.execute(employeeActor, {
      leaveTypeId: annual.id,
      startDate: jakartaDateToWorkDate(2026, 9, 10),
      endDate: jakartaDateToWorkDate(2026, 9, 10),
      reason: "one day",
    });
    await approve.execute(managerActor, detail.request.id, "ok");
    const final = await approve.execute(hrActor, detail.request.id, "ok");
    expect(final.request.status).toBe("APPROVED");
    expect(balances.rows[0]?.usedDays).toBe(1);
    expect(balances.rows[0]?.pendingDays).toBe(0);
  });

  test("releases reserved days on reject", async () => {
    const { create, reject, balances } = harness();
    const detail = await create.execute(employeeActor, {
      leaveTypeId: annual.id,
      startDate: jakartaDateToWorkDate(2026, 9, 10),
      endDate: jakartaDateToWorkDate(2026, 9, 10),
      reason: "one day",
    });
    await reject.execute(managerActor, detail.request.id, "busy");
    expect(balances.rows[0]?.pendingDays).toBe(0);
    expect(balances.rows[0]?.usedDays).toBe(0);
  });

  test("rejects insufficient balance", async () => {
    const { create, balances } = harness();
    balances.rows[0] = { ...balances.rows[0]!, entitledDays: 1, usedDays: 1, pendingDays: 0 };
    expect(
      create.execute(employeeActor, {
        leaveTypeId: annual.id,
        startDate: jakartaDateToWorkDate(2026, 9, 10),
        endDate: jakartaDateToWorkDate(2026, 9, 10),
        reason: "one day",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("AccrueAnnualLeaveUseCase", () => {
  test("is idempotent for the same Jakarta year-month", async () => {
    const balances = new MemoryBalances();
    const useCase = new AccrueAnnualLeaveUseCase(
      new MemoryEmployees([employee]),
      new MemoryTypes(annual),
      new MemoryPolicies([policy]),
      balances,
      () => new Date("2026-09-08T01:00:00.000Z"),
    );
    expect((await useCase.execute()).accrued).toBe(1);
    expect(balances.rows[0]?.entitledDays).toBe(1);
    expect((await useCase.execute()).accrued).toBe(0);
    expect(balances.rows[0]?.entitledDays).toBe(1);
  });
});
