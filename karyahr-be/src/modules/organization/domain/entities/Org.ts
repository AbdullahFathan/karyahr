export type Department = {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly parentId: string | null;
  readonly isActive: boolean;
};

export type Position = {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly parentId: string | null;
  readonly departmentId: string | null;
  readonly isActive: boolean;
};

export type OrgTreeEmployee = {
  readonly id: string;
  readonly fullName: string;
  readonly departmentId: string;
  readonly positionId: string;
  readonly positionName: string;
};

export type OrgTreeNode = {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly isActive: boolean;
  readonly positions: readonly {
    readonly id: string;
    readonly name: string;
    readonly code: string;
  }[];
  readonly employees: readonly OrgTreeEmployee[];
  readonly children: readonly OrgTreeNode[];
};
