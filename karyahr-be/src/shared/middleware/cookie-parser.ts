import { parseCookie } from "cookie";
import type { Request, Response, NextFunction } from "express";

/**
 * Parses Cookie header onto `req.cookies`.
 */
export function cookieParser(req: Request, _res: Response, next: NextFunction): void {
  req.cookies = parseCookie(req.headers.cookie ?? "");
  next();
}
