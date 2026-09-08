import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import type { SalaryComponent } from "../entities/Payroll";
import type { ISalaryComponentRepository } from "../repositories/IPayrollRepository";

/**
 * Creates a salary component catalog entry.
 */
export class CreateSalaryComponentUseCase {
  constructor(
    private readonly components: ISalaryComponentRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(input: Omit<SalaryComponent, "id">, actorUserId: string): Promise<SalaryComponent> {
    const existing = await this.components.findByCode(input.code);
    if (existing) {
      throw new ConflictError("Salary component code already exists");
    }
    if (input.kind === "BASIC" && !input.isTaxable) {
      throw new ValidationError("BASIC component must be taxable");
    }
    const item = await this.components.create(input);
    await this.audit.append({
      actorUserId,
      entityType: "SalaryComponent",
      entityId: item.id,
      action: "create",
    });
    return item;
  }
}

/**
 * Updates a salary component catalog entry.
 */
export class UpdateSalaryComponentUseCase {
  constructor(
    private readonly components: ISalaryComponentRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(
    id: string,
    input: Partial<Omit<SalaryComponent, "id" | "code">> & { readonly code?: string },
    actorUserId: string,
  ): Promise<SalaryComponent> {
    const current = await this.components.findById(id);
    if (!current) {
      throw new NotFoundError("Salary component not found");
    }
    if (input.code && input.code !== current.code) {
      const existing = await this.components.findByCode(input.code);
      if (existing) {
        throw new ConflictError("Salary component code already exists");
      }
    }
    const updated = await this.components.update(id, input);
    await this.audit.append({
      actorUserId,
      entityType: "SalaryComponent",
      entityId: id,
      action: "update",
    });
    return updated;
  }
}

/**
 * Lists salary components.
 */
export class ListSalaryComponentsUseCase {
  constructor(private readonly components: ISalaryComponentRepository) {}

  execute(): Promise<readonly SalaryComponent[]> {
    return this.components.list();
  }
}
