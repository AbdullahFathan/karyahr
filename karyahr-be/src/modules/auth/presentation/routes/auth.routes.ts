import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../../../../config/env";
import { PERMISSIONS } from "../../../../shared/auth/permissions";
import { getPrisma } from "../../../../shared/database/prisma";
import { requireAuth } from "../../../../shared/middleware/require-auth";
import { requirePermission } from "../../../../shared/middleware/require-permission";
import {
  bunPasswordHasher,
  cryptoRefreshTokenIssuer,
  joseAccessTokenSigner,
} from "../../data/auth-adapters";
import { PrismaMeEmployeeReader } from "../../data/PrismaMeEmployeeReader";
import { PrismaRefreshTokenRepository } from "../../data/PrismaRefreshTokenRepository";
import { PrismaPermissionRepository, PrismaRoleRepository } from "../../data/PrismaRoleRepository";
import { PrismaUserRepository } from "../../data/PrismaUserRepository";
import { GetMeUseCase } from "../../domain/usecases/GetMe.usecase";
import { LoginUseCase } from "../../domain/usecases/Login.usecase";
import { LogoutUseCase } from "../../domain/usecases/Logout.usecase";
import { RefreshSessionUseCase } from "../../domain/usecases/RefreshSession.usecase";
import {
  CreatePermissionUseCase,
  CreateRoleUseCase,
  DeleteRoleUseCase,
  ListPermissionsUseCase,
  ListRolesUseCase,
  SetRolePermissionsUseCase,
  UpdateRoleUseCase,
} from "../../domain/usecases/RoleAdmin.usecase";
import { createAuthController } from "../controllers/auth.controller";
import { createRoleController } from "../controllers/roles.controller";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => env().NODE_ENV === "test" || process.env.SKIP_API_RATE_LIMIT === "1",
});

/**
 * Registers auth, session, role, and permission routes.
 */
export function createAuthRouter(): Router {
  const prisma = getPrisma();
  const users = new PrismaUserRepository(prisma);
  const refreshTokens = new PrismaRefreshTokenRepository(prisma);
  const roles = new PrismaRoleRepository(prisma);
  const permissions = new PrismaPermissionRepository(prisma);

  const auth = createAuthController({
    login: new LoginUseCase(
      users,
      refreshTokens,
      bunPasswordHasher,
      joseAccessTokenSigner,
      cryptoRefreshTokenIssuer,
    ),
    refresh: new RefreshSessionUseCase(
      users,
      refreshTokens,
      joseAccessTokenSigner,
      cryptoRefreshTokenIssuer,
    ),
    logout: new LogoutUseCase(refreshTokens, cryptoRefreshTokenIssuer),
    getMe: new GetMeUseCase(users, new PrismaMeEmployeeReader(prisma)),
  });

  const role = createRoleController({
    listRoles: new ListRolesUseCase(roles),
    createRole: new CreateRoleUseCase(roles),
    updateRole: new UpdateRoleUseCase(roles),
    deleteRole: new DeleteRoleUseCase(roles),
    setRolePermissions: new SetRolePermissionsUseCase(roles, permissions),
    listPermissions: new ListPermissionsUseCase(permissions),
    createPermission: new CreatePermissionUseCase(permissions),
  });

  const router = Router();
  router.post("/auth/login", loginLimiter, auth.login);
  router.post("/auth/refresh", auth.refresh);
  router.post("/auth/logout", auth.logout);
  router.get("/auth/me", requireAuth, requirePermission(PERMISSIONS.AUTH_ME), auth.me);

  router.get(
    "/roles",
    requireAuth,
    requirePermission(PERMISSIONS.AUTH_ROLES_READ),
    role.listRoles,
  );
  router.post(
    "/roles",
    requireAuth,
    requirePermission(PERMISSIONS.AUTH_ROLES_WRITE),
    role.createRole,
  );
  router.patch(
    "/roles/:id",
    requireAuth,
    requirePermission(PERMISSIONS.AUTH_ROLES_WRITE),
    role.updateRole,
  );
  router.delete(
    "/roles/:id",
    requireAuth,
    requirePermission(PERMISSIONS.AUTH_ROLES_WRITE),
    role.deleteRole,
  );
  router.put(
    "/roles/:id/permissions",
    requireAuth,
    requirePermission(PERMISSIONS.AUTH_ROLES_WRITE),
    role.setPermissions,
  );
  router.get(
    "/permissions",
    requireAuth,
    requirePermission(PERMISSIONS.AUTH_PERMISSIONS_READ),
    role.listPermissions,
  );
  router.post(
    "/permissions",
    requireAuth,
    requirePermission(PERMISSIONS.AUTH_PERMISSIONS_WRITE),
    role.createPermission,
  );

  return router;
}
