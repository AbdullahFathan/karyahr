import { UnauthorizedError } from "../../../../shared/errors/app-error";
import type { MeEmployee, MeResult } from "../entities/AuthUser";
import type { IUserRepository } from "../repositories/IUserRepository";

export type IMeEmployeeReader = {
  getSummary(employeeId: string): Promise<MeEmployee | null>;
};

/**
 * Returns the authenticated user profile.
 */
export class GetMeUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly employees: IMeEmployeeReader,
  ) {}

  async execute(userId: string): Promise<MeResult> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedError();
    }
    const employee = await this.employees.getSummary(user.employeeId);
    if (!employee) {
      throw new UnauthorizedError();
    }
    return {
      user: {
        id: user.id,
        email: user.email,
        employeeId: user.employeeId,
        isActive: user.isActive,
      },
      employee,
      roles: user.roleNames,
      permissions: user.permissionKeys,
    };
  }
}
