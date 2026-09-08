import { NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import type { IEmployeeRepository } from "../../../employees/domain/repositories/IEmployeeRepository";
import type { EmployeePayrollProfile, EmployeeSalaryAssignment } from "../entities/Payroll";
import type {
  IEmployeePayrollProfileRepository,
  IEmployeeSalaryAssignmentRepository,
  ISalaryComponentRepository,
} from "../repositories/IPayrollRepository";

/**
 * Creates or replaces an employee's payroll profile.
 */
export class UpsertPayrollProfileUseCase {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly profiles: IEmployeePayrollProfileRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(
    input: Omit<EmployeePayrollProfile, "id">,
    actorUserId: string,
  ): Promise<EmployeePayrollProfile> {
    const employee = await this.employees.findById(input.employeeId);
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }
    const profile = await this.profiles.upsert(input);
    await this.audit.append({
      actorUserId,
      entityType: "EmployeePayrollProfile",
      entityId: profile.id,
      action: "upsert",
      metadata: { employeeId: input.employeeId },
    });
    return profile;
  }
}

/**
 * Loads an employee's payroll profile.
 */
export class GetPayrollProfileUseCase {
  constructor(private readonly profiles: IEmployeePayrollProfileRepository) {}

  async execute(employeeId: string): Promise<EmployeePayrollProfile> {
    const profile = await this.profiles.findByEmployeeId(employeeId);
    if (!profile) {
      throw new NotFoundError("Payroll profile not found");
    }
    return profile;
  }
}

/**
 * Assigns a salary component amount to an employee.
 */
export class AssignSalaryUseCase {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly components: ISalaryComponentRepository,
    private readonly assignments: IEmployeeSalaryAssignmentRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(
    input: Omit<EmployeeSalaryAssignment, "id">,
    actorUserId: string,
  ): Promise<EmployeeSalaryAssignment> {
    const employee = await this.employees.findById(input.employeeId);
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }
    const component = await this.components.findById(input.componentId);
    if (!component || !component.isActive) {
      throw new NotFoundError("Salary component not found");
    }
    if (input.amountRupiah < 0n) {
      throw new ValidationError("amountRupiah must be non-negative");
    }
    if (input.effectiveTo && input.effectiveTo.getTime() < input.effectiveFrom.getTime()) {
      throw new ValidationError("effectiveTo must be on or after effectiveFrom");
    }
    const assignment = await this.assignments.create(input);
    await this.audit.append({
      actorUserId,
      entityType: "EmployeeSalaryAssignment",
      entityId: assignment.id,
      action: "create",
    });
    return assignment;
  }
}

/**
 * Lists salary assignments for an employee.
 */
export class ListSalaryAssignmentsUseCase {
  constructor(private readonly assignments: IEmployeeSalaryAssignmentRepository) {}

  execute(employeeId: string): Promise<readonly EmployeeSalaryAssignment[]> {
    return this.assignments.listByEmployee(employeeId);
  }
}
