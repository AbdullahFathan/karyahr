import type { Department, OrgTreeEmployee, Position } from "../entities/Org";

export type IDepartmentRepository = {
  list(): Promise<readonly Department[]>;
  findById(id: string): Promise<Department | null>;
  findByCode(code: string): Promise<Department | null>;
  create(input: {
    readonly name: string;
    readonly code: string;
    readonly parentId: string | null;
  }): Promise<Department>;
  update(
    id: string,
    input: {
      readonly name?: string;
      readonly code?: string;
      readonly parentId?: string | null;
      readonly isActive?: boolean;
    },
  ): Promise<Department>;
  delete(id: string): Promise<void>;
  childCount(id: string): Promise<number>;
  employeeCount(id: string): Promise<number>;
  parentMap(): Promise<ReadonlyMap<string, string | null>>;
};

export type IPositionRepository = {
  list(): Promise<readonly Position[]>;
  findById(id: string): Promise<Position | null>;
  findByCode(code: string): Promise<Position | null>;
  create(input: {
    readonly name: string;
    readonly code: string;
    readonly parentId: string | null;
    readonly departmentId: string | null;
  }): Promise<Position>;
  update(
    id: string,
    input: {
      readonly name?: string;
      readonly code?: string;
      readonly parentId?: string | null;
      readonly departmentId?: string | null;
      readonly isActive?: boolean;
    },
  ): Promise<Position>;
  delete(id: string): Promise<void>;
  childCount(id: string): Promise<number>;
  employeeCount(id: string): Promise<number>;
  parentMap(): Promise<ReadonlyMap<string, string | null>>;
};

export type IOrgTreeReader = {
  listEmployeesForTree(): Promise<readonly OrgTreeEmployee[]>;
};
