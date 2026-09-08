import type { Prisma, PrismaClient } from "../../../../prisma/generated/prisma/client";
import type { AuthUser } from "../domain/entities/AuthUser";
import type { IUserRepository } from "../domain/repositories/IUserRepository";

const userInclude = {
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

type UserWithRoles = Prisma.UserGetPayload<{ include: typeof userInclude }>;

function toAuthUser(user: UserWithRoles): AuthUser {
  const roleNames = user.roles.map((item) => item.role.name);
  const permissionKeys = [
    ...new Set(
      user.roles.flatMap((item) =>
        item.role.permissions.map((entry) => entry.permission.key),
      ),
    ),
  ];
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    employeeId: user.employeeId,
    isActive: user.isActive,
    roleNames,
    permissionKeys,
  };
}

/**
 * Loads users and RBAC grants with Prisma.
 */
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: userInclude,
    });
    return user ? toAuthUser(user) : null;
  }

  async findById(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: userInclude,
    });
    return user ? toAuthUser(user) : null;
  }

  async setActiveByEmployeeId(employeeId: string, isActive: boolean): Promise<void> {
    await this.prisma.user.updateMany({
      where: { employeeId },
      data: { isActive },
    });
  }
}
