import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { Permission, Role } from "../entities/Role";
import type { IPermissionRepository, IRoleRepository } from "../repositories/IRoleRepository";

/**
 * Lists all roles.
 */
export class ListRolesUseCase {
  constructor(private readonly roles: IRoleRepository) {}

  execute(): Promise<readonly Role[]> {
    return this.roles.list();
  }
}

/**
 * Creates a role.
 */
export class CreateRoleUseCase {
  constructor(private readonly roles: IRoleRepository) {}

  async execute(input: { readonly name: string; readonly description?: string }): Promise<Role> {
    const existing = await this.roles.findByName(input.name);
    if (existing) {
      throw new ConflictError("Role name already exists");
    }
    return this.roles.create(input);
  }
}

/**
 * Updates a role name or description.
 */
export class UpdateRoleUseCase {
  constructor(private readonly roles: IRoleRepository) {}

  async execute(
    id: string,
    input: { readonly name?: string; readonly description?: string | null },
  ): Promise<Role> {
    const role = await this.roles.findById(id);
    if (!role) {
      throw new NotFoundError("Role not found");
    }
    if (input.name && input.name !== role.name) {
      const taken = await this.roles.findByName(input.name);
      if (taken) {
        throw new ConflictError("Role name already exists");
      }
    }
    return this.roles.update(id, input);
  }
}

/**
 * Deletes a role that has no assigned users.
 */
export class DeleteRoleUseCase {
  constructor(private readonly roles: IRoleRepository) {}

  async execute(id: string): Promise<void> {
    const role = await this.roles.findById(id);
    if (!role) {
      throw new NotFoundError("Role not found");
    }
    const users = await this.roles.userCount(id);
    if (users > 0) {
      throw new ValidationError("Cannot delete a role assigned to users");
    }
    await this.roles.delete(id);
  }
}

/**
 * Replaces a role's permission set.
 */
export class SetRolePermissionsUseCase {
  constructor(
    private readonly roles: IRoleRepository,
    private readonly permissions: IPermissionRepository,
  ) {}

  async execute(roleId: string, permissionIds: readonly string[]): Promise<Role> {
    const role = await this.roles.findById(roleId);
    if (!role) {
      throw new NotFoundError("Role not found");
    }
    for (const permissionId of permissionIds) {
      const permission = await this.permissions.findById(permissionId);
      if (!permission) {
        throw new NotFoundError("Permission not found");
      }
    }
    return this.roles.setPermissions(roleId, permissionIds);
  }
}

/**
 * Lists permissions.
 */
export class ListPermissionsUseCase {
  constructor(private readonly permissions: IPermissionRepository) {}

  execute(): Promise<readonly Permission[]> {
    return this.permissions.list();
  }
}

/**
 * Creates a permission key.
 */
export class CreatePermissionUseCase {
  constructor(private readonly permissions: IPermissionRepository) {}

  async execute(input: { readonly key: string; readonly description?: string }): Promise<Permission> {
    const existing = await this.permissions.findByKey(input.key);
    if (existing) {
      throw new ConflictError("Permission key already exists");
    }
    return this.permissions.create(input);
  }
}
