import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { ConflictError, NotFoundError } from "../../../../shared/errors/app-error";
import type { IRefreshTokenRepository } from "../../../auth/domain/repositories/IRefreshTokenRepository";
import type { IUserRepository } from "../../../auth/domain/repositories/IUserRepository";
import type { Employee } from "../entities/Employee";
import type { IEmployeeRepository } from "../repositories/IEmployeeRepository";

export type OffboardEmployeeInput = {
  readonly employeeId: string;
  readonly actorUserId: string;
  readonly actorEmployeeId: string;
  readonly reason?: string;
};

function snapshotEmployee(employee: Employee): Record<string, unknown> {
  return {
    id: employee.id,
    fullName: employee.fullName,
    nationalId: employee.nationalId,
    birthDate: employee.birthDate.toISOString(),
    address: employee.address,
    phone: employee.phone,
    emergencyContact: employee.emergencyContact,
    employeeNumber: employee.employeeNumber,
    departmentId: employee.departmentId,
    positionId: employee.positionId,
    managerId: employee.managerId,
    joinedAt: employee.joinedAt.toISOString(),
    status: employee.status,
    contractType: employee.contractType,
  };
}

/**
 * Deactivates an employee, freezes a snapshot, and revokes login sessions.
 */
export class OffboardEmployeeUseCase {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly users: IUserRepository,
    private readonly refreshTokens: IRefreshTokenRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(input: OffboardEmployeeInput): Promise<Employee> {
    const current = await this.employees.findById(input.employeeId);
    if (!current) {
      throw new NotFoundError("Employee not found");
    }
    if (current.status === "INACTIVE") {
      throw new ConflictError("Employee is already inactive");
    }
    if (input.actorEmployeeId === input.employeeId) {
      throw new ConflictError("Cannot offboard yourself");
    }

    await this.audit.append({
      actorUserId: input.actorUserId,
      entityType: "Employee",
      entityId: current.id,
      action: "offboard",
      metadata: {
        snapshot: snapshotEmployee(current),
        ...(input.reason !== undefined ? { reason: input.reason } : {}),
      },
    });

    const employee = await this.employees.update(input.employeeId, { status: "INACTIVE" });
    await this.users.setActiveByEmployeeId(input.employeeId, false);

    const user = await this.users.findByEmployeeId(input.employeeId);
    if (user) {
      await this.refreshTokens.revokeAllForUser(user.id, new Date());
    }

    return employee;
  }
}
