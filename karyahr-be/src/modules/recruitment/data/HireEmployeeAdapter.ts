import type { PrismaClient } from "../../../../prisma/generated/prisma/client";
import { CreateEmployeeUseCase } from "../../employees/domain/usecases/EmployeeCrud.usecase";
import type { CreateEmployeeInput } from "../../employees/domain/repositories/IEmployeeRepository";
import type { Employee } from "../../employees/domain/entities/Employee";
import type { IHireEmployee } from "../domain/ports/IHireEmployee";

/**
 * Hires via employee create use case and allocates employee numbers.
 */
export class HireEmployeeAdapter implements IHireEmployee {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly createEmployee: CreateEmployeeUseCase,
  ) {}

  create(input: CreateEmployeeInput, actorUserId: string): Promise<Employee> {
    return this.createEmployee.execute(input, actorUserId);
  }

  async nextEmployeeNumber(year: number): Promise<string> {
    const prefix = `EMP-${year}-`;
    const count = await this.prisma.employee.count({
      where: { employeeNumber: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(4, "0")}`;
  }
}
