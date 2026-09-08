import type { Request, Response, NextFunction } from "express";

type AsyncRoute = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

/**
 * Forwards rejected promises from async route handlers to Express.
 */
export function asyncHandler(handler: AsyncRoute) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res, next).catch(next);
  };
}
