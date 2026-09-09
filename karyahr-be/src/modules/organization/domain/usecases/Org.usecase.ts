import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import { wouldCreateCycle } from "../cycle";
import type { Department, OrgTreeNode, Position } from "../entities/Org";
import type {
  IDepartmentRepository,
  IOrgTreeReader,
  IPositionRepository,
} from "../repositories/IOrgRepository";

/**
 * Creates a department.
 */
export class CreateDepartmentUseCase {
  constructor(private readonly departments: IDepartmentRepository) {}

  async execute(input: {
    readonly name: string;
    readonly code: string;
    readonly parentId: string | null;
  }): Promise<Department> {
    const taken = await this.departments.findByCode(input.code);
    if (taken) {
      throw new ConflictError("Department code already exists");
    }
    if (input.parentId) {
      const parent = await this.departments.findById(input.parentId);
      if (!parent) {
        throw new NotFoundError("Parent department not found");
      }
    }
    return this.departments.create(input);
  }
}

/**
 * Updates a department and rejects parent cycles.
 */
export class UpdateDepartmentUseCase {
  constructor(private readonly departments: IDepartmentRepository) {}

  async execute(
    id: string,
    input: {
      readonly name?: string;
      readonly code?: string;
      readonly parentId?: string | null;
      readonly isActive?: boolean;
    },
  ): Promise<Department> {
    const current = await this.departments.findById(id);
    if (!current) {
      throw new NotFoundError("Department not found");
    }
    if (input.code && input.code !== current.code) {
      const taken = await this.departments.findByCode(input.code);
      if (taken) {
        throw new ConflictError("Department code already exists");
      }
    }
    if (input.parentId !== undefined) {
      if (input.parentId) {
        const parent = await this.departments.findById(input.parentId);
        if (!parent) {
          throw new NotFoundError("Parent department not found");
        }
      }
      const parentMap = await this.departments.parentMap();
      if (wouldCreateCycle(id, input.parentId, parentMap)) {
        throw new ValidationError("Department parent would create a cycle");
      }
    }
    return this.departments.update(id, input);
  }
}

/**
 * Lists departments.
 */
export class ListDepartmentsUseCase {
  constructor(private readonly departments: IDepartmentRepository) {}

  execute(): Promise<readonly Department[]> {
    return this.departments.list();
  }
}

/**
 * Deletes a department without children or employees.
 */
export class DeleteDepartmentUseCase {
  constructor(private readonly departments: IDepartmentRepository) {}

  async execute(id: string): Promise<void> {
    const current = await this.departments.findById(id);
    if (!current) {
      throw new NotFoundError("Department not found");
    }
    if ((await this.departments.childCount(id)) > 0) {
      throw new ValidationError("Department has child departments");
    }
    if ((await this.departments.employeeCount(id)) > 0) {
      throw new ValidationError("Department still has employees");
    }
    await this.departments.delete(id);
  }
}

/**
 * Creates a position.
 */
export class CreatePositionUseCase {
  constructor(
    private readonly positions: IPositionRepository,
    private readonly departments: IDepartmentRepository,
  ) {}

  async execute(input: {
    readonly name: string;
    readonly code: string;
    readonly parentId: string | null;
    readonly departmentId: string | null;
  }): Promise<Position> {
    const taken = await this.positions.findByCode(input.code);
    if (taken) {
      throw new ConflictError("Position code already exists");
    }
    if (input.parentId) {
      const parent = await this.positions.findById(input.parentId);
      if (!parent) {
        throw new NotFoundError("Parent position not found");
      }
    }
    if (input.departmentId) {
      const department = await this.departments.findById(input.departmentId);
      if (!department) {
        throw new NotFoundError("Department not found");
      }
    }
    return this.positions.create(input);
  }
}

/**
 * Updates a position and rejects parent cycles.
 */
export class UpdatePositionUseCase {
  constructor(
    private readonly positions: IPositionRepository,
    private readonly departments: IDepartmentRepository,
  ) {}

  async execute(
    id: string,
    input: {
      readonly name?: string;
      readonly code?: string;
      readonly parentId?: string | null;
      readonly departmentId?: string | null;
      readonly isActive?: boolean;
    },
  ): Promise<Position> {
    const current = await this.positions.findById(id);
    if (!current) {
      throw new NotFoundError("Position not found");
    }
    if (input.code && input.code !== current.code) {
      const taken = await this.positions.findByCode(input.code);
      if (taken) {
        throw new ConflictError("Position code already exists");
      }
    }
    if (input.parentId !== undefined && input.parentId) {
      const parent = await this.positions.findById(input.parentId);
      if (!parent) {
        throw new NotFoundError("Parent position not found");
      }
    }
    if (input.departmentId) {
      const department = await this.departments.findById(input.departmentId);
      if (!department) {
        throw new NotFoundError("Department not found");
      }
    }
    if (input.parentId !== undefined) {
      const parentMap = await this.positions.parentMap();
      if (wouldCreateCycle(id, input.parentId, parentMap)) {
        throw new ValidationError("Position parent would create a cycle");
      }
    }
    return this.positions.update(id, input);
  }
}

/**
 * Lists positions.
 */
export class ListPositionsUseCase {
  constructor(private readonly positions: IPositionRepository) {}

  execute(): Promise<readonly Position[]> {
    return this.positions.list();
  }
}

/**
 * Deletes a position without children or employees.
 */
export class DeletePositionUseCase {
  constructor(private readonly positions: IPositionRepository) {}

  async execute(id: string): Promise<void> {
    const current = await this.positions.findById(id);
    if (!current) {
      throw new NotFoundError("Position not found");
    }
    if ((await this.positions.childCount(id)) > 0) {
      throw new ValidationError("Position has child positions");
    }
    if ((await this.positions.employeeCount(id)) > 0) {
      throw new ValidationError("Position still has employees");
    }
    await this.positions.delete(id);
  }
}

/**
 * Builds a nested organization tree.
 */
export class GetOrgTreeUseCase {
  constructor(
    private readonly departments: IDepartmentRepository,
    private readonly positions: IPositionRepository,
    private readonly employees: IOrgTreeReader,
  ) {}

  async execute(departmentId?: string): Promise<readonly OrgTreeNode[]> {
    const [departments, positions] = await Promise.all([
      this.departments.list(),
      this.positions.list(),
    ]);
    const byParent = new Map<string | null, Department[]>();
    for (const department of departments) {
      const siblings = byParent.get(department.parentId) ?? [];
      siblings.push(department);
      byParent.set(department.parentId, siblings);
    }

    const collectDescendantIds = (rootId: string): string[] => {
      const ids = [rootId];
      const children = byParent.get(rootId) ?? [];
      for (const child of children) {
        ids.push(...collectDescendantIds(child.id));
      }
      return ids;
    };

    const scopedDepartmentIds = departmentId ? collectDescendantIds(departmentId) : null;
    const employeeRows = departmentId
      ? await this.employees.listEmployeesForTree(scopedDepartmentIds ?? [])
      : [];

    const build = (parentId: string | null): OrgTreeNode[] => {
      const nodes = byParent.get(parentId) ?? [];
      return nodes
        .filter((department) => !scopedDepartmentIds || scopedDepartmentIds.includes(department.id))
        .map((department) => {
          const deptPositions = positions.filter((position) => position.departmentId === department.id);
          const deptEmployees = employeeRows.filter(
            (employee) => employee.departmentId === department.id,
          );
          return {
            id: department.id,
            name: department.name,
            code: department.code,
            isActive: department.isActive,
            positions: deptPositions.map((position) => ({
              id: position.id,
              name: position.name,
              code: position.code,
            })),
            employees: deptEmployees,
            children: build(department.id),
          };
        });
    };

    if (departmentId) {
      const root = departments.find((item) => item.id === departmentId);
      if (!root) {
        return [];
      }
      const deptPositions = positions.filter((position) => position.departmentId === root.id);
      const deptEmployees = employeeRows.filter((employee) => employee.departmentId === root.id);
      return [
        {
          id: root.id,
          name: root.name,
          code: root.code,
          isActive: root.isActive,
          positions: deptPositions.map((position) => ({
            id: position.id,
            name: position.name,
            code: position.code,
          })),
          employees: deptEmployees,
          children: build(root.id),
        },
      ];
    }

    return build(null);
  }
}
