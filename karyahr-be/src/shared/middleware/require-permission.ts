import type { Request, Response, NextFunction } from "express";
import { ForbiddenError, UnauthorizedError } from "../errors/app-error";

/**
 * Requires the caller to hold a specific permission.
 */
export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new UnauthorizedError());
      return;
    }
    if (!req.auth.permissionKeys.includes(permission)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}
