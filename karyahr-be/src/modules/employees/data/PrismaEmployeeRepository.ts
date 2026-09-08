import type { Prisma, PrismaClient } from "../../../../prisma/generated/prisma/client";
import type {
  Employee,
  EmployeeChangeRequest,
  EmployeeDocument,
  EmployeeMutation,
  EssPayload,
} from "../domain/entities/Employee";
import type {
  CreateEmployeeInput,
  EmployeeDirectoryFilter,
  EmployeeListFilter,
  EmployeeListResult,
  IEmployeeChangeRequestRepository,
  IEmployeeDocumentRepository,
  IEmployeeMutationRepository,
  IEmployeeRepository,
  UpdateEmployeeInput,
} from "../domain/repositories/IEmployeeRepository";

function toEmployee(row: {
  id: string;
  fullName: string;
  nationalId: string;
  birthDate: Date;
  address: string;
  phone: string;
  emergencyContact: string;
  employeeNumber: string;
  departmentId: string;
  positionId: string;
  managerId: string | null;
  joinedAt: Date;
  status: Employee["status"];
  contractType: Employee["contractType"];
}): Employee {
  return row;
}

function toPayload(value: Prisma.JsonValue): EssPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  return {
    address: typeof record.address === "string" ? record.address : undefined,
    phone: typeof record.phone === "string" ? record.phone : undefined,
    emergencyContact:
      typeof record.emergencyContact === "string" ? record.emergencyContact : undefined,
  };
}

/**
 * Employee persistence with Prisma.
 */
export class PrismaEmployeeRepository implements IEmployeeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateEmployeeInput): Promise<Employee> {
    return toEmployee(await this.prisma.employee.create({ data: input }));
  }

  async update(id: string, input: UpdateEmployeeInput): Promise<Employee> {
    return toEmployee(await this.prisma.employee.update({ where: { id }, data: input }));
  }

  async findById(id: string): Promise<Employee | null> {
    const row = await this.prisma.employee.findUnique({ where: { id } });
    return row ? toEmployee(row) : null;
  }

  async findByNationalId(nationalId: string): Promise<Employee | null> {
    const row = await this.prisma.employee.findUnique({ where: { nationalId } });
    return row ? toEmployee(row) : null;
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    const row = await this.prisma.employee.findUnique({ where: { employeeNumber } });
    return row ? toEmployee(row) : null;
  }

  async list(filter: EmployeeListFilter): Promise<EmployeeListResult> {
    const where: Prisma.EmployeeWhereInput = {
      departmentId: filter.departmentId,
      status: filter.status,
      ...(filter.search
        ? {
            OR: [
              { fullName: { contains: filter.search, mode: "insensitive" } },
              { employeeNumber: { contains: filter.search, mode: "insensitive" } },
              { nationalId: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        skip: filter.pagination.skip,
        take: filter.pagination.take,
        orderBy: { fullName: "asc" },
      }),
    ]);
    return { total, items: rows.map(toEmployee) };
  }

  async listDirectory(filter: EmployeeDirectoryFilter): Promise<readonly Employee[]> {
    const rows = await this.prisma.employee.findMany({
      where: {
        managerId: filter.managerId,
        status: filter.statuses ? { in: [...filter.statuses] } : undefined,
      },
      orderBy: { fullName: "asc" },
    });
    return rows.map(toEmployee);
  }
}

/**
 * Mutation persistence with Prisma.
 */
export class PrismaEmployeeMutationRepository implements IEmployeeMutationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: Omit<EmployeeMutation, "id">): Promise<EmployeeMutation> {
    return this.prisma.employeeMutation.create({ data: input });
  }

  listByEmployee(employeeId: string): Promise<EmployeeMutation[]> {
    return this.prisma.employeeMutation.findMany({
      where: { employeeId },
      orderBy: { effectiveAt: "desc" },
    });
  }
}

/**
 * Document metadata persistence with Prisma.
 */
export class PrismaEmployeeDocumentRepository implements IEmployeeDocumentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    input: Omit<EmployeeDocument, "id"> & { readonly id: string },
  ): Promise<EmployeeDocument> {
    return this.prisma.employeeDocument.create({ data: input });
  }

  findById(id: string): Promise<EmployeeDocument | null> {
    return this.prisma.employeeDocument.findUnique({ where: { id } });
  }

  listByEmployee(employeeId: string): Promise<EmployeeDocument[]> {
    return this.prisma.employeeDocument.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.employeeDocument.delete({ where: { id } });
  }
}

/**
 * ESS change-request persistence with Prisma.
 */
export class PrismaEmployeeChangeRequestRepository implements IEmployeeChangeRequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: {
    readonly employeeId: string;
    readonly payload: EssPayload;
  }): Promise<EmployeeChangeRequest> {
    const row = await this.prisma.employeeChangeRequest.create({
      data: {
        employeeId: input.employeeId,
        payload: input.payload,
      },
    });
    return {
      ...row,
      payload: toPayload(row.payload),
    };
  }

  async findById(id: string): Promise<EmployeeChangeRequest | null> {
    const row = await this.prisma.employeeChangeRequest.findUnique({ where: { id } });
    if (!row) {
      return null;
    }
    return { ...row, payload: toPayload(row.payload) };
  }

  async listByEmployee(employeeId: string): Promise<EmployeeChangeRequest[]> {
    const rows = await this.prisma.employeeChangeRequest.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({ ...row, payload: toPayload(row.payload) }));
  }

  async review(
    id: string,
    input: {
      readonly status: "APPROVED" | "REJECTED";
      readonly reviewerUserId: string;
      readonly reviewNote: string | null;
    },
  ): Promise<EmployeeChangeRequest> {
    const row = await this.prisma.employeeChangeRequest.update({
      where: { id },
      data: {
        status: input.status,
        reviewerUserId: input.reviewerUserId,
        reviewNote: input.reviewNote,
      },
    });
    return { ...row, payload: toPayload(row.payload) };
  }
}
