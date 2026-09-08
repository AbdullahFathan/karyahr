export type AuthUser = {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly employeeId: string;
  readonly isActive: boolean;
  readonly roleNames: readonly string[];
  readonly permissionKeys: readonly string[];
};

export type MeEmployee = {
  readonly id: string;
  readonly fullName: string;
  readonly employeeNumber: string;
  readonly status: string;
};

export type MeResult = {
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly employeeId: string;
    readonly isActive: boolean;
  };
  readonly employee: MeEmployee;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
};
