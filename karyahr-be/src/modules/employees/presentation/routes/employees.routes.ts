import { Router } from "express";
import multer from "multer";
import { env } from "../../../../config/env";
import { PrismaAuditLogRepository } from "../../../../shared/audit/PrismaAuditLogRepository";
import { getPrisma } from "../../../../shared/database/prisma";
import { requireAuth } from "../../../../shared/middleware/require-auth";
import { requirePermission } from "../../../../shared/middleware/require-permission";
import { MinioObjectStorage } from "../../../../shared/storage/MinioObjectStorage";
import { PrismaUserRepository } from "../../../auth/data/PrismaUserRepository";
import { PERMISSIONS } from "../../../../shared/auth/permissions";
import {
  PrismaEmployeeChangeRequestRepository,
  PrismaEmployeeDocumentRepository,
  PrismaEmployeeMutationRepository,
  PrismaEmployeeRepository,
} from "../../data/PrismaEmployeeRepository";
import {
  ApproveChangeRequestUseCase,
  CreateChangeRequestUseCase,
  ListMyChangeRequestsUseCase,
  RejectChangeRequestUseCase,
} from "../../domain/usecases/EmployeeChangeRequest.usecase";
import {
  CreateEmployeeUseCase,
  GetEmployeeByIdUseCase,
  ListEmployeesUseCase,
  UpdateEmployeeUseCase,
} from "../../domain/usecases/EmployeeCrud.usecase";
import {
  DeleteEmployeeDocumentUseCase,
  GetEmployeeDocumentFileUseCase,
  ListEmployeeDocumentsUseCase,
  UploadEmployeeDocumentUseCase,
} from "../../domain/usecases/EmployeeDocument.usecase";
import {
  CreateEmployeeMutationUseCase,
  ListEmployeeMutationsUseCase,
} from "../../domain/usecases/EmployeeMutation.usecase";
import { createEmployeeController } from "../controllers/employees.controller";

/**
 * Registers employee, document, mutation, and ESS routes.
 */
export function createEmployeeRouter(): Router {
  const prisma = getPrisma();
  const employees = new PrismaEmployeeRepository(prisma);
  const mutations = new PrismaEmployeeMutationRepository(prisma);
  const documents = new PrismaEmployeeDocumentRepository(prisma);
  const changeRequests = new PrismaEmployeeChangeRequestRepository(prisma);
  const users = new PrismaUserRepository(prisma);
  const audit = new PrismaAuditLogRepository(prisma);
  const storage = new MinioObjectStorage();
  const maxBytes = env().MAX_UPLOAD_BYTES;
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxBytes } });

  const controller = createEmployeeController({
    createEmployee: new CreateEmployeeUseCase(employees, audit),
    updateEmployee: new UpdateEmployeeUseCase(employees, users, audit),
    getEmployee: new GetEmployeeByIdUseCase(employees),
    listEmployees: new ListEmployeesUseCase(employees),
    createMutation: new CreateEmployeeMutationUseCase(employees, mutations, audit),
    listMutations: new ListEmployeeMutationsUseCase(employees, mutations),
    uploadDocument: new UploadEmployeeDocumentUseCase(
      employees,
      documents,
      storage,
      audit,
      maxBytes,
    ),
    listDocuments: new ListEmployeeDocumentsUseCase(employees, documents),
    getDocumentFile: new GetEmployeeDocumentFileUseCase(documents, storage),
    deleteDocument: new DeleteEmployeeDocumentUseCase(documents, storage, audit),
    createChangeRequest: new CreateChangeRequestUseCase(employees, changeRequests, audit),
    listMyChangeRequests: new ListMyChangeRequestsUseCase(changeRequests),
    approveChangeRequest: new ApproveChangeRequestUseCase(employees, changeRequests, audit),
    rejectChangeRequest: new RejectChangeRequestUseCase(changeRequests, audit),
  });

  const router = Router();
  router.get(
    "/employees/me",
    requireAuth,
    requirePermission(PERMISSIONS.EMPLOYEES_ME_READ),
    controller.getMe,
  );
  router.post(
    "/employees/me/change-requests",
    requireAuth,
    requirePermission(PERMISSIONS.EMPLOYEES_CHANGE_REQUEST_CREATE),
    controller.createChangeRequest,
  );
  router.get(
    "/employees/me/change-requests",
    requireAuth,
    requirePermission(PERMISSIONS.EMPLOYEES_CHANGE_REQUEST_READ),
    controller.listMyChangeRequests,
  );
  router.post(
    "/employees/change-requests/:id/approve",
    requireAuth,
    requirePermission(PERMISSIONS.EMPLOYEES_CHANGE_REQUEST_REVIEW),
    controller.approveChangeRequest,
  );
  router.post(
    "/employees/change-requests/:id/reject",
    requireAuth,
    requirePermission(PERMISSIONS.EMPLOYEES_CHANGE_REQUEST_REVIEW),
    controller.rejectChangeRequest,
  );
  router.get(
    "/employees",
    requireAuth,
    requirePermission(PERMISSIONS.EMPLOYEES_READ),
    controller.list,
  );
  router.post(
    "/employees",
    requireAuth,
    requirePermission(PERMISSIONS.EMPLOYEES_WRITE),
    controller.create,
  );
  router.get(
    "/employees/:id",
    requireAuth,
    requirePermission(PERMISSIONS.EMPLOYEES_READ),
    controller.getById,
  );
  router.patch(
    "/employees/:id",
    requireAuth,
    requirePermission(PERMISSIONS.EMPLOYEES_WRITE),
    controller.update,
  );
  router.post(
    "/employees/:id/mutations",
    requireAuth,
    requirePermission(PERMISSIONS.EMPLOYEES_WRITE),
    controller.createMutation,
  );
  router.get(
    "/employees/:id/mutations",
    requireAuth,
    requirePermission(PERMISSIONS.EMPLOYEES_READ),
    controller.listMutations,
  );
  router.post(
    "/employees/:id/documents",
    requireAuth,
    requirePermission(PERMISSIONS.EMPLOYEES_DOCUMENTS_WRITE),
    upload.single("file"),
    controller.uploadDocument,
  );
  router.get(
    "/employees/:id/documents",
    requireAuth,
    requirePermission(PERMISSIONS.EMPLOYEES_DOCUMENTS_READ),
    controller.listDocuments,
  );
  router.get(
    "/employees/:id/documents/:docId/file",
    requireAuth,
    requirePermission(PERMISSIONS.EMPLOYEES_DOCUMENTS_READ),
    controller.downloadDocument,
  );
  router.delete(
    "/employees/:id/documents/:docId",
    requireAuth,
    requirePermission(PERMISSIONS.EMPLOYEES_DOCUMENTS_WRITE),
    controller.deleteDocument,
  );
  return router;
}
