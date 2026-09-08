import { Router } from "express";
import { getPrisma } from "../../../../shared/database/prisma";
import { requireAuth } from "../../../../shared/middleware/require-auth";
import { requirePermission } from "../../../../shared/middleware/require-permission";
import { PERMISSIONS } from "../../../../shared/auth/permissions";
import {
  PrismaDepartmentRepository,
  PrismaOrgTreeReader,
  PrismaPositionRepository,
} from "../../data/PrismaOrgRepository";
import {
  CreateDepartmentUseCase,
  CreatePositionUseCase,
  DeleteDepartmentUseCase,
  DeletePositionUseCase,
  GetOrgTreeUseCase,
  ListDepartmentsUseCase,
  ListPositionsUseCase,
  UpdateDepartmentUseCase,
  UpdatePositionUseCase,
} from "../../domain/usecases/Org.usecase";
import { createOrgController } from "../controllers/org.controller";

/**
 * Registers organization routes.
 */
export function createOrgRouter(): Router {
  const prisma = getPrisma();
  const departments = new PrismaDepartmentRepository(prisma);
  const positions = new PrismaPositionRepository(prisma);
  const controller = createOrgController({
    listDepartments: new ListDepartmentsUseCase(departments),
    createDepartment: new CreateDepartmentUseCase(departments),
    updateDepartment: new UpdateDepartmentUseCase(departments),
    deleteDepartment: new DeleteDepartmentUseCase(departments),
    listPositions: new ListPositionsUseCase(positions),
    createPosition: new CreatePositionUseCase(positions, departments),
    updatePosition: new UpdatePositionUseCase(positions, departments),
    deletePosition: new DeletePositionUseCase(positions),
    getTree: new GetOrgTreeUseCase(departments, positions, new PrismaOrgTreeReader(prisma)),
  });

  const router = Router();
  router.get("/org/tree", requireAuth, requirePermission(PERMISSIONS.ORG_READ), controller.tree);
  router.get(
    "/departments",
    requireAuth,
    requirePermission(PERMISSIONS.ORG_READ),
    controller.listDepartments,
  );
  router.post(
    "/departments",
    requireAuth,
    requirePermission(PERMISSIONS.ORG_WRITE),
    controller.createDepartment,
  );
  router.patch(
    "/departments/:id",
    requireAuth,
    requirePermission(PERMISSIONS.ORG_WRITE),
    controller.updateDepartment,
  );
  router.delete(
    "/departments/:id",
    requireAuth,
    requirePermission(PERMISSIONS.ORG_WRITE),
    controller.deleteDepartment,
  );
  router.get(
    "/positions",
    requireAuth,
    requirePermission(PERMISSIONS.ORG_READ),
    controller.listPositions,
  );
  router.post(
    "/positions",
    requireAuth,
    requirePermission(PERMISSIONS.ORG_WRITE),
    controller.createPosition,
  );
  router.patch(
    "/positions/:id",
    requireAuth,
    requirePermission(PERMISSIONS.ORG_WRITE),
    controller.updatePosition,
  );
  router.delete(
    "/positions/:id",
    requireAuth,
    requirePermission(PERMISSIONS.ORG_WRITE),
    controller.deletePosition,
  );
  return router;
}
