import type { Prisma, PrismaClient } from "../../../../prisma/generated/prisma/client";
import type { Permission, Role } from "../domain/entities/Role";
import type { IPermissionRepository, IRoleRepository } from "../domain/repositories/IRoleRepository";

const roleInclude = {
  permissions: { include: { permission: true } },
} satisfies Prisma.RoleInclude;

type RoleWithPermissions = Prisma.RoleGetPayload<{ include: typeof roleInclude }>;

function toRole(role: RoleWithPermissions): Role {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissionKeys: role.permissions.map((item) => item.permission.key),
  };
}

/**
 * Role persistence with Prisma.
 */
export class PrismaRoleRepository implements IRoleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<readonly Role[]> {
    const rows = await this.prisma.role.findMany({
      include: roleInclude,
      orderBy: { name: "asc" },
    });
    return rows.map(toRole);
  }

  async findById(id: string): Promise<Role | null> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: roleInclude,
    });
    return role ? toRole(role) : null;
  }

  async findByName(name: string): Promise<Role | null> {
    const role = await this.prisma.role.findUnique({
      where: { name },
      include: roleInclude,
    });
    return role ? toRole(role) : null;
  }

  async create(input: { readonly name: string; readonly description?: string }): Promise<Role> {
    const role = await this.prisma.role.create({
      data: { name: input.name, description: input.description },
      include: roleInclude,
    });
    return toRole(role);
  }

  async update(
    id: string,
    input: { readonly name?: string; readonly description?: string | null },
  ): Promise<Role> {
    const role = await this.prisma.role.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
      },
      include: roleInclude,
    });
    return toRole(role);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.role.delete({ where: { id } });
  }

  async userCount(id: string): Promise<number> {
    return this.prisma.userRole.count({ where: { roleId: id } });
  }

  async setPermissions(roleId: string, permissionIds: readonly string[]): Promise<Role> {
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
      }),
    ]);
    const role = await this.prisma.role.findUniqueOrThrow({
      where: { id: roleId },
      include: roleInclude,
    });
    return toRole(role);
  }
}

/**
 * Permission persistence with Prisma.
 */
export class PrismaPermissionRepository implements IPermissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<readonly Permission[]> {
    return this.prisma.permission.findMany({ orderBy: { key: "asc" } });
  }

  async findById(id: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({ where: { id } });
  }

  async findByKey(key: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({ where: { key } });
  }

  async create(input: {
    readonly key: string;
    readonly description?: string;
  }): Promise<Permission> {
    return this.prisma.permission.create({
      data: { key: input.key, description: input.description },
    });
  }
}
