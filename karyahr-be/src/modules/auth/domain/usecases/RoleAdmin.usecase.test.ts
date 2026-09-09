import { describe, expect, test } from "bun:test";
import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { Permission, Role } from "../entities/Role";
import type { IPermissionRepository, IRoleRepository } from "../repositories/IRoleRepository";
import {
  CreatePermissionUseCase,
  CreateRoleUseCase,
  DeleteRoleUseCase,
  ListPermissionsUseCase,
  ListRolesUseCase,
  SetRolePermissionsUseCase,
  UpdateRoleUseCase,
} from "./RoleAdmin.usecase";

class MemoryRoles implements IRoleRepository {
  constructor(
    private rows: Role[] = [],
    readonly usersByRole = new Map<string, number>(),
  ) {}

  async list(): Promise<readonly Role[]> {
    return this.rows;
  }
  async findById(id: string): Promise<Role | null> {
    return this.rows.find((row) => row.id === id) ?? null;
  }
  async findByName(name: string): Promise<Role | null> {
    return this.rows.find((row) => row.name === name) ?? null;
  }
  async create(input: { readonly name: string; readonly description?: string }): Promise<Role> {
    const role: Role = {
      id: `r-${this.rows.length + 1}`,
      name: input.name,
      description: input.description ?? null,
      permissionKeys: [],
    };
    this.rows.push(role);
    return role;
  }
  async update(
    id: string,
    input: { readonly name?: string; readonly description?: string | null },
  ): Promise<Role> {
    this.rows = this.rows.map((row) => (row.id === id ? { ...row, ...input } : row));
    return (await this.findById(id))!;
  }
  async delete(id: string): Promise<void> {
    this.rows = this.rows.filter((row) => row.id !== id);
  }
  async userCount(id: string): Promise<number> {
    return this.usersByRole.get(id) ?? 0;
  }
  async setPermissions(roleId: string, permissionIds: readonly string[]): Promise<Role> {
    this.rows = this.rows.map((row) =>
      row.id === roleId ? { ...row, permissionKeys: [...permissionIds] } : row,
    );
    return (await this.findById(roleId))!;
  }
}

class MemoryPermissions implements IPermissionRepository {
  constructor(private rows: Permission[] = []) {}
  async list(): Promise<readonly Permission[]> {
    return this.rows;
  }
  async findById(id: string): Promise<Permission | null> {
    return this.rows.find((row) => row.id === id) ?? null;
  }
  async findByKey(key: string): Promise<Permission | null> {
    return this.rows.find((row) => row.key === key) ?? null;
  }
  async create(input: { readonly key: string; readonly description?: string }): Promise<Permission> {
    const permission: Permission = {
      id: `p-${this.rows.length + 1}`,
      key: input.key,
      description: input.description ?? null,
    };
    this.rows.push(permission);
    return permission;
  }
}

describe("RoleAdmin use cases", () => {
  test("creates and lists roles", async () => {
    const roles = new MemoryRoles();
    const created = await new CreateRoleUseCase(roles).execute({ name: "auditor" });
    expect(created.name).toBe("auditor");
    expect(await new ListRolesUseCase(roles).execute()).toHaveLength(1);
  });

  test("rejects a duplicate role name", async () => {
    const roles = new MemoryRoles();
    await new CreateRoleUseCase(roles).execute({ name: "auditor" });
    await expect(new CreateRoleUseCase(roles).execute({ name: "auditor" })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  test("updates a role and rejects a taken name", async () => {
    const roles = new MemoryRoles();
    const first = await new CreateRoleUseCase(roles).execute({ name: "a" });
    await new CreateRoleUseCase(roles).execute({ name: "b" });
    const updated = await new UpdateRoleUseCase(roles).execute(first.id, { description: "x" });
    expect(updated.description).toBe("x");
    await expect(new UpdateRoleUseCase(roles).execute(first.id, { name: "b" })).rejects.toBeInstanceOf(
      ConflictError,
    );
    await expect(new UpdateRoleUseCase(roles).execute("missing", { name: "c" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  test("deletes a role without users and blocks assigned roles", async () => {
    const roles = new MemoryRoles();
    const empty = await new CreateRoleUseCase(roles).execute({ name: "empty" });
    const assigned = await new CreateRoleUseCase(roles).execute({ name: "assigned" });
    roles.usersByRole.set(assigned.id, 2);
    await new DeleteRoleUseCase(roles).execute(empty.id);
    await expect(new DeleteRoleUseCase(roles).execute(assigned.id)).rejects.toBeInstanceOf(ValidationError);
    await expect(new DeleteRoleUseCase(roles).execute("missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  test("sets permissions when every id exists", async () => {
    const roles = new MemoryRoles();
    const permissions = new MemoryPermissions();
    const role = await new CreateRoleUseCase(roles).execute({ name: "hr" });
    const permission = await new CreatePermissionUseCase(permissions).execute({ key: "auth:me" });
    const updated = await new SetRolePermissionsUseCase(roles, permissions).execute(role.id, [
      permission.id,
    ]);
    expect(updated.permissionKeys).toEqual([permission.id]);
    await expect(
      new SetRolePermissionsUseCase(roles, permissions).execute(role.id, ["missing"]),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      new SetRolePermissionsUseCase(roles, permissions).execute("missing", []),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("creates and lists permissions", async () => {
    const permissions = new MemoryPermissions();
    await new CreatePermissionUseCase(permissions).execute({ key: "employees:read" });
    await expect(
      new CreatePermissionUseCase(permissions).execute({ key: "employees:read" }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(await new ListPermissionsUseCase(permissions).execute()).toHaveLength(1);
  });
});
