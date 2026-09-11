import { hashPassword } from "../../src/shared/auth/crypto";
import { EMPLOYEE_ROLE } from "../../src/shared/auth/permissions";
import { getPrisma } from "../../src/shared/database/prisma";
import type { CookieClient } from "./http";

export type OrgSlice = {
  readonly departmentId: string;
  readonly positionId: string;
  readonly otherDepartmentId: string;
  readonly otherPositionId: string;
};

export type CreatedEmployee = {
  readonly id: string;
  readonly fullName: string;
  readonly employeeNumber: string;
  readonly departmentId: string;
  readonly positionId: string;
  readonly status: string;
  readonly address: string;
  readonly phone: string;
  readonly emergencyContact: string;
};

export type StaffAccount = {
  readonly employee: CreatedEmployee;
  readonly email: string;
  readonly password: string;
};

const FIXTURE_PASSWORD = "E2ePassw0rd!";

/**
 * Unique suffix for emails, NIK, and employee numbers in this process.
 */
export function uniqueSuffix(): string {
  return `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Loads seeded HQ org units and creates a transfer target department/position.
 */
export async function loadOrgSlice(): Promise<OrgSlice> {
  const prisma = getPrisma();
  const department = await prisma.department.findUnique({ where: { code: "ROOT" } });
  const position = await prisma.position.findUnique({ where: { code: "HR-ADMIN" } });
  if (!department || !position) {
    throw new Error("Seed org is missing ROOT / HR-ADMIN. Run prisma seed.");
  }
  const suffix = uniqueSuffix();
  const otherDepartment = await prisma.department.create({
    data: { name: "E2E Operations", code: `E2E-OPS-${suffix}` },
  });
  const otherPosition = await prisma.position.create({
    data: {
      name: "E2E Staff",
      code: `E2E-STF-${suffix}`,
      departmentId: otherDepartment.id,
    },
  });
  return {
    departmentId: department.id,
    positionId: position.id,
    otherDepartmentId: otherDepartment.id,
    otherPositionId: otherPosition.id,
  };
}

/**
 * Creates an employee via the HTTP API as an authenticated HR admin.
 */
export async function createEmployeeViaApi(
  admin: CookieClient,
  org: OrgSlice,
  overrides: Partial<{
    fullName: string;
    status: "ACTIVE" | "PROBATION" | "INACTIVE";
  }> = {},
): Promise<CreatedEmployee> {
  const suffix = uniqueSuffix();
  const response = await admin.request("/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: overrides.fullName ?? `E2E Employee ${suffix}`,
      nationalId: nikFromSuffix(suffix),
      birthDate: "1992-03-15",
      address: "Jl. E2E 1",
      phone: "0811111111",
      emergencyContact: "0822222222",
      employeeNumber: `E2E-${suffix}`,
      departmentId: org.departmentId,
      positionId: org.positionId,
      joinedAt: "2024-01-15",
      status: overrides.status ?? "ACTIVE",
      contractType: "PERMANENT",
    }),
  });
  if (response.status !== 201) {
    throw new Error(`Create employee failed (${response.status}): ${await response.text()}`);
  }
  return (await response.json()) as CreatedEmployee;
}

/**
 * Attaches an ESS login (employee role) to an existing employee.
 */
export async function attachEmployeeUser(employeeId: string): Promise<{
  readonly email: string;
  readonly password: string;
}> {
  const prisma = getPrisma();
  const role = await prisma.role.findUnique({ where: { name: EMPLOYEE_ROLE } });
  if (!role) {
    throw new Error("Seeded employee role is missing");
  }
  const suffix = uniqueSuffix();
  const email = `e2e.${suffix}@example.test`;
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(FIXTURE_PASSWORD),
      employeeId,
      isActive: true,
    },
  });
  await prisma.userRole.create({
    data: { userId: user.id, roleId: role.id },
  });
  return { email, password: FIXTURE_PASSWORD };
}

/**
 * Creates an employee and an ESS user in one step.
 */
export async function createStaffAccount(
  admin: CookieClient,
  org: OrgSlice,
): Promise<StaffAccount> {
  const employee = await createEmployeeViaApi(admin, org);
  const account = await attachEmployeeUser(employee.id);
  return { employee, email: account.email, password: account.password };
}

let nikSerial = 0;

function nikFromSuffix(suffix: string): string {
  nikSerial += 1;
  const digits = `${Date.now()}${nikSerial}${suffix}`.replace(/\D/g, "");
  return digits.padStart(16, "8").slice(0, 16);
}
