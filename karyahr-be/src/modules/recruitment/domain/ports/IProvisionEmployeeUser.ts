export type ProvisionedUser = {
  readonly userId: string;
  readonly email: string;
  readonly temporaryPassword: string;
};

export type IProvisionEmployeeUser = {
  provision(input: { readonly email: string; readonly employeeId: string }): Promise<ProvisionedUser>;
};
