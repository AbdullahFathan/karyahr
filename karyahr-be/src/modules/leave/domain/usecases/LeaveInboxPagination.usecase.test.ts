import { describe, expect, test } from "bun:test";
import { parsePagination } from "../../../../shared/utils/pagination";
import type { LeaveRequest } from "../entities/Leave";
import type { ILeaveRequestRepository } from "../repositories/ILeaveRepository";
import { ListLeaveInboxUseCase } from "./LeaveRequest.usecase";

class MemoryLeaveRequests implements ILeaveRequestRepository {
  constructor(private readonly items: LeaveRequest[]) {}
  async create(): Promise<never> {
    throw new Error("unused");
  }
  async findById() {
    return null;
  }
  async listByEmployee(
    employeeId: string,
    pagination: { readonly skip: number; readonly take: number },
  ) {
    const all = this.items.filter((item) => item.employeeId === employeeId);
    return { total: all.length, items: all.slice(pagination.skip, pagination.skip + pagination.take) };
  }
  async listPending(pagination: { readonly skip: number; readonly take: number }) {
    const all = this.items.filter((item) => item.status === "PENDING");
    return { total: all.length, items: all.slice(pagination.skip, pagination.skip + pagination.take) };
  }
  async listPendingForApprover(
    _approverEmployeeId: string,
    pagination: { readonly skip: number; readonly take: number },
  ) {
    return this.listPending(pagination);
  }
  async updateStatus(): Promise<LeaveRequest> {
    throw new Error("unused");
  }
  async findOverlapping() {
    return [];
  }
}

describe("ListLeaveInboxUseCase pagination", () => {
  test("returns a page of pending requests for HR", async () => {
    const items: LeaveRequest[] = Array.from({ length: 5 }, (_, index) => ({
      id: `req-${index}`,
      employeeId: `emp-${index}`,
      leaveTypeId: "type-1",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-02"),
      days: 2,
      reason: "x",
      status: "PENDING",
      currentStep: 1,
    }));
    const result = await new ListLeaveInboxUseCase(new MemoryLeaveRequests(items)).execute(
      { userId: "u1", employeeId: "hr-1", isHr: true },
      parsePagination({ page: 1, pageSize: 2 }),
    );
    expect(result.total).toBe(5);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.id).toBe("req-0");
  });
});
