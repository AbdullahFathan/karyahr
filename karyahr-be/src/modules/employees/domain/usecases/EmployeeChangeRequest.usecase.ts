import { NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import type {
  ChangeRequestInboxItem,
  ChangeRequestStatus,
  EmployeeChangeRequest,
  EssPayload,
} from "../entities/Employee";
import { parseEssPayload } from "../invariants";
import type {
  IEmployeeChangeRequestRepository,
  IEmployeeRepository,
} from "../repositories/IEmployeeRepository";

/**
 * Creates an ESS change request for allowed personal fields.
 */
export class CreateChangeRequestUseCase {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly requests: IEmployeeChangeRequestRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(
    employeeId: string,
    rawPayload: Record<string, unknown>,
    actorUserId: string,
  ): Promise<EmployeeChangeRequest> {
    const employee = await this.employees.findById(employeeId);
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }
    const payload: EssPayload = parseEssPayload(rawPayload);
    const request = await this.requests.create({ employeeId, payload });
    await this.audit.append({
      actorUserId,
      entityType: "EmployeeChangeRequest",
      entityId: request.id,
      action: "create",
      metadata: { employeeId },
    });
    return request;
  }
}

/**
 * Lists the caller's change requests.
 */
export class ListMyChangeRequestsUseCase {
  constructor(private readonly requests: IEmployeeChangeRequestRepository) {}

  execute(employeeId: string): Promise<readonly EmployeeChangeRequest[]> {
    return this.requests.listByEmployee(employeeId);
  }
}

/**
 * Lists change requests for HR review, filtered by status.
 */
export class ListChangeRequestsUseCase {
  constructor(private readonly requests: IEmployeeChangeRequestRepository) {}

  execute(status: ChangeRequestStatus): Promise<readonly ChangeRequestInboxItem[]> {
    return this.requests.listInbox(status);
  }
}

/**
 * Approves a pending change request and applies payload to the employee.
 */
export class ApproveChangeRequestUseCase {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly requests: IEmployeeChangeRequestRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(
    requestId: string,
    reviewerUserId: string,
    reviewNote: string | null,
  ): Promise<EmployeeChangeRequest> {
    const request = await this.requests.findById(requestId);
    if (!request) {
      throw new NotFoundError("Change request not found");
    }
    if (request.status !== "PENDING") {
      throw new ValidationError("Change request is not pending");
    }
    await this.employees.update(request.employeeId, request.payload);
    const reviewed = await this.requests.review(requestId, {
      status: "APPROVED",
      reviewerUserId,
      reviewNote,
    });
    await this.audit.append({
      actorUserId: reviewerUserId,
      entityType: "EmployeeChangeRequest",
      entityId: requestId,
      action: "approve",
      metadata: { employeeId: request.employeeId },
    });
    return reviewed;
  }
}

/**
 * Rejects a pending change request.
 */
export class RejectChangeRequestUseCase {
  constructor(
    private readonly requests: IEmployeeChangeRequestRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(
    requestId: string,
    reviewerUserId: string,
    reviewNote: string | null,
  ): Promise<EmployeeChangeRequest> {
    const request = await this.requests.findById(requestId);
    if (!request) {
      throw new NotFoundError("Change request not found");
    }
    if (request.status !== "PENDING") {
      throw new ValidationError("Change request is not pending");
    }
    const reviewed = await this.requests.review(requestId, {
      status: "REJECTED",
      reviewerUserId,
      reviewNote,
    });
    await this.audit.append({
      actorUserId: reviewerUserId,
      entityType: "EmployeeChangeRequest",
      entityId: requestId,
      action: "reject",
      metadata: {},
    });
    return reviewed;
  }
}
