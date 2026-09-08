export type IApprovedLeaveLookup = {
  hasApprovedLeave(employeeId: string, workDate: Date): Promise<boolean>;
  listEmployeeIdsOnLeave(
    workDate: Date,
    employeeIds: readonly string[],
  ): Promise<readonly string[]>;
};
