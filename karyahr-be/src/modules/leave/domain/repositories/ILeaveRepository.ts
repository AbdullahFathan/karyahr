import type {
  LeaveApproval,
  LeaveAttachment,
  LeaveBalance,
  LeavePolicy,
  LeaveRequest,
  LeaveRequestDetail,
  LeaveType,
} from "../entities/Leave";

export type CreateLeaveTypeInput = Omit<LeaveType, "id">;
export type UpdateLeaveTypeInput = Partial<Omit<LeaveType, "id" | "code">> & { readonly code?: string };

export type ILeaveTypeRepository = {
  create(input: CreateLeaveTypeInput): Promise<LeaveType>;
  update(id: string, input: UpdateLeaveTypeInput): Promise<LeaveType>;
  findById(id: string): Promise<LeaveType | null>;
  findByCode(code: string): Promise<LeaveType | null>;
  list(): Promise<readonly LeaveType[]>;
};

export type CreateLeavePolicyInput = Omit<LeavePolicy, "id">;
export type UpdateLeavePolicyInput = Partial<Omit<LeavePolicy, "id" | "leaveTypeId">>;

export type ILeavePolicyRepository = {
  create(input: CreateLeavePolicyInput): Promise<LeavePolicy>;
  update(id: string, input: UpdateLeavePolicyInput): Promise<LeavePolicy>;
  findById(id: string): Promise<LeavePolicy | null>;
  listByLeaveType(leaveTypeId: string): Promise<readonly LeavePolicy[]>;
  list(): Promise<readonly LeavePolicy[]>;
};

export type ILeaveBalanceRepository = {
  findByEmployeeTypeYear(
    employeeId: string,
    leaveTypeId: string,
    year: number,
  ): Promise<LeaveBalance | null>;
  upsert(input: {
    readonly employeeId: string;
    readonly leaveTypeId: string;
    readonly year: number;
    readonly entitledDays: number;
    readonly usedDays: number;
    readonly pendingDays: number;
    readonly lastAccruedYearMonth: number | null;
  }): Promise<LeaveBalance>;
  listByEmployee(employeeId: string, year: number): Promise<readonly LeaveBalance[]>;
};

export type CreateLeaveRequestInput = Omit<LeaveRequest, "id">;

export type ILeaveRequestRepository = {
  create(input: CreateLeaveRequestInput, approvals: readonly Omit<LeaveApproval, "id" | "requestId">[]): Promise<LeaveRequestDetail>;
  findById(id: string): Promise<LeaveRequestDetail | null>;
  listByEmployee(employeeId: string): Promise<readonly LeaveRequest[]>;
  listPending(): Promise<readonly LeaveRequest[]>;
  listPendingForApprover(approverEmployeeId: string): Promise<readonly LeaveRequest[]>;
  updateStatus(
    id: string,
    input: { readonly status: LeaveRequest["status"]; readonly currentStep: number },
  ): Promise<LeaveRequest>;
  findOverlapping(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<readonly LeaveRequest[]>;
};

export type ILeaveApprovalRepository = {
  decide(
    id: string,
    input: {
      readonly status: "APPROVED" | "REJECTED";
      readonly comment: string | null;
      readonly decidedAt: Date;
      readonly approverEmployeeId: string;
    },
  ): Promise<LeaveApproval>;
};

export type ILeaveAttachmentRepository = {
  create(input: Omit<LeaveAttachment, "id"> & { readonly id: string }): Promise<LeaveAttachment>;
};
