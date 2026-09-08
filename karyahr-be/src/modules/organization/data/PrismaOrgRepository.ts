import type { PrismaClient } from "../../../../prisma/generated/prisma/client";
import type { Department, OrgTreeEmployee, Position } from "../domain/entities/Org";
import type {
  IDepartmentRepository,
  IOrgTreeReader,
  IPositionRepository,
} from "../domain/repositories/IOrgRepository";

/**
 * Department persistence with Prisma.
 */
export class PrismaDepartmentRepository implements IDepartmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<readonly Department[]> {
    return this.prisma.department.findMany({ orderBy: { name: "asc" } });
  }

  findById(id: string): Promise<Department | null> {
    return this.prisma.department.findUnique({ where: { id } });
  }

  findByCode(code: string): Promise<Department | null> {
    return this.prisma.department.findUnique({ where: { code } });
  }

  create(input: {
    readonly name: string;
    readonly code: string;
    readonly parentId: string | null;
  }): Promise<Department> {
    return this.prisma.department.create({ data: input });
  }

  update(
    id: string,
    input: {
      readonly name?: string;
      readonly code?: string;
      readonly parentId?: string | null;
      readonly isActive?: boolean;
    },
  ): Promise<Department> {
    return this.prisma.department.update({ where: { id }, data: input });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.department.delete({ where: { id } });
  }

  childCount(id: string): Promise<number> {
    return this.prisma.department.count({ where: { parentId: id } });
  }

  employeeCount(id: string): Promise<number> {
    return this.prisma.employee.count({ where: { departmentId: id } });
  }

  async parentMap(): Promise<ReadonlyMap<string, string | null>> {
    const rows = await this.prisma.department.findMany({
      select: { id: true, parentId: true },
    });
    return new Map(rows.map((row) => [row.id, row.parentId]));
  }
}

/**
 * Position persistence with Prisma.
 */
export class PrismaPositionRepository implements IPositionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<readonly Position[]> {
    return this.prisma.position.findMany({ orderBy: { name: "asc" } });
  }

  findById(id: string): Promise<Position | null> {
    return this.prisma.position.findUnique({ where: { id } });
  }

  findByCode(code: string): Promise<Position | null> {
    return this.prisma.position.findUnique({ where: { code } });
  }

  create(input: {
    readonly name: string;
    readonly code: string;
    readonly parentId: string | null;
    readonly departmentId: string | null;
  }): Promise<Position> {
    return this.prisma.position.create({ data: input });
  }

  update(
    id: string,
    input: {
      readonly name?: string;
      readonly code?: string;
      readonly parentId?: string | null;
      readonly departmentId?: string | null;
      readonly isActive?: boolean;
    },
  ): Promise<Position> {
    return this.prisma.position.update({ where: { id }, data: input });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.position.delete({ where: { id } });
  }

  childCount(id: string): Promise<number> {
    return this.prisma.position.count({ where: { parentId: id } });
  }

  employeeCount(id: string): Promise<number> {
    return this.prisma.employee.count({ where: { positionId: id } });
  }

  async parentMap(): Promise<ReadonlyMap<string, string | null>> {
    const rows = await this.prisma.position.findMany({
      select: { id: true, parentId: true },
    });
    return new Map(rows.map((row) => [row.id, row.parentId]));
  }
}

/**
 * Employee rows for the org tree.
 */
export class PrismaOrgTreeReader implements IOrgTreeReader {
  constructor(private readonly prisma: PrismaClient) {}

  async listEmployeesForTree(): Promise<readonly OrgTreeEmployee[]> {
    const rows = await this.prisma.employee.findMany({
      include: { position: true },
      orderBy: { fullName: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      fullName: row.fullName,
      departmentId: row.departmentId,
      positionId: row.positionId,
      positionName: row.position.name,
    }));
  }
}
