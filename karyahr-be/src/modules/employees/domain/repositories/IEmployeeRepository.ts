import type { PaginationParams } from "../../../../shared/utils/pagination";
import type {
  ChangeRequestInboxItem,
  ChangeRequestStatus,
  Employee,
  EmployeeChangeRequest,
  EmployeeDocument,
  EmployeeMutation,
  EmployeeStatus,
  EssPayload,
} from "../entities/Employee";

export type EmployeeListFilter = {
  readonly departmentId?: string;
  readonly status?: EmployeeStatus;
  readonly search?: string;
  readonly pagination: PaginationParams;
};

export type EmployeeListResult = {
  readonly items: readonly Employee[];
  readonly total: number;
};

export type CreateEmployeeInput = Omit<Employee, "id">;

export type UpdateEmployeeInput = Partial<Omit<Employee, "id" | "nationalId" | "employeeNumber">> & {
  readonly nationalId?: string;
  readonly employeeNumber?: string;
};

export type EmployeeDirectoryFilter = {
  readonly managerId?: string;
  readonly departmentId?: string;
  readonly statuses?: readonly EmployeeStatus[];
  readonly pagination?: PaginationParams;
};

export type EmployeeDirectoryResult = {
  readonly items: readonly Employee[];
  readonly total: number;
};

export type IEmployeeRepository = {
  create(input: CreateEmployeeInput): Promise<Employee>;
  update(id: string, input: UpdateEmployeeInput): Promise<Employee>;
  findById(id: string): Promise<Employee | null>;
  findByIds(ids: readonly string[]): Promise<readonly Employee[]>;
  findByNationalId(nationalId: string): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  list(filter: EmployeeListFilter): Promise<EmployeeListResult>;
  listDirectory(filter: EmployeeDirectoryFilter): Promise<EmployeeDirectoryResult>;
};

export type IEmployeeMutationRepository = {
  create(input: Omit<EmployeeMutation, "id">): Promise<EmployeeMutation>;
  listByEmployee(employeeId: string): Promise<readonly EmployeeMutation[]>;
};

export type IEmployeeDocumentRepository = {
  create(input: Omit<EmployeeDocument, "id"> & { readonly id: string }): Promise<EmployeeDocument>;
  findById(id: string): Promise<EmployeeDocument | null>;
  listByEmployee(employeeId: string): Promise<readonly EmployeeDocument[]>;
  delete(id: string): Promise<void>;
};

export type IEmployeeChangeRequestRepository = {
  create(input: {
    readonly employeeId: string;
    readonly payload: EssPayload;
  }): Promise<EmployeeChangeRequest>;
  findById(id: string): Promise<EmployeeChangeRequest | null>;
  listByEmployee(employeeId: string): Promise<readonly EmployeeChangeRequest[]>;
  listInbox(status: ChangeRequestStatus): Promise<readonly ChangeRequestInboxItem[]>;
  review(
    id: string,
    input: {
      readonly status: "APPROVED" | "REJECTED";
      readonly reviewerUserId: string;
      readonly reviewNote: string | null;
    },
  ): Promise<EmployeeChangeRequest>;
};
