import { randomBytes } from "node:crypto";
import { ConflictError } from "../../../shared/errors/app-error";
import { hashPassword } from "../../../shared/auth/crypto";
import { EMPLOYEE_ROLE } from "../../../shared/auth/permissions";
import type { IUserRepository } from "../../auth/domain/repositories/IUserRepository";
import type { IProvisionEmployeeUser, ProvisionedUser } from "../domain/ports/IProvisionEmployeeUser";

/**
 * Creates an employee-role login with a one-time password.
 */
export class ProvisionEmployeeUserAdapter implements IProvisionEmployeeUser {
  constructor(private readonly users: IUserRepository) {}

  async provision(input: { readonly email: string; readonly employeeId: string }): Promise<ProvisionedUser> {
    const email = input.email.toLowerCase();
    if (await this.users.findByEmail(email)) {
      throw new ConflictError("A user already exists for this email");
    }
    if (await this.users.findByEmployeeId(input.employeeId)) {
      throw new ConflictError("A user already exists for this employee");
    }
    const temporaryPassword = randomBytes(12).toString("base64url");
    const user = await this.users.create({
      email,
      passwordHash: await hashPassword(temporaryPassword),
      employeeId: input.employeeId,
      roleName: EMPLOYEE_ROLE,
    });
    return { userId: user.id, email, temporaryPassword };
  }
}
