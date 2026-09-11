import type { Request, Response, NextFunction } from "express";
import { ForbiddenError, UnauthorizedError } from "../errors/app-error";

/**
 * Requires the caller to hold a specific permission.
 */
export function requirePermission(permission: string) {
  return requireAnyPermission(permission);
}

/**
 * Requires the caller to hold at least one of the given permissions.
 */
export function requireAnyPermission(...permissions: readonly string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new UnauthorizedError());
      return;
    }
    const allowed = permissions.some((permission) => req.auth?.permissionKeys.includes(permission));
    if (!allowed) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}
