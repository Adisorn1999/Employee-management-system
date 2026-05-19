import prisma from "../src/config/prisma";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";

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
    "profile.read",
    "profile.update",
  ],
  hr: ["users.read", "profile.read", "profile.update"],
  manager: ["users.read", "profile.read", "profile.update"],
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
    await prisma.$executeRaw`
      INSERT INTO "roles" ("id", "name", "description", "created_at", "updated_at")
      VALUES (${role.id}, ${role.name}, ${role.description}, NOW(), NOW())
      ON CONFLICT ("name") DO UPDATE
      SET "description" = EXCLUDED."description",
          "updated_at" = NOW()
    `;
  }

  for (const permission of permissions) {
    await prisma.$executeRaw`
      INSERT INTO "permissions" ("id", "name", "description", "created_at", "updated_at")
      VALUES (${permission.id}, ${permission.name}, ${permission.description}, NOW(), NOW())
      ON CONFLICT ("name") DO UPDATE
      SET "description" = EXCLUDED."description",
          "updated_at" = NOW()
    `;
  }

  for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
    for (const permissionName of permissionNames) {
      await prisma.$executeRaw`
        INSERT INTO "role_permissions" ("role_id", "permission_id", "created_at")
        SELECT "roles"."id", "permissions"."id", NOW()
        FROM "roles", "permissions"
        WHERE "roles"."name" = ${roleName}
          AND "permissions"."name" = ${permissionName}
        ON CONFLICT ("role_id", "permission_id") DO NOTHING
      `;
    }
  }

  const passwordHash = await bcrypt.hash(superAdmin.password, 12);
  const superAdminRole = roles.find((role) => role.name === "super_admin");

  if (!superAdminRole) {
    throw new Error("super_admin role is missing from seed data");
  }

  await prisma.$executeRaw`
    INSERT INTO "User" ("id", "username", "passwordHash", "name", "role", "role_id", "createdAt", "updatedAt")
    VALUES (
      ${randomUUID()},
      ${superAdmin.username},
      ${passwordHash},
      ${superAdmin.name},
      'ADMIN',
      ${superAdminRole.id},
      NOW(),
      NOW()
    )
    ON CONFLICT ("username") DO UPDATE
    SET "passwordHash" = EXCLUDED."passwordHash",
        "name" = EXCLUDED."name",
        "role" = EXCLUDED."role",
        "role_id" = EXCLUDED."role_id",
        "updatedAt" = NOW()
  `;

  console.log("Seeded auth foundation: roles, permissions, role permissions, and super admin.");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
