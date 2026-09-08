import { stringifySetCookie } from "cookie";
import type { Response } from "express";
import { env } from "../../config/env";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "./cookie-names";

function cookieHeader(name: string, value: string, maxAgeSeconds: number, path: string): string {
  const config = env();
  return stringifySetCookie({
    name,
    value,
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: "lax",
    path,
    maxAge: maxAgeSeconds,
  });
}

/**
 * Sets access and refresh httpOnly cookies.
 */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  const config = env();
  res.append("Set-Cookie", cookieHeader(ACCESS_COOKIE, accessToken, config.JWT_ACCESS_TTL_SECONDS, "/"));
  res.append(
    "Set-Cookie",
    cookieHeader(REFRESH_COOKIE, refreshToken, config.JWT_REFRESH_TTL_SECONDS, "/auth"),
  );
}

/**
 * Clears access and refresh cookies.
 */
export function clearAuthCookies(res: Response): void {
  res.append("Set-Cookie", cookieHeader(ACCESS_COOKIE, "", 0, "/"));
  res.append("Set-Cookie", cookieHeader(REFRESH_COOKIE, "", 0, "/auth"));
}
