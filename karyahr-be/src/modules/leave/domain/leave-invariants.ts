import { ConflictError, ValidationError } from "../../../shared/errors/app-error";
import type { LeaveBalance, LeavePolicy } from "./entities/Leave";
import { inclusiveWorkDays } from "../../../shared/utils/jakarta-time";

/**
 * Inclusive leave duration in calendar days.
 */
export function leaveDayCount(startDate: Date, endDate: Date): number {
  if (endDate.getTime() < startDate.getTime()) {
    throw new ValidationError("endDate must be on or after startDate");
  }
  const days = inclusiveWorkDays(startDate, endDate);
  if (days < 1) {
    throw new ValidationError("Leave must cover at least one day");
  }
  return days;
}

/**
 * Picks the most specific policy: position, then department, then global.
 */
export function resolveLeavePolicy(
  policies: readonly LeavePolicy[],
  departmentId: string,
  positionId: string,
): LeavePolicy | null {
  const byPosition = policies.find((item) => item.positionId === positionId);
  if (byPosition) {
    return byPosition;
  }
  const byDepartment = policies.find(
    (item) => item.departmentId === departmentId && item.positionId === null,
  );
  if (byDepartment) {
    return byDepartment;
  }
  return policies.find((item) => item.departmentId === null && item.positionId === null) ?? null;
}

/**
 * Remaining days after used and reserved pending.
 */
export function availableBalanceDays(balance: LeaveBalance): number {
  return balance.entitledDays - balance.usedDays - balance.pendingDays;
}

/**
 * Rejects a request that exceeds remaining balance.
 */
export function assertSufficientBalance(balance: LeaveBalance, days: number): void {
  if (availableBalanceDays(balance) < days) {
    throw new ConflictError("Insufficient leave balance");
  }
}

/**
 * Caps entitled days at the annual allowance.
 */
export function capEntitled(entitledDays: number, annualAllowanceDays: number): number {
  return Math.min(entitledDays, annualAllowanceDays);
}
