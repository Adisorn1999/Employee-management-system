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
  { id: "permission_shift_change", name: "shift.change", description: "Change employee shift schedules" },
  { id: "permission_shift_delete", name: "shift.delete", description: "Deactivate shifts" },
  { id: "permission_shift_swap", name: "shift.swap", description: "Swap employee shift schedules" },
  { id: "permission_attendance_read", name: "attendance.read", description: "Read attendance records" },
  { id: "permission_attendance_create", name: "attendance.create", description: "Check employees in" },
  { id: "permission_attendance_update", name: "attendance.update", description: "Check employees out and update attendance" },
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
    "shift.change",
    "shift.delete",
    "shift.swap",
    "attendance.read",
    "attendance.create",
    "attendance.update",
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

const departments = [
  { name: "IT", description: "Information technology" },
  { name: "HR", description: "Human resources" },
  { name: "Operations", description: "Daily operations" },
];

const positions = [
  { name: "Developer", departmentName: "IT", description: "Software development" },
  { name: "HR Officer", departmentName: "HR", description: "HR administration" },
  { name: "Shift Manager", departmentName: "Operations", description: "Shift planning and supervision" },
  { name: "Staff", departmentName: "Operations", description: "Operations staff" },
];

function seedDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

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

  const superAdminUser = await prisma.user.upsert({
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

  const departmentByName = new Map<string, { id: string }>();
  for (const department of departments) {
    const record = await prisma.department.upsert({
      where: { name: department.name },
      update: {
        description: department.description,
        isActive: true,
      },
      create: department,
      select: { id: true },
    });
    departmentByName.set(department.name, record);
  }

  const positionByName = new Map<string, { id: string }>();
  for (const position of positions) {
    const department = departmentByName.get(position.departmentName);

    if (!department) {
      throw new Error(`Missing seeded department: ${position.departmentName}`);
    }

    const record = await prisma.position.upsert({
      where: {
        name_departmentId: {
          name: position.name,
          departmentId: department.id,
        },
      },
      update: {
        description: position.description,
        isActive: true,
      },
      create: {
        name: position.name,
        description: position.description,
        departmentId: department.id,
      },
      select: { id: true },
    });
    positionByName.set(position.name, record);
  }

  const seededEmployees = [
    {
      prefix: "EMP",
      employeeNo: "EMP-001",
      name: "Aung Min",
      email: "aung.min@example.com",
      phone: "09111111111",
      position: "Developer",
      departmentName: "IT",
      positionName: "Developer",
    },
    {
      prefix: "EMP",
      employeeNo: "EMP-002",
      name: "Hnin Yu",
      email: "hnin.yu@example.com",
      phone: "09222222222",
      position: "HR Officer",
      departmentName: "HR",
      positionName: "HR Officer",
    },
    {
      prefix: "EMP",
      employeeNo: "EMP-003",
      name: "Ko Thet",
      email: "ko.thet@example.com",
      phone: "09333333333",
      position: "Shift Manager",
      departmentName: "Operations",
      positionName: "Shift Manager",
    },
  ];

  const employeeByNo = new Map<string, { id: string }>();
  for (const employee of seededEmployees) {
    const department = departmentByName.get(employee.departmentName);
    const position = positionByName.get(employee.positionName);

    if (!department || !position) {
      throw new Error(`Missing seeded department or position for employee: ${employee.employeeNo}`);
    }

    const record = await prisma.employee.upsert({
      where: { employeeNo: employee.employeeNo },
      update: {
        prefix: employee.prefix,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        position: employee.position,
        departmentId: department.id,
        positionId: position.id,
        isActive: true,
      },
      create: {
        prefix: employee.prefix,
        employeeNo: employee.employeeNo,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        position: employee.position,
        departmentId: department.id,
        positionId: position.id,
        isActive: true,
      },
      select: { id: true },
    });
    employeeByNo.set(employee.employeeNo, record);
  }

  const dayShift = await prisma.shift.upsert({
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

  const nightShift = await prisma.shift.upsert({
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

  const schedules = [
    { employeeNo: "EMP-001", shiftId: dayShift.id, workDate: seedDate("2026-05-20"), note: "Default day shift" },
    { employeeNo: "EMP-002", shiftId: nightShift.id, workDate: seedDate("2026-05-20"), note: "Default night shift" },
    { employeeNo: "EMP-003", shiftId: dayShift.id, workDate: seedDate("2026-05-21"), note: "Default manager coverage" },
  ];

  for (const schedule of schedules) {
    const employee = employeeByNo.get(schedule.employeeNo);

    if (!employee) {
      throw new Error(`Missing seeded employee: ${schedule.employeeNo}`);
    }

    await prisma.shiftSchedule.upsert({
      where: {
        employeeId_workDate: {
          employeeId: employee.id,
          workDate: schedule.workDate,
        },
      },
      update: {
        shiftId: schedule.shiftId,
        assignedBy: superAdminUser.id,
        note: schedule.note,
      },
      create: {
        employeeId: employee.id,
        shiftId: schedule.shiftId,
        workDate: schedule.workDate,
        assignedBy: superAdminUser.id,
        note: schedule.note,
      },
    });
  }

  console.log("Seeded RBAC, super admin, departments, positions, employees, shifts, and schedules.");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
