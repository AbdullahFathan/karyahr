import type { Permission, Role } from "../entities/Role";

export type IRoleRepository = {
  list(): Promise<readonly Role[]>;
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  create(input: {
    readonly name: string;
    readonly description?: string;
  }): Promise<Role>;
  update(
    id: string,
    input: { readonly name?: string; readonly description?: string | null },
  ): Promise<Role>;
  delete(id: string): Promise<void>;
  userCount(id: string): Promise<number>;
  setPermissions(roleId: string, permissionIds: readonly string[]): Promise<Role>;
};

export type IPermissionRepository = {
  list(): Promise<readonly Permission[]>;
  findById(id: string): Promise<Permission | null>;
  findByKey(key: string): Promise<Permission | null>;
  create(input: { readonly key: string; readonly description?: string }): Promise<Permission>;
};
