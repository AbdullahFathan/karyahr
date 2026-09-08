import type { PrismaClient } from "../../../../prisma/generated/prisma/client";
import type { MeEmployee } from "../domain/entities/AuthUser";
import type { IMeEmployeeReader } from "../domain/usecases/GetMe.usecase";

/**
 * Reads employee summary fields for GET /auth/me.
 */
export class PrismaMeEmployeeReader implements IMeEmployeeReader {
  constructor(private readonly prisma: PrismaClient) {}

  async getSummary(employeeId: string): Promise<MeEmployee | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) {
      return null;
    }
    return {
      id: employee.id,
      fullName: employee.fullName,
      employeeNumber: employee.employeeNumber,
      status: employee.status,
    };
  }
}
