import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import type { LeavePolicy, LeaveType } from "../entities/Leave";
import type {
  CreateLeavePolicyInput,
  CreateLeaveTypeInput,
  ILeavePolicyRepository,
  ILeaveTypeRepository,
  UpdateLeavePolicyInput,
  UpdateLeaveTypeInput,
} from "../repositories/ILeaveRepository";

/**
 * Creates a leave type.
 */
export class CreateLeaveTypeUseCase {
  constructor(
    private readonly types: ILeaveTypeRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(input: CreateLeaveTypeInput, actorUserId: string): Promise<LeaveType> {
    if (await this.types.findByCode(input.code)) {
      throw new ConflictError("Leave type code already exists");
    }
    const item = await this.types.create(input);
    await this.audit.append({
      actorUserId,
      entityType: "LeaveType",
      entityId: item.id,
      action: "create",
    });
    return item;
  }
}

/**
 * Updates a leave type.
 */
export class UpdateLeaveTypeUseCase {
  constructor(
    private readonly types: ILeaveTypeRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(id: string, input: UpdateLeaveTypeInput, actorUserId: string): Promise<LeaveType> {
    const existing = await this.types.findById(id);
    if (!existing) {
      throw new NotFoundError("Leave type not found");
    }
    if (input.code && input.code !== existing.code && (await this.types.findByCode(input.code))) {
      throw new ConflictError("Leave type code already exists");
    }
    const item = await this.types.update(id, input);
    await this.audit.append({
      actorUserId,
      entityType: "LeaveType",
      entityId: id,
      action: "update",
    });
    return item;
  }
}

/**
 * Lists leave types.
 */
export class ListLeaveTypesUseCase {
  constructor(private readonly types: ILeaveTypeRepository) {}

  execute(): Promise<readonly LeaveType[]> {
    return this.types.list();
  }
}

/**
 * Creates a leave policy.
 */
export class CreateLeavePolicyUseCase {
  constructor(
    private readonly types: ILeaveTypeRepository,
    private readonly policies: ILeavePolicyRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(input: CreateLeavePolicyInput, actorUserId: string): Promise<LeavePolicy> {
    const leaveType = await this.types.findById(input.leaveTypeId);
    if (!leaveType) {
      throw new NotFoundError("Leave type not found");
    }
    if (input.approvalLevelCount < 1 || input.approvalLevelCount > 2) {
      throw new ValidationError("approvalLevelCount must be 1 or 2");
    }
    const item = await this.policies.create(input);
    await this.audit.append({
      actorUserId,
      entityType: "LeavePolicy",
      entityId: item.id,
      action: "create",
    });
    return item;
  }
}

/**
 * Updates a leave policy.
 */
export class UpdateLeavePolicyUseCase {
  constructor(
    private readonly policies: ILeavePolicyRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(id: string, input: UpdateLeavePolicyInput, actorUserId: string): Promise<LeavePolicy> {
    const existing = await this.policies.findById(id);
    if (!existing) {
      throw new NotFoundError("Leave policy not found");
    }
    if (
      input.approvalLevelCount !== undefined &&
      (input.approvalLevelCount < 1 || input.approvalLevelCount > 2)
    ) {
      throw new ValidationError("approvalLevelCount must be 1 or 2");
    }
    const item = await this.policies.update(id, input);
    await this.audit.append({
      actorUserId,
      entityType: "LeavePolicy",
      entityId: id,
      action: "update",
    });
    return item;
  }
}

/**
 * Lists leave policies.
 */
export class ListLeavePoliciesUseCase {
  constructor(private readonly policies: ILeavePolicyRepository) {}

  execute(): Promise<readonly LeavePolicy[]> {
    return this.policies.list();
  }
}
