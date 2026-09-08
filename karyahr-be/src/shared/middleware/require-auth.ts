import type { Request, Response, NextFunction } from "express";
import { ACCESS_COOKIE } from "../auth/cookie-names";
import type { AuthContext } from "../auth/auth-context";
import { verifyAccessToken } from "../auth/jwt";
import { getPrisma } from "../database/prisma";
import { UnauthorizedError } from "../errors/app-error";
import { PrismaUserRepository } from "../../modules/auth/data/PrismaUserRepository";
import { asyncHandler } from "./async-handler";

/**
 * Requires a valid access token cookie and loads permissions.
 */
export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies[ACCESS_COOKIE];
  if (!token) {
    throw new UnauthorizedError();
  }
  let payload: { userId: string; employeeId: string };
  try {
    payload = await verifyAccessToken(token);
  } catch {
    throw new UnauthorizedError();
  }
  const user = await new PrismaUserRepository(getPrisma()).findById(payload.userId);
  if (!user || !user.isActive) {
    throw new UnauthorizedError();
  }
  const auth: AuthContext = {
    userId: user.id,
    employeeId: user.employeeId,
    permissionKeys: user.permissionKeys,
  };
  req.auth = auth;
  next();
});
