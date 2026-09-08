import type { Request, Response } from "express";
import { asyncHandler } from "../../../../shared/middleware/async-handler";
import { UnauthorizedError } from "../../../../shared/errors/app-error";
import { routeParam } from "../../../../shared/utils/route-param";
import type { ListMyNotificationsUseCase } from "../../domain/usecases/ListMyNotifications.usecase";
import type { MarkNotificationReadUseCase } from "../../domain/usecases/MarkNotificationRead.usecase";

function actorUserId(req: Request): string {
  if (!req.auth) {
    throw new UnauthorizedError();
  }
  return req.auth.userId;
}

/**
 * HTTP handlers for in-app notifications.
 */
export function createNotificationController(deps: {
  readonly listMine: ListMyNotificationsUseCase;
  readonly markRead: MarkNotificationReadUseCase;
}) {
  const listMine = asyncHandler(async (req: Request, res: Response) => {
    const items = await deps.listMine.execute(actorUserId(req));
    res.status(200).json({ data: items });
  });

  const markRead = asyncHandler(async (req: Request, res: Response) => {
    const item = await deps.markRead.execute(routeParam(req.params.id, "id"), actorUserId(req));
    res.status(200).json({ data: item });
  });

  return { listMine, markRead };
}
