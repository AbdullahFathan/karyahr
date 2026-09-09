import { Router } from "express";
import multer from "multer";
import { env } from "../../../../config/env";
import { PrismaAuditLogRepository } from "../../../../shared/audit/PrismaAuditLogRepository";
import { getPrisma } from "../../../../shared/database/prisma";
import { requireAuth } from "../../../../shared/middleware/require-auth";
import { requirePermission } from "../../../../shared/middleware/require-permission";
import { PERMISSIONS } from "../../../../shared/auth/permissions";
import { createObjectStorage } from "../../../../shared/storage/createObjectStorage";
import { PrismaUserRepository } from "../../../auth/data/PrismaUserRepository";
import { PrismaEmployeeRepository } from "../../../employees/data/PrismaEmployeeRepository";
import { QueueNotificationDispatcher } from "../../../notifications/data/QueueNotificationDispatcher";
import {
  PrismaLeaveApprovalRepository,
  PrismaLeaveAttachmentRepository,
  PrismaLeaveBalanceRepository,
  PrismaLeavePolicyRepository,
  PrismaLeaveRequestRepository,
  PrismaLeaveTypeRepository,
} from "../../data/PrismaLeaveRepository";
import {
  CreateLeavePolicyUseCase,
  CreateLeaveTypeUseCase,
  ListLeavePoliciesUseCase,
  ListLeaveTypesUseCase,
  UpdateLeavePolicyUseCase,
  UpdateLeaveTypeUseCase,
} from "../../domain/usecases/LeaveCatalog.usecase";
import {
  ApproveLeaveRequestUseCase,
  CreateLeaveRequestUseCase,
  ListLeaveInboxUseCase,
  ListMyLeaveBalancesUseCase,
  ListMyLeaveRequestsUseCase,
  RejectLeaveRequestUseCase,
} from "../../domain/usecases/LeaveRequest.usecase";
import { createLeaveController } from "../controllers/leave.controller";

/**
 * Registers leave catalog and request routes.
 */
export function createLeaveRouter(): Router {
  const prisma = getPrisma();
  const types = new PrismaLeaveTypeRepository(prisma);
  const policies = new PrismaLeavePolicyRepository(prisma);
  const balances = new PrismaLeaveBalanceRepository(prisma);
  const requests = new PrismaLeaveRequestRepository(prisma);
  const approvals = new PrismaLeaveApprovalRepository(prisma);
  const attachments = new PrismaLeaveAttachmentRepository(prisma);
  const employees = new PrismaEmployeeRepository(prisma);
  const users = new PrismaUserRepository(prisma);
  const audit = new PrismaAuditLogRepository(prisma);
  const storage = createObjectStorage();
  const dispatcher = new QueueNotificationDispatcher();
  const maxBytes = env().MAX_UPLOAD_BYTES;
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxBytes } });

  const controller = createLeaveController({
    createType: new CreateLeaveTypeUseCase(types, audit),
    updateType: new UpdateLeaveTypeUseCase(types, audit),
    listTypes: new ListLeaveTypesUseCase(types),
    createPolicy: new CreateLeavePolicyUseCase(types, policies, audit),
    updatePolicy: new UpdateLeavePolicyUseCase(policies, audit),
    listPolicies: new ListLeavePoliciesUseCase(policies),
    createRequest: new CreateLeaveRequestUseCase(
      employees,
      users,
      types,
      policies,
      balances,
      requests,
      attachments,
      storage,
      dispatcher,
      audit,
      maxBytes,
    ),
    listMine: new ListMyLeaveRequestsUseCase(requests),
    listInbox: new ListLeaveInboxUseCase(requests),
    listBalances: new ListMyLeaveBalancesUseCase(balances),
    approve: new ApproveLeaveRequestUseCase(
      employees,
      users,
      types,
      balances,
      requests,
      approvals,
      dispatcher,
      audit,
    ),
    reject: new RejectLeaveRequestUseCase(
      users,
      types,
      balances,
      requests,
      approvals,
      dispatcher,
      audit,
    ),
  });

  const router = Router();
  router.get("/leave/types", requireAuth, requirePermission(PERMISSIONS.LEAVE_REQUESTS_ME), controller.listTypes);
  router.post("/leave/types", requireAuth, requirePermission(PERMISSIONS.LEAVE_TYPES_WRITE), controller.createType);
  router.patch(
    "/leave/types/:id",
    requireAuth,
    requirePermission(PERMISSIONS.LEAVE_TYPES_WRITE),
    controller.updateType,
  );
  router.get(
    "/leave/policies",
    requireAuth,
    requirePermission(PERMISSIONS.LEAVE_POLICIES_WRITE),
    controller.listPolicies,
  );
  router.post(
    "/leave/policies",
    requireAuth,
    requirePermission(PERMISSIONS.LEAVE_POLICIES_WRITE),
    controller.createPolicy,
  );
  router.patch(
    "/leave/policies/:id",
    requireAuth,
    requirePermission(PERMISSIONS.LEAVE_POLICIES_WRITE),
    controller.updatePolicy,
  );
  router.get(
    "/leave/balances/me",
    requireAuth,
    requirePermission(PERMISSIONS.LEAVE_BALANCES_ME),
    controller.listBalances,
  );
  router.get(
    "/leave/requests/me",
    requireAuth,
    requirePermission(PERMISSIONS.LEAVE_REQUESTS_ME),
    controller.listMine,
  );
  router.get(
    "/leave/requests",
    requireAuth,
    requirePermission(PERMISSIONS.LEAVE_REQUESTS_APPROVE),
    controller.listInbox,
  );
  router.post(
    "/leave/requests",
    requireAuth,
    requirePermission(PERMISSIONS.LEAVE_REQUESTS_CREATE),
    upload.single("file"),
    controller.createRequest,
  );
  router.post(
    "/leave/requests/:id/approve",
    requireAuth,
    requirePermission(PERMISSIONS.LEAVE_REQUESTS_APPROVE),
    controller.approve,
  );
  router.post(
    "/leave/requests/:id/reject",
    requireAuth,
    requirePermission(PERMISSIONS.LEAVE_REQUESTS_APPROVE),
    controller.reject,
  );
  return router;
}
