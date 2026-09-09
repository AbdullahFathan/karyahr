import { describe, expect, test } from "bun:test";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { SalaryComponent } from "../entities/Payroll";
import type { ISalaryComponentRepository } from "../repositories/IPayrollRepository";
import {
  CreateSalaryComponentUseCase,
  ListSalaryComponentsUseCase,
  UpdateSalaryComponentUseCase,
} from "./SalaryComponent.usecase";

class MemoryComponents implements ISalaryComponentRepository {
  constructor(private rows: SalaryComponent[] = []) {}
  async create(input: Omit<SalaryComponent, "id">): Promise<SalaryComponent> {
    const item: SalaryComponent = { id: `c${this.rows.length + 1}`, ...input };
    this.rows.push(item);
    return item;
  }
  async update(id: string, input: Partial<Omit<SalaryComponent, "id">>): Promise<SalaryComponent> {
    this.rows = this.rows.map((row) => (row.id === id ? { ...row, ...input } : row));
    return this.rows.find((row) => row.id === id)!;
  }
  async findById(id: string): Promise<SalaryComponent | null> {
    return this.rows.find((row) => row.id === id) ?? null;
  }
  async findByCode(code: string): Promise<SalaryComponent | null> {
    return this.rows.find((row) => row.code === code) ?? null;
  }
  async list(): Promise<readonly SalaryComponent[]> {
    return this.rows;
  }
}

const audit: IAuditLogRepository = { append: async () => undefined };

describe("SalaryComponent", () => {
  test("creates taxable BASIC components", async () => {
    const components = new MemoryComponents();
    const created = await new CreateSalaryComponentUseCase(components, audit).execute(
      { code: "BASIC", name: "Pokok", kind: "BASIC", isTaxable: true, isActive: true },
      "u1",
    );
    expect(created.code).toBe("BASIC");
    await expect(
      new CreateSalaryComponentUseCase(components, audit).execute(
        { code: "BASIC", name: "x", kind: "BASIC", isTaxable: true, isActive: true },
        "u1",
      ),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      new CreateSalaryComponentUseCase(components, audit).execute(
        { code: "NET", name: "x", kind: "BASIC", isTaxable: false, isActive: true },
        "u1",
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(await new ListSalaryComponentsUseCase(components).execute()).toHaveLength(1);
  });

  test("updates a component and rejects missing or taken codes", async () => {
    const components = new MemoryComponents();
    const first = await new CreateSalaryComponentUseCase(components, audit).execute(
      { code: "A", name: "A", kind: "ALLOWANCE_FIXED", isTaxable: true, isActive: true },
      "u1",
    );
    await new CreateSalaryComponentUseCase(components, audit).execute(
      { code: "B", name: "B", kind: "DEDUCTION", isTaxable: false, isActive: true },
      "u1",
    );
    const updated = await new UpdateSalaryComponentUseCase(components, audit).execute(
      first.id,
      { name: "Allowance" },
      "u1",
    );
    expect(updated.name).toBe("Allowance");
    await expect(
      new UpdateSalaryComponentUseCase(components, audit).execute(first.id, { code: "B" }, "u1"),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      new UpdateSalaryComponentUseCase(components, audit).execute("missing", { name: "x" }, "u1"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
