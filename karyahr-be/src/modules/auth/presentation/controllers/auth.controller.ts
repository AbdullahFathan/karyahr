import type { Request, Response } from "express";
import { env } from "../../../../config/env";
import { clearAuthCookies, setAuthCookies } from "../../../../shared/auth/cookies";
import { REFRESH_COOKIE } from "../../../../shared/auth/cookie-names";
import { asyncHandler } from "../../../../shared/middleware/async-handler";
import { UnauthorizedError } from "../../../../shared/errors/app-error";
import type { GetMeUseCase } from "../../domain/usecases/GetMe.usecase";
import type { LoginUseCase } from "../../domain/usecases/Login.usecase";
import type { LogoutUseCase } from "../../domain/usecases/Logout.usecase";
import type { RefreshSessionUseCase } from "../../domain/usecases/RefreshSession.usecase";
import type { MeResponseDto } from "../dtos/MeResponse.dto";
import { loginSchema } from "../schemas/login.schema";

/**
 * HTTP handlers for authentication.
 */
export function createAuthController(deps: {
  readonly login: LoginUseCase;
  readonly refresh: RefreshSessionUseCase;
  readonly logout: LogoutUseCase;
  readonly getMe: GetMeUseCase;
}) {
  const login = asyncHandler(async (req: Request, res: Response) => {
    const body = loginSchema.parse(req.body);
    const result = await deps.login.execute({
      email: body.email,
      password: body.password,
      userAgent: req.get("user-agent") ?? undefined,
      refreshTtlSeconds: env().JWT_REFRESH_TTL_SECONDS,
    });
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.status(200).json({
      user: {
        id: result.user.id,
        email: result.user.email,
        employeeId: result.user.employeeId,
      },
    });
  });

  const refresh = asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies[REFRESH_COOKIE];
    if (!token) {
      throw new UnauthorizedError();
    }
    const result = await deps.refresh.execute({
      refreshToken: token,
      refreshTtlSeconds: env().JWT_REFRESH_TTL_SECONDS,
      userAgent: req.get("user-agent") ?? undefined,
    });
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.status(204).send();
  });

  const logout = asyncHandler(async (req: Request, res: Response) => {
    await deps.logout.execute(req.cookies[REFRESH_COOKIE]);
    clearAuthCookies(res);
    res.status(204).send();
  });

  const me = asyncHandler(async (req: Request, res: Response) => {
    if (!req.auth) {
      throw new UnauthorizedError();
    }
    const body: MeResponseDto = await deps.getMe.execute(req.auth.userId);
    res.status(200).json(body);
  });

  return { login, refresh, logout, me };
}
