import { randomUUID } from "node:crypto";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { ForbiddenError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { IObjectStorage } from "../../../../shared/storage/IObjectStorage";
import { HR_ADMIN_ROLE } from "../../../../shared/auth/permissions";
import { jakartaYearMonth } from "../../../../shared/utils/jakarta-time";
import type { IUserRepository } from "../../../auth/domain/repositories/IUserRepository";
import type { IEmployeeRepository } from "../../../employees/domain/repositories/IEmployeeRepository";
import type { INotificationDispatcher } from "../../../notifications/domain/ports/INotificationDispatcher";
import type { LeaveBalance, LeaveRequestDetail } from "../entities/Leave";
import {
  assertSufficientBalance,
  leaveDayCount,
  resolveLeavePolicy,
} from "../leave-invariants";
import type {
  ILeaveApprovalRepository,
  ILeaveAttachmentRepository,
  ILeaveBalanceRepository,
  ILeavePolicyRepository,
  ILeaveRequestRepository,
  ILeaveTypeRepository,
} from "../repositories/ILeaveRepository";

export type LeaveActor = {
  readonly userId: string;
  readonly employeeId: string;
  readonly isHr: boolean;
};

export type LeaveAttachmentUpload = {
  readonly buffer: Buffer;
  readonly fileName: string;
  readonly contentType: string;
};

async function notifyUsers(
  dispatcher: INotificationDispatcher,
  userIds: readonly string[],
  event: {
    readonly type: "leave.submitted" | "leave.decided";
    readonly title: string;
    readonly body: string;
    readonly entityId: string;
  },
): Promise<void> {
  await Promise.all(
    userIds.map((recipientUserId) =>
      dispatcher.dispatch({
        type: event.type,
        recipientUserId,
        title: event.title,
        body: event.body,
        entityType: "LeaveRequest",
        entityId: event.entityId,
      }),
    ),
  );
}

/**
 * Submits a leave request, reserves balance when required, and notifies approvers.
 */
export class CreateLeaveRequestUseCase {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly users: IUserRepository,
    private readonly types: ILeaveTypeRepository,
    private readonly policies: ILeavePolicyRepository,
    private readonly balances: ILeaveBalanceRepository,
    private readonly requests: ILeaveRequestRepository,
    private readonly attachments: ILeaveAttachmentRepository,
    private readonly storage: IObjectStorage,
    private readonly dispatcher: INotificationDispatcher,
    private readonly audit: IAuditLogRepository,
    private readonly maxUploadBytes: number,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(
    actor: LeaveActor,
    input: {
      readonly leaveTypeId: string;
      readonly startDate: Date;
      readonly endDate: Date;
      readonly reason: string;
      readonly file?: LeaveAttachmentUpload;
    },
  ): Promise<LeaveRequestDetail> {
    const employee = await this.employees.findById(actor.employeeId);
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }
    const leaveType = await this.types.findById(input.leaveTypeId);
    if (!leaveType || !leaveType.isActive) {
      throw new NotFoundError("Leave type not found");
    }
    if (leaveType.requiresAttachment && !input.file) {
      throw new ValidationError("This leave type requires an attachment");
    }
    if (input.file && input.file.buffer.byteLength > this.maxUploadBytes) {
      throw new ValidationError("Attachment exceeds maximum size");
    }
    const days = leaveDayCount(input.startDate, input.endDate);
    const overlapping = await this.requests.findOverlapping(
      actor.employeeId,
      input.startDate,
      input.endDate,
    );
    if (overlapping.length > 0) {
      throw new ValidationError("Leave overlaps an existing pending or approved request");
    }

    const policyList = await this.policies.listByLeaveType(leaveType.id);
    const policy = resolveLeavePolicy(policyList, employee.departmentId, employee.positionId);
    if (!policy) {
      throw new ValidationError("No leave policy applies to this employee");
    }

    if (leaveType.requiresBalance) {
      const year = Math.floor(jakartaYearMonth(this.clock()) / 100);
      let balance = await this.balances.findByEmployeeTypeYear(actor.employeeId, leaveType.id, year);
      if (!balance) {
        balance = await this.balances.upsert({
          employeeId: actor.employeeId,
          leaveTypeId: leaveType.id,
          year,
          entitledDays: 0,
          usedDays: 0,
          pendingDays: 0,
          lastAccruedYearMonth: null,
        });
      }
      assertSufficientBalance(balance, days);
      await this.balances.upsert({
        ...balance,
        pendingDays: balance.pendingDays + days,
      });
    }

    const levels = policy.approvalLevelCount;
    const managerId = employee.managerId;
    const skipManager = levels === 2 && !managerId;
    const approvalLevelCount = skipManager ? 1 : levels;
    const approvals = [];
    if (approvalLevelCount === 1) {
      approvals.push({
        step: 1,
        approverEmployeeId: managerId,
        status: "PENDING" as const,
        comment: null,
        decidedAt: null,
      });
    } else {
      approvals.push(
        {
          step: 1,
          approverEmployeeId: managerId,
          status: "PENDING" as const,
          comment: null,
          decidedAt: null,
        },
        {
          step: 2,
          approverEmployeeId: null,
          status: "PENDING" as const,
          comment: null,
          decidedAt: null,
        },
      );
    }

    const detail = await this.requests.create(
      {
        employeeId: actor.employeeId,
        leaveTypeId: leaveType.id,
        startDate: input.startDate,
        endDate: input.endDate,
        days,
        reason: input.reason,
        status: "PENDING",
        currentStep: 1,
      },
      approvals,
    );

    if (input.file) {
      const id = randomUUID();
      const objectKey = `leave/${detail.request.id}/${id}`;
      await this.storage.putObject(objectKey, input.file.buffer, input.file.contentType);
      await this.attachments.create({
        id,
        requestId: detail.request.id,
        fileName: input.file.fileName,
        contentType: input.file.contentType,
        sizeBytes: input.file.buffer.byteLength,
        objectKey,
        uploadedByUserId: actor.userId,
      });
    }

    await this.audit.append({
      actorUserId: actor.userId,
      entityType: "LeaveRequest",
      entityId: detail.request.id,
      action: "create",
    });

    const first = detail.approvals[0];
    const recipientIds: string[] = [];
    if (first?.approverEmployeeId) {
      const managerUser = await this.users.findByEmployeeId(first.approverEmployeeId);
      if (managerUser) {
        recipientIds.push(managerUser.id);
      }
    } else {
      const hrUsers = await this.users.listByRoleName(HR_ADMIN_ROLE);
      recipientIds.push(...hrUsers.map((item) => item.id));
    }
    await notifyUsers(this.dispatcher, recipientIds, {
      type: "leave.submitted",
      title: "Leave request submitted",
      body: `${employee.fullName} submitted a leave request`,
      entityId: detail.request.id,
    });

    const created = await this.requests.findById(detail.request.id);
    if (!created) {
      throw new NotFoundError("Leave request not found");
    }
    return created;
  }
}

/**
 * Lists the caller's leave requests.
 */
export class ListMyLeaveRequestsUseCase {
  constructor(private readonly requests: ILeaveRequestRepository) {}

  execute(
    employeeId: string,
    pagination: import("../../../../shared/utils/pagination").PaginationParams,
  ) {
    return this.requests.listByEmployee(employeeId, pagination);
  }
}

/**
 * Lists pending requests for HR or the current manager.
 */
export class ListLeaveInboxUseCase {
  constructor(private readonly requests: ILeaveRequestRepository) {}

  execute(
    actor: LeaveActor,
    pagination: import("../../../../shared/utils/pagination").PaginationParams,
  ) {
    if (actor.isHr) {
      return this.requests.listPending(pagination);
    }
    return this.requests.listPendingForApprover(actor.employeeId, pagination);
  }
}

/**
 * Lists balances for the caller in the current Jakarta year.
 */
export class ListMyLeaveBalancesUseCase {
  constructor(
    private readonly balances: ILeaveBalanceRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  execute(employeeId: string): Promise<readonly LeaveBalance[]> {
    const year = Math.floor(jakartaYearMonth(this.clock()) / 100);
    return this.balances.listByEmployee(employeeId, year);
  }
}

function canDecide(
  actor: LeaveActor,
  approverEmployeeId: string | null,
): boolean {
  if (approverEmployeeId) {
    return actor.employeeId === approverEmployeeId;
  }
  return actor.isHr;
}

/**
 * Approves the current leave step and consumes balance on final approval.
 */
export class ApproveLeaveRequestUseCase {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly users: IUserRepository,
    private readonly types: ILeaveTypeRepository,
    private readonly balances: ILeaveBalanceRepository,
    private readonly requests: ILeaveRequestRepository,
    private readonly approvals: ILeaveApprovalRepository,
    private readonly dispatcher: INotificationDispatcher,
    private readonly audit: IAuditLogRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(actor: LeaveActor, requestId: string, comment: string | null): Promise<LeaveRequestDetail> {
    const detail = await this.requests.findById(requestId);
    if (!detail) {
      throw new NotFoundError("Leave request not found");
    }
    if (detail.request.status !== "PENDING") {
      throw new ValidationError("Leave request is not pending");
    }
    const step = detail.approvals.find((item) => item.step === detail.request.currentStep);
    if (!step || step.status !== "PENDING") {
      throw new ValidationError("No pending approval step");
    }
    if (!canDecide(actor, step.approverEmployeeId)) {
      throw new ForbiddenError();
    }

    await this.approvals.decide(step.id, {
      status: "APPROVED",
      comment,
      decidedAt: this.clock(),
      approverEmployeeId: actor.employeeId,
    });

    const lastStep = Math.max(...detail.approvals.map((item) => item.step));
    const isFinal = detail.request.currentStep >= lastStep;
    if (isFinal) {
      await this.requests.updateStatus(requestId, { status: "APPROVED", currentStep: detail.request.currentStep });
      const leaveType = await this.types.findById(detail.request.leaveTypeId);
      if (leaveType?.requiresBalance) {
        const year = Math.floor(jakartaYearMonth(this.clock()) / 100);
        const balance = await this.balances.findByEmployeeTypeYear(
          detail.request.employeeId,
          detail.request.leaveTypeId,
          year,
        );
        if (balance) {
          await this.balances.upsert({
            ...balance,
            pendingDays: Math.max(0, balance.pendingDays - detail.request.days),
            usedDays: balance.usedDays + detail.request.days,
          });
        }
      }
      const requester = await this.users.findByEmployeeId(detail.request.employeeId);
      if (requester) {
        await notifyUsers(this.dispatcher, [requester.id], {
          type: "leave.decided",
          title: "Leave request approved",
          body: "Your leave request was approved",
          entityId: requestId,
        });
      }
    } else {
      await this.requests.updateStatus(requestId, {
        status: "PENDING",
        currentStep: detail.request.currentStep + 1,
      });
      const hrUsers = await this.users.listByRoleName(HR_ADMIN_ROLE);
      const employee = await this.employees.findById(detail.request.employeeId);
      await notifyUsers(
        this.dispatcher,
        hrUsers.map((item) => item.id),
        {
          type: "leave.submitted",
          title: "Leave request awaiting HR",
          body: `${employee?.fullName ?? "Employee"} leave request needs HR approval`,
          entityId: requestId,
        },
      );
    }

    await this.audit.append({
      actorUserId: actor.userId,
      entityType: "LeaveRequest",
      entityId: requestId,
      action: "approve",
    });
    const updated = await this.requests.findById(requestId);
    if (!updated) {
      throw new NotFoundError("Leave request not found");
    }
    return updated;
  }
}

/**
 * Rejects the current leave step and releases reserved balance.
 */
export class RejectLeaveRequestUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly types: ILeaveTypeRepository,
    private readonly balances: ILeaveBalanceRepository,
    private readonly requests: ILeaveRequestRepository,
    private readonly approvals: ILeaveApprovalRepository,
    private readonly dispatcher: INotificationDispatcher,
    private readonly audit: IAuditLogRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(actor: LeaveActor, requestId: string, comment: string | null): Promise<LeaveRequestDetail> {
    const detail = await this.requests.findById(requestId);
    if (!detail) {
      throw new NotFoundError("Leave request not found");
    }
    if (detail.request.status !== "PENDING") {
      throw new ValidationError("Leave request is not pending");
    }
    const step = detail.approvals.find((item) => item.step === detail.request.currentStep);
    if (!step || step.status !== "PENDING") {
      throw new ValidationError("No pending approval step");
    }
    if (!canDecide(actor, step.approverEmployeeId)) {
      throw new ForbiddenError();
    }

    await this.approvals.decide(step.id, {
      status: "REJECTED",
      comment,
      decidedAt: this.clock(),
      approverEmployeeId: actor.employeeId,
    });
    await this.requests.updateStatus(requestId, {
      status: "REJECTED",
      currentStep: detail.request.currentStep,
    });

    const leaveType = await this.types.findById(detail.request.leaveTypeId);
    if (leaveType?.requiresBalance) {
      const year = Math.floor(jakartaYearMonth(this.clock()) / 100);
      const balance = await this.balances.findByEmployeeTypeYear(
        detail.request.employeeId,
        detail.request.leaveTypeId,
        year,
      );
      if (balance) {
        await this.balances.upsert({
          ...balance,
          pendingDays: Math.max(0, balance.pendingDays - detail.request.days),
        });
      }
    }

    const requester = await this.users.findByEmployeeId(detail.request.employeeId);
    if (requester) {
      await notifyUsers(this.dispatcher, [requester.id], {
        type: "leave.decided",
        title: "Leave request rejected",
        body: "Your leave request was rejected",
        entityId: requestId,
      });
    }

    await this.audit.append({
      actorUserId: actor.userId,
      entityType: "LeaveRequest",
      entityId: requestId,
      action: "reject",
    });
    const updated = await this.requests.findById(requestId);
    if (!updated) {
      throw new NotFoundError("Leave request not found");
    }
    return updated;
  }
}
