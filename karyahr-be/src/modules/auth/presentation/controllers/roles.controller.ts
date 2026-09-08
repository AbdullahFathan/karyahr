import type { Request, Response } from "express";
import { asyncHandler } from "../../../../shared/middleware/async-handler";
import { routeParam } from "../../../../shared/utils/route-param";
import type {
  CreatePermissionUseCase,
  CreateRoleUseCase,
  DeleteRoleUseCase,
  ListPermissionsUseCase,
  ListRolesUseCase,
  SetRolePermissionsUseCase,
  UpdateRoleUseCase,
} from "../../domain/usecases/RoleAdmin.usecase";
import {
  createPermissionSchema,
  createRoleSchema,
  setRolePermissionsSchema,
  updateRoleSchema,
} from "../schemas/role.schema";

/**
 * HTTP handlers for roles and permissions.
 */
export function createRoleController(deps: {
  readonly listRoles: ListRolesUseCase;
  readonly createRole: CreateRoleUseCase;
  readonly updateRole: UpdateRoleUseCase;
  readonly deleteRole: DeleteRoleUseCase;
  readonly setRolePermissions: SetRolePermissionsUseCase;
  readonly listPermissions: ListPermissionsUseCase;
  readonly createPermission: CreatePermissionUseCase;
}) {
  const listRoles = asyncHandler(async (_req: Request, res: Response) => {
    const roles = await deps.listRoles.execute();
    res.status(200).json({ data: roles });
  });

  const createRole = asyncHandler(async (req: Request, res: Response) => {
    const body = createRoleSchema.parse(req.body);
    const role = await deps.createRole.execute(body);
    res.status(201).json(role);
  });

  const updateRole = asyncHandler(async (req: Request, res: Response) => {
    const body = updateRoleSchema.parse(req.body);
    const role = await deps.updateRole.execute(routeParam(req.params.id, "id"), body);
    res.status(200).json(role);
  });

  const deleteRole = asyncHandler(async (req: Request, res: Response) => {
    await deps.deleteRole.execute(routeParam(req.params.id, "id"));
    res.status(204).send();
  });

  const setPermissions = asyncHandler(async (req: Request, res: Response) => {
    const body = setRolePermissionsSchema.parse(req.body);
    const role = await deps.setRolePermissions.execute(
      routeParam(req.params.id, "id"),
      body.permissionIds,
    );
    res.status(200).json(role);
  });

  const listPermissions = asyncHandler(async (_req: Request, res: Response) => {
    const permissions = await deps.listPermissions.execute();
    res.status(200).json({ data: permissions });
  });

  const createPermission = asyncHandler(async (req: Request, res: Response) => {
    const body = createPermissionSchema.parse(req.body);
    const permission = await deps.createPermission.execute(body);
    res.status(201).json(permission);
  });

  return {
    listRoles,
    createRole,
    updateRole,
    deleteRole,
    setPermissions,
    listPermissions,
    createPermission,
  };
}
