import { describe, expect, test } from "bun:test";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { LeavePolicy, LeaveType } from "../entities/Leave";
import type { ILeavePolicyRepository, ILeaveTypeRepository } from "../repositories/ILeaveRepository";
import {
  CreateLeavePolicyUseCase,
  CreateLeaveTypeUseCase,
  ListLeavePoliciesUseCase,
  ListLeaveTypesUseCase,
  UpdateLeavePolicyUseCase,
  UpdateLeaveTypeUseCase,
} from "./LeaveCatalog.usecase";

class MemoryTypes implements ILeaveTypeRepository {
  constructor(private rows: LeaveType[] = []) {}
  async create(input: Omit<LeaveType, "id">): Promise<LeaveType> {
    const row: LeaveType = { id: `t${this.rows.length + 1}`, ...input };
    this.rows.push(row);
    return row;
  }
  async update(id: string, input: Partial<LeaveType>): Promise<LeaveType> {
    this.rows = this.rows.map((row) => (row.id === id ? { ...row, ...input } : row));
    return (await this.findById(id))!;
  }
  async findById(id: string): Promise<LeaveType | null> {
    return this.rows.find((row) => row.id === id) ?? null;
  }
  async findByCode(code: string): Promise<LeaveType | null> {
    return this.rows.find((row) => row.code === code) ?? null;
  }
  async list(): Promise<readonly LeaveType[]> {
    return this.rows;
  }
}

class MemoryPolicies implements ILeavePolicyRepository {
  constructor(private rows: LeavePolicy[] = []) {}
  async create(input: Omit<LeavePolicy, "id">): Promise<LeavePolicy> {
    const row: LeavePolicy = { id: `p${this.rows.length + 1}`, ...input };
    this.rows.push(row);
    return row;
  }
  async update(id: string, input: Partial<LeavePolicy>): Promise<LeavePolicy> {
    this.rows = this.rows.map((row) => (row.id === id ? { ...row, ...input } : row));
    return (await this.findById(id))!;
  }
  async findById(id: string): Promise<LeavePolicy | null> {
    return this.rows.find((row) => row.id === id) ?? null;
  }
  async listByLeaveType(leaveTypeId: string): Promise<readonly LeavePolicy[]> {
    return this.rows.filter((row) => row.leaveTypeId === leaveTypeId);
  }
  async list(): Promise<readonly LeavePolicy[]> {
    return this.rows;
  }
}

const audit: IAuditLogRepository = { append: async () => undefined };

describe("leave catalog", () => {
  test("creates and updates leave types", async () => {
    const types = new MemoryTypes();
    const created = await new CreateLeaveTypeUseCase(types, audit).execute(
      { code: "ANNUAL", name: "Cuti", requiresBalance: true, requiresAttachment: false, isActive: true },
      "u1",
    );
    await expect(
      new CreateLeaveTypeUseCase(types, audit).execute(
        { code: "ANNUAL", name: "X", requiresBalance: true, requiresAttachment: false, isActive: true },
        "u1",
      ),
    ).rejects.toBeInstanceOf(ConflictError);
    const updated = await new UpdateLeaveTypeUseCase(types, audit).execute(created.id, { name: "Tahunan" }, "u1");
    expect(updated.name).toBe("Tahunan");
    await expect(
      new UpdateLeaveTypeUseCase(types, audit).execute("missing", { name: "x" }, "u1"),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(await new ListLeaveTypesUseCase(types).execute()).toHaveLength(1);
  });

  test("creates policies with approval levels 1 or 2", async () => {
    const types = new MemoryTypes();
    const policies = new MemoryPolicies();
    const leaveType = await new CreateLeaveTypeUseCase(types, audit).execute(
      { code: "SICK", name: "Sakit", requiresBalance: false, requiresAttachment: true, isActive: true },
      "u1",
    );
    const created = await new CreateLeavePolicyUseCase(types, policies, audit).execute(
      {
        leaveTypeId: leaveType.id,
        departmentId: null,
        positionId: null,
        annualAllowanceDays: 12,
        approvalLevelCount: 2,
        accrualPerMonth: 1,
      },
      "u1",
    );
    expect(created.approvalLevelCount).toBe(2);
    await expect(
      new CreateLeavePolicyUseCase(types, policies, audit).execute(
        {
          leaveTypeId: leaveType.id,
          departmentId: null,
          positionId: null,
          annualAllowanceDays: 12,
          approvalLevelCount: 3,
          accrualPerMonth: 1,
        },
        "u1",
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      new CreateLeavePolicyUseCase(types, policies, audit).execute(
        {
          leaveTypeId: "missing",
          departmentId: null,
          positionId: null,
          annualAllowanceDays: 12,
          approvalLevelCount: 1,
          accrualPerMonth: 1,
        },
        "u1",
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      new UpdateLeavePolicyUseCase(policies, audit).execute(created.id, { approvalLevelCount: 0 }, "u1"),
    ).rejects.toBeInstanceOf(ValidationError);
    const updated = await new UpdateLeavePolicyUseCase(policies, audit).execute(
      created.id,
      { approvalLevelCount: 1 },
      "u1",
    );
    expect(updated.approvalLevelCount).toBe(1);
    await expect(
      new UpdateLeavePolicyUseCase(policies, audit).execute("missing", { annualAllowanceDays: 1 }, "u1"),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(await new ListLeavePoliciesUseCase(policies).execute()).toHaveLength(1);
  });
});
