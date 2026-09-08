import type { IEmployeeRepository } from "../../../employees/domain/repositories/IEmployeeRepository";
import { jakartaYearMonth } from "../../../../shared/utils/jakarta-time";
import { capEntitled, resolveLeavePolicy } from "../leave-invariants";
import type {
  ILeaveBalanceRepository,
  ILeavePolicyRepository,
  ILeaveTypeRepository,
} from "../repositories/ILeaveRepository";

const ACTIVE_STATUSES = ["ACTIVE", "PROBATION"] as const;

/**
 * Accrues monthly annual-leave days once per Jakarta year-month.
 */
export class AccrueAnnualLeaveUseCase {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly types: ILeaveTypeRepository,
    private readonly policies: ILeavePolicyRepository,
    private readonly balances: ILeaveBalanceRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(): Promise<{ readonly accrued: number }> {
    const now = this.clock();
    const yearMonth = jakartaYearMonth(now);
    const year = Math.floor(yearMonth / 100);
    const annual = await this.types.findByCode("ANNUAL");
    if (!annual) {
      return { accrued: 0 };
    }
    const policies = await this.policies.listByLeaveType(annual.id);
    const directory = await this.employees.listDirectory({ statuses: ACTIVE_STATUSES });
    let accrued = 0;

    for (const employee of directory) {
      const policy = resolveLeavePolicy(policies, employee.departmentId, employee.positionId);
      if (!policy || policy.accrualPerMonth <= 0) {
        continue;
      }
      const existing = await this.balances.findByEmployeeTypeYear(employee.id, annual.id, year);
      if (existing?.lastAccruedYearMonth === yearMonth) {
        continue;
      }
      const entitled = capEntitled(
        (existing?.entitledDays ?? 0) + policy.accrualPerMonth,
        policy.annualAllowanceDays,
      );
      await this.balances.upsert({
        employeeId: employee.id,
        leaveTypeId: annual.id,
        year,
        entitledDays: entitled,
        usedDays: existing?.usedDays ?? 0,
        pendingDays: existing?.pendingDays ?? 0,
        lastAccruedYearMonth: yearMonth,
      });
      accrued += 1;
    }

    return { accrued };
  }
}
