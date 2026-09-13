import { describe, expect, test } from "bun:test";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { ForbiddenError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import { requireAnyPermission, requirePermission } from "../../../../shared/middleware/require-permission";
import type {
  ChangeRequestInboxItem,
  ChangeRequestStatus,
  Employee,
  EmployeeChangeRequest,
  EssPayload,
} from "../entities/Employee";
import type {
  IEmployeeChangeRequestRepository,
  IEmployeeRepository,
  UpdateEmployeeInput,
} from "../repositories/IEmployeeRepository";
import {
  ApproveChangeRequestUseCase,
  CreateChangeRequestUseCase,
  ListChangeRequestsUseCase,
  ListMyChangeRequestsUseCase,
  RejectChangeRequestUseCase,
} from "./EmployeeChangeRequest.usecase";
import { CreateEmployeeMutationUseCase, ListEmployeeMutationsUseCase } from "./EmployeeMutation.usecase";

function sampleEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
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
    managerId: null,
    joinedAt: new Date("2024-01-01"),
    status: "ACTIVE",
    contractType: "PERMANENT",
    ...overrides,
  };
}

class MemoryEmployees implements IEmployeeRepository {
  constructor(private employee: Employee) {}
  async create(): Promise<Employee> {
    return this.employee;
  }
  async update(_id: string, input: UpdateEmployeeInput): Promise<Employee> {
    this.employee = { ...this.employee, ...input };
    return this.employee;
  }
  async findById(id: string): Promise<Employee | null> {
    return this.employee.id === id ? this.employee : null;
  }
  async findByIds(ids: readonly string[]): Promise<readonly Employee[]> {
    return ids.includes(this.employee.id) ? [this.employee] : [];
  }
  async findByNationalId(): Promise<Employee | null> {
    return null;
  }
  async findByEmployeeNumber(): Promise<Employee | null> {
    return null;
  }
  async list() {
    return { items: [this.employee], total: 1 };
  }
  async listDirectory() {
    return { items: [this.employee], total: 1 };
  }
}

class MemoryRequests implements IEmployeeChangeRequestRepository {
  private rows: EmployeeChangeRequest[] = [];
  async create(input: {
    readonly employeeId: string;
    readonly payload: EssPayload;
  }): Promise<EmployeeChangeRequest> {
    const row: EmployeeChangeRequest = {
      id: "cr1",
      employeeId: input.employeeId,
      payload: input.payload,
      status: "PENDING",
      reviewerUserId: null,
      reviewNote: null,
    };
    this.rows.push(row);
    return row;
  }
  async findById(id: string): Promise<EmployeeChangeRequest | null> {
    return this.rows.find((row) => row.id === id) ?? null;
  }
  async listByEmployee(): Promise<EmployeeChangeRequest[]> {
    return this.rows;
  }
  async listInbox(status: ChangeRequestStatus): Promise<ChangeRequestInboxItem[]> {
    return this.rows
      .filter((row) => row.status === status)
      .map((row) => ({
        ...row,
        employee: { id: "e1", fullName: "Siti", employeeNumber: "EMP-1" },
      }));
  }
  async review(
    id: string,
    input: {
      readonly status: "APPROVED" | "REJECTED";
      readonly reviewerUserId: string;
      readonly reviewNote: string | null;
    },
  ): Promise<EmployeeChangeRequest> {
    this.rows = this.rows.map((row) =>
      row.id === id
        ? {
            ...row,
            status: input.status,
            reviewerUserId: input.reviewerUserId,
            reviewNote: input.reviewNote,
          }
        : row,
    );
    return (await this.findById(id))!;
  }
}

const silentAudit: IAuditLogRepository = {
  append: async () => undefined,
};

describe("CreateChangeRequestUseCase", () => {
  test("stores an ESS payload", async () => {
    const employees = new MemoryEmployees(sampleEmployee());
    const requests = new MemoryRequests();
    const created = await new CreateChangeRequestUseCase(employees, requests, silentAudit).execute(
      "e1",
      { phone: "083" },
      "u1",
    );
    expect(created.payload.phone).toBe("083");
  });
});

describe("ApproveChangeRequestUseCase", () => {
  test("applies payload to the employee", async () => {
    const employees = new MemoryEmployees(sampleEmployee());
    const requests = new MemoryRequests();
    await requests.create({ employeeId: "e1", payload: { address: "Bandung" } });
    await new ApproveChangeRequestUseCase(employees, requests, silentAudit).execute(
      "cr1",
      "hr1",
      null,
    );
    const updated = await employees.findById("e1");
    expect(updated?.address).toBe("Bandung");
  });
});

describe("RejectChangeRequestUseCase", () => {
  test("rejects a pending request", async () => {
    const requests = new MemoryRequests();
    await requests.create({ employeeId: "e1", payload: { phone: "083" } });
    const rejected = await new RejectChangeRequestUseCase(requests, silentAudit).execute(
      "cr1",
      "hr1",
      "no",
    );
    expect(rejected.status).toBe("REJECTED");
    expect(await new ListMyChangeRequestsUseCase(requests).execute("e1")).toHaveLength(1);
  });

  test("lists pending inbox items", async () => {
    const requests = new MemoryRequests();
    await requests.create({ employeeId: "e1", payload: { phone: "083" } });
    const inbox = await new ListChangeRequestsUseCase(requests).execute("PENDING");
    expect(inbox).toHaveLength(1);
    expect(inbox[0]?.employee.fullName).toBe("Siti");
    expect(await new ListChangeRequestsUseCase(requests).execute("APPROVED")).toHaveLength(0);
  });

  test("throws when the request is missing or already reviewed", async () => {
    const requests = new MemoryRequests();
    await expect(
      new RejectChangeRequestUseCase(requests, silentAudit).execute("missing", "hr1", null),
    ).rejects.toBeInstanceOf(NotFoundError);
    await requests.create({ employeeId: "e1", payload: { phone: "083" } });
    await new RejectChangeRequestUseCase(requests, silentAudit).execute("cr1", "hr1", null);
    await expect(
      new RejectChangeRequestUseCase(requests, silentAudit).execute("cr1", "hr1", null),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("CreateEmployeeMutationUseCase", () => {
  test("moves department and position", async () => {
    const employees = new MemoryEmployees(sampleEmployee());
    const mutations = {
      async create(input: Omit<import("../entities/Employee").EmployeeMutation, "id">) {
        return { id: "m1", ...input };
      },
      async listByEmployee() {
        return [];
      },
    };
    const mutation = await new CreateEmployeeMutationUseCase(
      employees,
      mutations,
      silentAudit,
    ).execute({
      employeeId: "e1",
      toDepartmentId: "d2",
      toPositionId: "p2",
      effectiveAt: new Date(),
      reason: "Transfer",
      createdByUserId: "u1",
    });
    expect(mutation.toDepartmentId).toBe("d2");
    expect((await employees.findById("e1"))?.departmentId).toBe("d2");
    expect(await new ListEmployeeMutationsUseCase(employees, mutations).execute("e1")).toEqual([]);
  });

  test("rejects a no-op mutation", async () => {
    const employees = new MemoryEmployees(sampleEmployee());
    const mutations = {
      async create(input: Omit<import("../entities/Employee").EmployeeMutation, "id">) {
        return { id: "m1", ...input };
      },
      async listByEmployee() {
        return [];
      },
    };
    await expect(
      new CreateEmployeeMutationUseCase(employees, mutations, silentAudit).execute({
        employeeId: "e1",
        toDepartmentId: "d1",
        toPositionId: "p1",
        effectiveAt: new Date(),
        reason: "same",
        createdByUserId: "u1",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      new ListEmployeeMutationsUseCase(employees, mutations).execute("missing"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("requirePermission", () => {
  test("denies callers without the permission", () => {
    const mw = requirePermission("employees:write");
    let error: unknown;
    mw(
      { auth: { userId: "u1", employeeId: "e1", permissionKeys: ["auth:me"] } } as never,
      {} as never,
      (err?: unknown) => {
        error = err;
      },
    );
    expect(error).toBeInstanceOf(ForbiddenError);
  });
});

describe("requireAnyPermission", () => {
  test("allows callers who hold one of the listed permissions", () => {
    const mw = requireAnyPermission("performance:goals:me", "performance:goals:write");
    let error: unknown;
    let called = false;
    mw(
      {
        auth: {
          userId: "u1",
          employeeId: "e1",
          permissionKeys: ["performance:goals:me"],
        },
      } as never,
      {} as never,
      (err?: unknown) => {
        error = err;
        called = err === undefined;
      },
    );
    expect(error).toBeUndefined();
    expect(called).toBe(true);
  });

  test("denies callers who hold none of the listed permissions", () => {
    const mw = requireAnyPermission("performance:goals:me", "performance:goals:write");
    let error: unknown;
    mw(
      { auth: { userId: "u1", employeeId: "e1", permissionKeys: ["auth:me"] } } as never,
      {} as never,
      (err?: unknown) => {
        error = err;
      },
    );
    expect(error).toBeInstanceOf(ForbiddenError);
  });
});
