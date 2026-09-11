import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { asyncHandler } from "../../../../shared/middleware/async-handler";
import { UnauthorizedError, ValidationError } from "../../../../shared/errors/app-error";
import { attachmentContentDisposition } from "../../../../shared/utils/content-disposition";
import { parsePagination, paginationMeta } from "../../../../shared/utils/pagination";
import type { DocumentType } from "../../domain/entities/Employee";
import type {
  ApproveChangeRequestUseCase,
  CreateChangeRequestUseCase,
  ListMyChangeRequestsUseCase,
  RejectChangeRequestUseCase,
} from "../../domain/usecases/EmployeeChangeRequest.usecase";
import type {
  CreateEmployeeUseCase,
  GetEmployeeByIdUseCase,
  ListEmployeesUseCase,
  UpdateEmployeeUseCase,
} from "../../domain/usecases/EmployeeCrud.usecase";
import type { OffboardEmployeeUseCase } from "../../domain/usecases/OffboardEmployee.usecase";
import type {
  DeleteEmployeeDocumentUseCase,
  GetEmployeeDocumentFileUseCase,
  ListEmployeeDocumentsUseCase,
  UploadEmployeeDocumentUseCase,
} from "../../domain/usecases/EmployeeDocument.usecase";
import type {
  CreateEmployeeMutationUseCase,
  ListEmployeeMutationsUseCase,
} from "../../domain/usecases/EmployeeMutation.usecase";
import {
  createChangeRequestSchema,
  createEmployeeSchema,
  createMutationSchema,
  documentTypeSchema,
  listEmployeesQuerySchema,
  offboardEmployeeSchema,
  reviewChangeRequestSchema,
  updateEmployeeSchema,
} from "../schemas/employee.schema";
import { routeParam } from "../../../../shared/utils/route-param";

function actor(req: Request): { userId: string; employeeId: string } {
  if (!req.auth) {
    throw new UnauthorizedError();
  }
  return { userId: req.auth.userId, employeeId: req.auth.employeeId };
}

/**
 * HTTP handlers for employees, documents, mutations, and ESS requests.
 */
export function createEmployeeController(deps: {
  readonly createEmployee: CreateEmployeeUseCase;
  readonly updateEmployee: UpdateEmployeeUseCase;
  readonly getEmployee: GetEmployeeByIdUseCase;
  readonly listEmployees: ListEmployeesUseCase;
  readonly createMutation: CreateEmployeeMutationUseCase;
  readonly listMutations: ListEmployeeMutationsUseCase;
  readonly uploadDocument: UploadEmployeeDocumentUseCase;
  readonly listDocuments: ListEmployeeDocumentsUseCase;
  readonly getDocumentFile: GetEmployeeDocumentFileUseCase;
  readonly deleteDocument: DeleteEmployeeDocumentUseCase;
  readonly createChangeRequest: CreateChangeRequestUseCase;
  readonly listMyChangeRequests: ListMyChangeRequestsUseCase;
  readonly approveChangeRequest: ApproveChangeRequestUseCase;
  readonly rejectChangeRequest: RejectChangeRequestUseCase;
  readonly offboardEmployee: OffboardEmployeeUseCase;
}) {
  const list = asyncHandler(async (req: Request, res: Response) => {
    const query = listEmployeesQuerySchema.parse(req.query);
    const pagination = parsePagination({ page: query.page, pageSize: query.pageSize });
    const result = await deps.listEmployees.execute({
      departmentId: query.departmentId,
      status: query.status,
      search: query.search,
      pagination,
    });
    res.status(200).json({
      data: result.items,
      meta: paginationMeta(result.total, pagination.page, pagination.pageSize),
    });
  });

  const create = asyncHandler(async (req: Request, res: Response) => {
    const body = createEmployeeSchema.parse(req.body);
    const employee = await deps.createEmployee.execute(
      { ...body, managerId: body.managerId ?? null },
      actor(req).userId,
    );
    res.status(201).json(employee);
  });

  const getById = asyncHandler(async (req: Request, res: Response) => {
    const employee = await deps.getEmployee.execute(routeParam(req.params.id, "id"));
    res.status(200).json(employee);
  });

  const getMe = asyncHandler(async (req: Request, res: Response) => {
    const employee = await deps.getEmployee.execute(actor(req).employeeId);
    res.status(200).json(employee);
  });

  const update = asyncHandler(async (req: Request, res: Response) => {
    const body = updateEmployeeSchema.parse(req.body);
    const employee = await deps.updateEmployee.execute(routeParam(req.params.id, "id"), body, actor(req).userId);
    res.status(200).json(employee);
  });

  const offboard = asyncHandler(async (req: Request, res: Response) => {
    const body = offboardEmployeeSchema.parse(req.body ?? {});
    const currentActor = actor(req);
    const employee = await deps.offboardEmployee.execute({
      employeeId: routeParam(req.params.id, "id"),
      actorUserId: currentActor.userId,
      actorEmployeeId: currentActor.employeeId,
      reason: body.reason,
    });
    res.status(200).json(employee);
  });

  const createMutation = asyncHandler(async (req: Request, res: Response) => {
    const body = createMutationSchema.parse(req.body);
    const mutation = await deps.createMutation.execute({
      employeeId: routeParam(req.params.id, "id"),
      toDepartmentId: body.toDepartmentId,
      toPositionId: body.toPositionId,
      effectiveAt: body.effectiveAt,
      reason: body.reason,
      createdByUserId: actor(req).userId,
    });
    res.status(201).json(mutation);
  });

  const listMutations = asyncHandler(async (req: Request, res: Response) => {
    const data = await deps.listMutations.execute(routeParam(req.params.id, "id"));
    res.status(200).json({ data });
  });

  const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      throw new ValidationError("File is required");
    }
    const type = documentTypeSchema.parse(req.body.type) as DocumentType;
    const document = await deps.uploadDocument.execute({
      employeeId: routeParam(req.params.id, "id"),
      documentId: randomUUID(),
      type,
      fileName: file.originalname,
      contentType: file.mimetype,
      body: file.buffer,
      uploadedByUserId: actor(req).userId,
    });
    res.status(201).json(document);
  });

  const listDocuments = asyncHandler(async (req: Request, res: Response) => {
    const data = await deps.listDocuments.execute(routeParam(req.params.id, "id"));
    res.status(200).json({ data });
  });

  const downloadDocument = asyncHandler(async (req: Request, res: Response) => {
    const result = await deps.getDocumentFile.execute(
      routeParam(req.params.docId, "docId"),
      routeParam(req.params.id, "id"),
    );
    res.setHeader("Content-Type", result.document.contentType);
    res.setHeader("Content-Disposition", attachmentContentDisposition(result.document.fileName));
    result.object.stream.pipe(res);
  });

  const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
    await deps.deleteDocument.execute(
      routeParam(req.params.docId, "docId"),
      routeParam(req.params.id, "id"),
      actor(req).userId,
    );
    res.status(204).send();
  });

  const createChangeRequest = asyncHandler(async (req: Request, res: Response) => {
    const body = createChangeRequestSchema.parse(req.body);
    const request = await deps.createChangeRequest.execute(
      actor(req).employeeId,
      body,
      actor(req).userId,
    );
    res.status(201).json(request);
  });

  const listMyChangeRequests = asyncHandler(async (req: Request, res: Response) => {
    const data = await deps.listMyChangeRequests.execute(actor(req).employeeId);
    res.status(200).json({ data });
  });

  const approveChangeRequest = asyncHandler(async (req: Request, res: Response) => {
    const body = reviewChangeRequestSchema.parse(req.body ?? {});
    const request = await deps.approveChangeRequest.execute(
      routeParam(req.params.id, "id"),
      actor(req).userId,
      body.reviewNote ?? null,
    );
    res.status(200).json(request);
  });

  const rejectChangeRequest = asyncHandler(async (req: Request, res: Response) => {
    const body = reviewChangeRequestSchema.parse(req.body ?? {});
    const request = await deps.rejectChangeRequest.execute(
      routeParam(req.params.id, "id"),
      actor(req).userId,
      body.reviewNote ?? null,
    );
    res.status(200).json(request);
  });

  return {
    list,
    create,
    getById,
    getMe,
    update,
    offboard,
    createMutation,
    listMutations,
    uploadDocument,
    listDocuments,
    downloadDocument,
    deleteDocument,
    createChangeRequest,
    listMyChangeRequests,
    approveChangeRequest,
    rejectChangeRequest,
  };
}
