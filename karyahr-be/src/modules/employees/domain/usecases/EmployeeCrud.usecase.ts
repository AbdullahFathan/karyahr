import { ConflictError, NotFoundError } from "../../../../shared/errors/app-error";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import type { IUserRepository } from "../../../auth/domain/repositories/IUserRepository";
import { assertEmployeeInvariants } from "../invariants";
import type {
  CreateEmployeeInput,
  IEmployeeRepository,
  UpdateEmployeeInput,
} from "../repositories/IEmployeeRepository";
import type { Employee } from "../entities/Employee";

/**
 * Creates an employee and writes an audit log.
 */
export class CreateEmployeeUseCase {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(input: CreateEmployeeInput, actorUserId: string): Promise<Employee> {
    assertEmployeeInvariants(input);
    if (await this.employees.findByNationalId(input.nationalId)) {
      throw new ConflictError("National ID already exists");
    }
    if (await this.employees.findByEmployeeNumber(input.employeeNumber)) {
      throw new ConflictError("Employee number already exists");
    }
    if (input.managerId) {
      const manager = await this.employees.findById(input.managerId);
      if (!manager) {
        throw new NotFoundError("Manager not found");
      }
    }
    const employee = await this.employees.create(input);
    await this.audit.append({
      actorUserId,
      entityType: "Employee",
      entityId: employee.id,
      action: "create",
      metadata: { employeeNumber: employee.employeeNumber },
    });
    return employee;
  }
}

/**
 * Updates employee fields, syncs login access, and writes an audit log.
 */
export class UpdateEmployeeUseCase {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly users: IUserRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(id: string, input: UpdateEmployeeInput, actorUserId: string): Promise<Employee> {
    const current = await this.employees.findById(id);
    if (!current) {
      throw new NotFoundError("Employee not found");
    }
    assertEmployeeInvariants({
      id,
      managerId: input.managerId === undefined ? current.managerId : input.managerId,
      status: input.status ?? current.status,
      contractType: input.contractType ?? current.contractType,
    });
    if (input.nationalId && input.nationalId !== current.nationalId) {
      const taken = await this.employees.findByNationalId(input.nationalId);
      if (taken) {
        throw new ConflictError("National ID already exists");
      }
    }
    if (input.employeeNumber && input.employeeNumber !== current.employeeNumber) {
      const taken = await this.employees.findByEmployeeNumber(input.employeeNumber);
      if (taken) {
        throw new ConflictError("Employee number already exists");
      }
    }
    if (input.managerId) {
      const manager = await this.employees.findById(input.managerId);
      if (!manager) {
        throw new NotFoundError("Manager not found");
      }
    }
    const employee = await this.employees.update(id, input);
    if (input.status) {
      await this.users.setActiveByEmployeeId(id, input.status !== "INACTIVE");
    }
    await this.audit.append({
      actorUserId,
      entityType: "Employee",
      entityId: id,
      action: "update",
      metadata: JSON.parse(JSON.stringify(input)) as Record<string, unknown>,
    });
    return employee;
  }
}

/**
 * Returns one employee by id.
 */
export class GetEmployeeByIdUseCase {
  constructor(private readonly employees: IEmployeeRepository) {}

  async execute(id: string): Promise<Employee> {
    const employee = await this.employees.findById(id);
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }
    return employee;
  }
}

/**
 * Lists employees with filters and pagination.
 */
export class ListEmployeesUseCase {
  constructor(private readonly employees: IEmployeeRepository) {}

  execute(filter: Parameters<IEmployeeRepository["list"]>[0]) {
    return this.employees.list(filter);
  }
}
