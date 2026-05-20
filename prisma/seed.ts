import prisma from "../src/config/prisma";
import bcrypt from "bcrypt";

const roles = [
  { id: "role_super_admin", name: "super_admin", description: "Full system access" },
  { id: "role_admin", name: "admin", description: "Administrative access" },
  { id: "role_hr", name: "hr", description: "Human resources access" },
  { id: "role_manager", name: "manager", description: "Team management access" },
  { id: "role_employee", name: "employee", description: "Employee self-service access" },
];

const permissions = [
  { id: "permission_auth_manage", name: "auth.manage", description: "Manage authentication settings" },
  { id: "permission_users_read", name: "users.read", description: "Read users" },
  { id: "permission_users_manage", name: "users.manage", description: "Create, update, and deactivate users" },
  { id: "permission_roles_read", name: "roles.read", description: "Read roles and permissions" },
  { id: "permission_roles_manage", name: "roles.manage", description: "Manage roles and permissions" },
  { id: "permission_audit_read", name: "audit.read", description: "Read audit logs" },
  { id: "permission_employee_read", name: "employee.read", description: "Read employee records" },
  { id: "permission_employee_create", name: "employee.create", description: "Create employee records" },
  { id: "permission_employee_update", name: "employee.update", description: "Update employee records" },
  { id: "permission_employee_delete", name: "employee.delete", description: "Deactivate employee records" },
  { id: "permission_shift_read", name: "shift.read", description: "Read shifts and schedules" },
  { id: "permission_shift_create", name: "shift.create", description: "Create shifts and schedules" },
  { id: "permission_shift_update", name: "shift.update", description: "Update shifts, schedules, and swaps" },
  { id: "permission_shift_delete", name: "shift.delete", description: "Deactivate shifts" },
  { id: "permission_profile_read", name: "profile.read", description: "Read own profile" },
  { id: "permission_profile_update", name: "profile.update", description: "Update own profile" },
];

const rolePermissions: Record<string, string[]> = {
  super_admin: permissions.map((permission) => permission.name),
  admin: [
    "users.read",
    "users.manage",
    "roles.read",
    "audit.read",
    "employee.read",
    "employee.create",
    "employee.update",
    "employee.delete",
    "shift.read",
    "shift.create",
    "shift.update",
    "shift.delete",
    "profile.read",
    "profile.update",
  ],
  hr: [
    "users.read",
    "employee.read",
    "employee.create",
    "employee.update",
    "employee.delete",
    "shift.read",
    "shift.create",
    "shift.update",
    "shift.delete",
    "profile.read",
    "profile.update",
  ],
  manager: ["users.read", "employee.read", "shift.read", "profile.read", "profile.update"],
  employee: ["profile.read", "profile.update"],
};

const superAdmin = {
  username: process.env.SUPER_ADMIN_USERNAME || "super_admin",
  password: process.env.SUPER_ADMIN_PASSWORD || "ChangeMe123!",
  name: process.env.SUPER_ADMIN_NAME || "Super Admin",
};

async function main() {
  await prisma.$connect();

  for (const role of roles) {
    await prisma.rbacRole.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: { description: permission.description },
      create: permission,
    });
  }

  for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
    const role = await prisma.rbacRole.findUniqueOrThrow({
      where: { name: roleName },
      select: { id: true },
    });

    for (const permissionName of permissionNames) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { name: permissionName },
        select: { id: true },
      });

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  const passwordHash = await bcrypt.hash(superAdmin.password, 12);
  const superAdminRole = roles.find((role) => role.name === "super_admin");

  if (!superAdminRole) {
    throw new Error("super_admin role is missing from seed data");
  }

  await prisma.user.upsert({
    where: { username: superAdmin.username },
    update: {
      passwordHash,
      name: superAdmin.name,
      role: "ADMIN",
      authRoleId: superAdminRole.id,
    },
    create: {
      username: superAdmin.username,
      passwordHash,
      name: superAdmin.name,
      role: "ADMIN",
      authRoleId: superAdminRole.id,
    },
  });

  await prisma.shift.upsert({
    where: { code: "DAY" },
    update: {
      name: "Day Shift",
      startTime: "08:00",
      endTime: "20:00",
      color: "#2563eb",
      isActive: true,
    },
    create: {
      code: "DAY",
      name: "Day Shift",
      startTime: "08:00",
      endTime: "20:00",
      color: "#2563eb",
    },
  });

  await prisma.shift.upsert({
    where: { code: "NIGHT" },
    update: {
      name: "Night Shift",
      startTime: "20:00",
      endTime: "08:00",
      color: "#7c3aed",
      isActive: true,
    },
    create: {
      code: "NIGHT",
      name: "Night Shift",
      startTime: "20:00",
      endTime: "08:00",
      color: "#7c3aed",
    },
  });

  console.log("Seeded auth foundation, shift permissions, super admin, and default shifts.");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
