import type { AuthUser } from "../entities/AuthUser";

export type CreateUserInput = {
  readonly email: string;
  readonly passwordHash: string;
  readonly employeeId: string;
  readonly roleName: string;
};

export type IUserRepository = {
  findByEmail(email: string): Promise<AuthUser | null>;
  findById(id: string): Promise<AuthUser | null>;
  findByEmployeeId(employeeId: string): Promise<AuthUser | null>;
  listByRoleName(roleName: string): Promise<readonly AuthUser[]>;
  setActiveByEmployeeId(employeeId: string, isActive: boolean): Promise<void>;
  create(input: CreateUserInput): Promise<AuthUser>;
};
