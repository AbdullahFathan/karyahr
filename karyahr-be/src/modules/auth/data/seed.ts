import type { PrismaClient } from "../../../../prisma/generated/prisma/client";
import { hashPassword } from "../../../shared/auth/crypto";
import {
  ALL_PERMISSION_KEYS,
  EMPLOYEE_ROLE,
  EMPLOYEE_ROLE_PERMISSIONS,
  HR_ADMIN_ROLE,
} from "../../../shared/auth/permissions";

/**
 * Upserts Phase 1 RBAC catalog, root org units, and the HR admin user+employee.
 */
export async function seedAuth(prisma: PrismaClient): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required to seed");
  }

  await Promise.all(
    ALL_PERMISSION_KEYS.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key },
      }),
    ),
  );

  const permissions = await prisma.permission.findMany();
  const byKey = new Map(permissions.map((item) => [item.key, item.id]));

  const hrAdmin = await prisma.role.upsert({
    where: { name: HR_ADMIN_ROLE },
    update: {},
    create: { name: HR_ADMIN_ROLE, description: "HR administrator" },
  });
  const employeeRole = await prisma.role.upsert({
    where: { name: EMPLOYEE_ROLE },
    update: {},
    create: { name: EMPLOYEE_ROLE, description: "Employee self-service" },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: hrAdmin.id } });
  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({
      roleId: hrAdmin.id,
      permissionId: permission.id,
    })),
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: employeeRole.id } });
  await prisma.rolePermission.createMany({
    data: EMPLOYEE_ROLE_PERMISSIONS.map((key) => {
      const permissionId = byKey.get(key);
      if (!permissionId) {
        throw new Error(`Missing permission ${key}`);
      }
      return { roleId: employeeRole.id, permissionId };
    }),
  });

  const department = await prisma.department.upsert({
    where: { code: "ROOT" },
    update: { name: "Headquarters" },
    create: { name: "Headquarters", code: "ROOT" },
  });
  const position = await prisma.position.upsert({
    where: { code: "HR-ADMIN" },
    update: { name: "HR Administrator", departmentId: department.id },
    create: {
      name: "HR Administrator",
      code: "HR-ADMIN",
      departmentId: department.id,
    },
  });

  const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existingUser) {
    return;
  }

  const employee = await prisma.employee.create({
    data: {
      fullName: "HR Administrator",
      nationalId: "0000000000000001",
      birthDate: new Date("1990-01-01"),
      address: "Jakarta",
      phone: "0800000000",
      emergencyContact: "0800000001",
      employeeNumber: "EMP-0001",
      departmentId: department.id,
      positionId: position.id,
      joinedAt: new Date("2020-01-01"),
      status: "ACTIVE",
      contractType: "PERMANENT",
    },
  });

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      employeeId: employee.id,
      isActive: true,
    },
  });

  await prisma.userRole.create({
    data: { userId: user.id, roleId: hrAdmin.id },
  });
}
