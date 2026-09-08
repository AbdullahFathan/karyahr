import { Router } from "express";
import { getPrisma } from "../../../../shared/database/prisma";
import { requireAuth } from "../../../../shared/middleware/require-auth";
import { requirePermission } from "../../../../shared/middleware/require-permission";
import { PERMISSIONS } from "../../../../shared/auth/permissions";
import { PrismaNotificationRepository } from "../../data/PrismaNotificationRepository";
import { ListMyNotificationsUseCase } from "../../domain/usecases/ListMyNotifications.usecase";
import { MarkNotificationReadUseCase } from "../../domain/usecases/MarkNotificationRead.usecase";
import { createNotificationController } from "../controllers/notifications.controller";

/**
 * Registers notification self-service routes.
 */
export function createNotificationRouter(): Router {
  const repo = new PrismaNotificationRepository(getPrisma());
  const controller = createNotificationController({
    listMine: new ListMyNotificationsUseCase(repo),
    markRead: new MarkNotificationReadUseCase(repo),
  });

  const router = Router();
  router.get(
    "/notifications/me",
    requireAuth,
    requirePermission(PERMISSIONS.NOTIFICATIONS_ME),
    controller.listMine,
  );
  router.patch(
    "/notifications/:id/read",
    requireAuth,
    requirePermission(PERMISSIONS.NOTIFICATIONS_ME),
    controller.markRead,
  );
  return router;
}
