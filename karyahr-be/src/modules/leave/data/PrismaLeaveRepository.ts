import type { PrismaClient } from "../../../../prisma/generated/prisma/client";
import type {
  LeaveApproval,
  LeaveAttachment,
  LeaveBalance,
  LeavePolicy,
  LeaveRequest,
  LeaveRequestDetail,
  LeaveType,
} from "../domain/entities/Leave";
import type {
  CreateLeavePolicyInput,
  CreateLeaveRequestInput,
  CreateLeaveTypeInput,
  ILeaveApprovalRepository,
  ILeaveAttachmentRepository,
  ILeaveBalanceRepository,
  ILeavePolicyRepository,
  ILeaveRequestRepository,
  ILeaveTypeRepository,
  UpdateLeavePolicyInput,
  UpdateLeaveTypeInput,
} from "../domain/repositories/ILeaveRepository";

function toType(row: LeaveType): LeaveType {
  return row;
}
function toPolicy(row: LeavePolicy): LeavePolicy {
  return row;
}
function toBalance(row: LeaveBalance): LeaveBalance {
  return row;
}
function toRequest(row: LeaveRequest): LeaveRequest {
  return row;
}
function toApproval(row: LeaveApproval): LeaveApproval {
  return row;
}
function toAttachment(row: LeaveAttachment): LeaveAttachment {
  return row;
}

/**
 * Leave type persistence with Prisma.
 */
export class PrismaLeaveTypeRepository implements ILeaveTypeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateLeaveTypeInput): Promise<LeaveType> {
    return toType(await this.prisma.leaveType.create({ data: input }));
  }

  async update(id: string, input: UpdateLeaveTypeInput): Promise<LeaveType> {
    return toType(await this.prisma.leaveType.update({ where: { id }, data: input }));
  }

  async findById(id: string): Promise<LeaveType | null> {
    const row = await this.prisma.leaveType.findUnique({ where: { id } });
    return row ? toType(row) : null;
  }

  async findByCode(code: string): Promise<LeaveType | null> {
    const row = await this.prisma.leaveType.findUnique({ where: { code } });
    return row ? toType(row) : null;
  }

  async list(): Promise<readonly LeaveType[]> {
    const rows = await this.prisma.leaveType.findMany({ orderBy: { name: "asc" } });
    return rows.map(toType);
  }
}

/**
 * Leave policy persistence with Prisma.
 */
export class PrismaLeavePolicyRepository implements ILeavePolicyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateLeavePolicyInput): Promise<LeavePolicy> {
    return toPolicy(await this.prisma.leavePolicy.create({ data: input }));
  }

  async update(id: string, input: UpdateLeavePolicyInput): Promise<LeavePolicy> {
    return toPolicy(await this.prisma.leavePolicy.update({ where: { id }, data: input }));
  }

  async findById(id: string): Promise<LeavePolicy | null> {
    const row = await this.prisma.leavePolicy.findUnique({ where: { id } });
    return row ? toPolicy(row) : null;
  }

  async listByLeaveType(leaveTypeId: string): Promise<readonly LeavePolicy[]> {
    const rows = await this.prisma.leavePolicy.findMany({ where: { leaveTypeId } });
    return rows.map(toPolicy);
  }

  async list(): Promise<readonly LeavePolicy[]> {
    const rows = await this.prisma.leavePolicy.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(toPolicy);
  }
}

/**
 * Leave balance persistence with Prisma.
 */
export class PrismaLeaveBalanceRepository implements ILeaveBalanceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmployeeTypeYear(
    employeeId: string,
    leaveTypeId: string,
    year: number,
  ): Promise<LeaveBalance | null> {
    const row = await this.prisma.leaveBalance.findUnique({
      where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    });
    return row ? toBalance(row) : null;
  }

  async upsert(input: {
    readonly employeeId: string;
    readonly leaveTypeId: string;
    readonly year: number;
    readonly entitledDays: number;
    readonly usedDays: number;
    readonly pendingDays: number;
    readonly lastAccruedYearMonth: number | null;
  }): Promise<LeaveBalance> {
    const row = await this.prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: input.employeeId,
          leaveTypeId: input.leaveTypeId,
          year: input.year,
        },
      },
      create: input,
      update: {
        entitledDays: input.entitledDays,
        usedDays: input.usedDays,
        pendingDays: input.pendingDays,
        lastAccruedYearMonth: input.lastAccruedYearMonth,
      },
    });
    return toBalance(row);
  }

  async listByEmployee(employeeId: string, year: number): Promise<readonly LeaveBalance[]> {
    const rows = await this.prisma.leaveBalance.findMany({
      where: { employeeId, year },
      orderBy: { leaveTypeId: "asc" },
    });
    return rows.map(toBalance);
  }
}

function mapDetail(row: {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: LeaveRequest["status"];
  currentStep: number;
  approvals: LeaveApproval[];
  attachments: LeaveAttachment[];
}): LeaveRequestDetail {
  return {
    request: toRequest({
      id: row.id,
      employeeId: row.employeeId,
      leaveTypeId: row.leaveTypeId,
      startDate: row.startDate,
      endDate: row.endDate,
      days: row.days,
      reason: row.reason,
      status: row.status,
      currentStep: row.currentStep,
    }),
    approvals: row.approvals.map(toApproval),
    attachments: row.attachments.map(toAttachment),
  };
}

const requestInclude = { approvals: true, attachments: true } as const;

/**
 * Leave request persistence with Prisma.
 */
export class PrismaLeaveRequestRepository implements ILeaveRequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    input: CreateLeaveRequestInput,
    approvals: readonly Omit<LeaveApproval, "id" | "requestId">[],
  ): Promise<LeaveRequestDetail> {
    const row = await this.prisma.leaveRequest.create({
      data: {
        ...input,
        approvals: {
          create: approvals.map((item) => ({
            step: item.step,
            approverEmployeeId: item.approverEmployeeId,
            status: item.status,
            comment: item.comment,
            decidedAt: item.decidedAt,
          })),
        },
      },
      include: requestInclude,
    });
    return mapDetail(row);
  }

  async findById(id: string): Promise<LeaveRequestDetail | null> {
    const row = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: requestInclude,
    });
    return row ? mapDetail(row) : null;
  }

  async listByEmployee(employeeId: string): Promise<readonly LeaveRequest[]> {
    const rows = await this.prisma.leaveRequest.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toRequest);
  }

  async listPending(): Promise<readonly LeaveRequest[]> {
    const rows = await this.prisma.leaveRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toRequest);
  }

  async listPendingForApprover(approverEmployeeId: string): Promise<readonly LeaveRequest[]> {
    const rows = await this.prisma.leaveRequest.findMany({
      where: {
        status: "PENDING",
        approvals: {
          some: {
            status: "PENDING",
            approverEmployeeId,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toRequest);
  }

  async updateStatus(
    id: string,
    input: { readonly status: LeaveRequest["status"]; readonly currentStep: number },
  ): Promise<LeaveRequest> {
    return toRequest(await this.prisma.leaveRequest.update({ where: { id }, data: input }));
  }

  async findOverlapping(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<readonly LeaveRequest[]> {
    const rows = await this.prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    return rows.map(toRequest);
  }
}

/**
 * Leave approval persistence with Prisma.
 */
export class PrismaLeaveApprovalRepository implements ILeaveApprovalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async decide(
    id: string,
    input: {
      readonly status: "APPROVED" | "REJECTED";
      readonly comment: string | null;
      readonly decidedAt: Date;
      readonly approverEmployeeId: string;
    },
  ): Promise<LeaveApproval> {
    return toApproval(
      await this.prisma.leaveApproval.update({
        where: { id },
        data: input,
      }),
    );
  }
}

/**
 * Leave attachment persistence with Prisma.
 */
export class PrismaLeaveAttachmentRepository implements ILeaveAttachmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: Omit<LeaveAttachment, "id"> & { readonly id: string }): Promise<LeaveAttachment> {
    return toAttachment(await this.prisma.leaveAttachment.create({ data: input }));
  }
}
