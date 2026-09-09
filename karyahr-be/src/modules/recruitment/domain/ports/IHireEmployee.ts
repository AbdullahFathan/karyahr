import type { CreateEmployeeInput } from "../../../employees/domain/repositories/IEmployeeRepository";
import type { Employee } from "../../../employees/domain/entities/Employee";

export type IHireEmployee = {
  create(input: CreateEmployeeInput, actorUserId: string): Promise<Employee>;
  nextEmployeeNumber(year: number): Promise<string>;
};
