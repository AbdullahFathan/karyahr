import type { AuthUser } from "../entities/AuthUser";

export type IUserRepository = {
  findByEmail(email: string): Promise<AuthUser | null>;
  findById(id: string): Promise<AuthUser | null>;
  setActiveByEmployeeId(employeeId: string, isActive: boolean): Promise<void>;
};
