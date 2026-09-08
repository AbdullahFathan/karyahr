import type { Prisma, PrismaClient } from "../../../../prisma/generated/prisma/client";
import { DEFAULT_STATUTORY_RATES, statutoryRatesToJson } from "../domain/statutory/rates";

const COMPONENTS = [
  { code: "BASIC", name: "Gaji pokok", kind: "BASIC" as const, isTaxable: true },
  { code: "TJABATAN", name: "Tunjangan jabatan", kind: "ALLOWANCE_FIXED" as const, isTaxable: true },
  { code: "TTRANSPORT", name: "Tunjangan transport", kind: "ALLOWANCE_VARIABLE" as const, isTaxable: true },
  { code: "POTONGAN", name: "Potongan lain", kind: "DEDUCTION" as const, isTaxable: false },
];

/**
 * Seeds statutory rates, salary components, and a sample profile for EMP-0001.
 */
export async function seedPayroll(prisma: PrismaClient): Promise<void> {
  await prisma.statutorySetting.upsert({
    where: { key: "default" },
    update: { payload: statutoryRatesToJson(DEFAULT_STATUTORY_RATES) as Prisma.InputJsonValue },
    create: { key: "default", payload: statutoryRatesToJson(DEFAULT_STATUTORY_RATES) as Prisma.InputJsonValue },
  });

  await Promise.all(
    COMPONENTS.map((component) =>
      prisma.salaryComponent.upsert({
        where: { code: component.code },
        update: {
          name: component.name,
          kind: component.kind,
          isTaxable: component.isTaxable,
          isActive: true,
        },
        create: { ...component, isActive: true },
      }),
    ),
  );

  const admin = await prisma.employee.findUnique({ where: { employeeNumber: "EMP-0001" } });
  const basic = await prisma.salaryComponent.findUnique({ where: { code: "BASIC" } });
  const jabatan = await prisma.salaryComponent.findUnique({ where: { code: "TJABATAN" } });
  if (!admin || !basic || !jabatan) {
    return;
  }

  await prisma.employeePayrollProfile.upsert({
    where: { employeeId: admin.id },
    update: {},
    create: {
      employeeId: admin.id,
      ptkpStatus: "TK_0",
      taxMethod: "GROSS",
      npwp: "10.0.0.1-000.000",
      bankName: "BCA",
      bankAccountNumber: "1234567890",
      bankAccountName: "HR Administrator",
      bpjsKesehatanEnrolled: true,
      bpjsTkEnrolled: true,
    },
  });

  const existingBasic = await prisma.employeeSalaryAssignment.findFirst({
    where: { employeeId: admin.id, componentId: basic.id, effectiveTo: null },
  });
  if (!existingBasic) {
    await prisma.employeeSalaryAssignment.create({
      data: {
        employeeId: admin.id,
        componentId: basic.id,
        amountRupiah: 8_000_000n,
        effectiveFrom: new Date("2020-01-01"),
      },
    });
  }
  const existingJabatan = await prisma.employeeSalaryAssignment.findFirst({
    where: { employeeId: admin.id, componentId: jabatan.id, effectiveTo: null },
  });
  if (!existingJabatan) {
    await prisma.employeeSalaryAssignment.create({
      data: {
        employeeId: admin.id,
        componentId: jabatan.id,
        amountRupiah: 1_000_000n,
        effectiveFrom: new Date("2020-01-01"),
      },
    });
  }
}
