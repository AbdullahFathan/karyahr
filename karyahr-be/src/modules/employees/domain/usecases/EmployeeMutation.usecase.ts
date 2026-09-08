import { NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import type { EmployeeMutation } from "../entities/Employee";
import type {
  IEmployeeMutationRepository,
  IEmployeeRepository,
} from "../repositories/IEmployeeRepository";

/**
 * Records a department/position transfer and updates the employee.
 */
export class CreateEmployeeMutationUseCase {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly mutations: IEmployeeMutationRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(input: {
    readonly employeeId: string;
    readonly toDepartmentId: string;
    readonly toPositionId: string;
    readonly effectiveAt: Date;
    readonly reason: string;
    readonly createdByUserId: string;
  }): Promise<EmployeeMutation> {
    const employee = await this.employees.findById(input.employeeId);
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }
    if (
      employee.departmentId === input.toDepartmentId &&
      employee.positionId === input.toPositionId
    ) {
      throw new ValidationError("Mutation must change department or position");
    }
    const mutation = await this.mutations.create({
      employeeId: employee.id,
      fromDepartmentId: employee.departmentId,
      toDepartmentId: input.toDepartmentId,
      fromPositionId: employee.positionId,
      toPositionId: input.toPositionId,
      effectiveAt: input.effectiveAt,
      reason: input.reason,
      createdByUserId: input.createdByUserId,
    });
    await this.employees.update(employee.id, {
      departmentId: input.toDepartmentId,
      positionId: input.toPositionId,
    });
    await this.audit.append({
      actorUserId: input.createdByUserId,
      entityType: "Employee",
      entityId: employee.id,
      action: "mutation",
      metadata: { mutationId: mutation.id },
    });
    return mutation;
  }
}

/**
 * Lists mutations for an employee.
 */
export class ListEmployeeMutationsUseCase {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly mutations: IEmployeeMutationRepository,
  ) {}

  async execute(employeeId: string): Promise<readonly EmployeeMutation[]> {
    const employee = await this.employees.findById(employeeId);
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }
    return this.mutations.listByEmployee(employeeId);
  }
}
