import { Prisma } from "@prisma/client";
import { RequestHandler } from "express";
import { ZodError, z } from "zod";

import prisma from "../../config/prisma";
import { httpError, HttpError } from "../../common/utils/errors";

const includeEmployeeRelations = {
  department: true,
  jobPosition: true,
} satisfies Prisma.EmployeeInclude;

const moneySchema = z.coerce.number().min(0).optional();

const createEmployeeSchema = z.object({
  prefix: z.string().trim().min(1).max(20),
  employeeNo: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255).optional(),
  phone: z.string().trim().max(20).optional(),
  position: z.string().trim().max(100).optional(),
  departmentId: z.string().uuid().optional(),
  positionId: z.string().uuid().optional(),
  baseSalary: moneySchema,
  mealAllowance: moneySchema,
  allowance: moneySchema,
  lateRatePerMin: moneySchema,
  isActive: z.boolean().optional(),
});

const updateEmployeeSchema = createEmployeeSchema
  .omit({ employeeNo: true })
  .partial()
  .extend({
    employeeNo: z.string().trim().min(1).max(50).optional(),
  });

const listQuerySchema = z.object({
  prefix: z.string().trim().optional(),
  departmentId: z.string().uuid().optional(),
  positionId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  isActive: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function handleZodError(err: unknown): HttpError | unknown {
  if (err instanceof ZodError) {
    return httpError(err.issues.map((issue) => issue.message).join(", "), 400);
  }
  return err;
}

function normalizeNullable(value: string | undefined): string | null | undefined {
  return value === undefined ? undefined : value || null;
}

async function assertDepartmentExists(departmentId?: string): Promise<void> {
  if (!departmentId) {
    return;
  }

  const department = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!department) {
    throw httpError("Department not found", 404);
  }
}

async function assertPositionExists(positionId?: string, departmentId?: string): Promise<void> {
  if (!positionId) {
    return;
  }

  const position = await prisma.position.findUnique({ where: { id: positionId } });
  if (!position) {
    throw httpError("Position not found", 404);
  }

  if (departmentId && position.departmentId && position.departmentId !== departmentId) {
    throw httpError("Position does not belong to the selected department", 400);
  }
}

function toEmployeeCreateInput(data: z.infer<typeof createEmployeeSchema>): Prisma.EmployeeCreateInput {
  return {
    prefix: data.prefix,
    employeeNo: data.employeeNo,
    name: data.name,
    email: normalizeNullable(data.email),
    phone: normalizeNullable(data.phone),
    position: normalizeNullable(data.position),
    baseSalary: data.baseSalary,
    mealAllowance: data.mealAllowance,
    allowance: data.allowance,
    lateRatePerMin: data.lateRatePerMin,
    isActive: data.isActive,
    department: data.departmentId ? { connect: { id: data.departmentId } } : undefined,
    jobPosition: data.positionId ? { connect: { id: data.positionId } } : undefined,
  };
}

function toEmployeeUpdateInput(data: z.infer<typeof updateEmployeeSchema>): Prisma.EmployeeUpdateInput {
  return {
    prefix: data.prefix,
    employeeNo: data.employeeNo,
    name: data.name,
    email: normalizeNullable(data.email),
    phone: normalizeNullable(data.phone),
    position: normalizeNullable(data.position),
    baseSalary: data.baseSalary,
    mealAllowance: data.mealAllowance,
    allowance: data.allowance,
    lateRatePerMin: data.lateRatePerMin,
    isActive: data.isActive,
    department:
      data.departmentId === undefined
        ? undefined
        : data.departmentId
          ? { connect: { id: data.departmentId } }
          : { disconnect: true },
    jobPosition:
      data.positionId === undefined
        ? undefined
        : data.positionId
          ? { connect: { id: data.positionId } }
          : { disconnect: true },
  };
}

export const listEmployees: RequestHandler = async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;

    const where: Prisma.EmployeeWhereInput = {
      ...(query.prefix && { prefix: query.prefix }),
      ...(query.departmentId && { departmentId: query.departmentId }),
      ...(query.positionId && { positionId: query.positionId }),
      ...(query.isActive !== undefined && { isActive: query.isActive === "true" }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { employeeNo: { contains: query.search, mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } },
          { phone: { contains: query.search, mode: "insensitive" } },
          { position: { contains: query.search, mode: "insensitive" } },
          { department: { name: { contains: query.search, mode: "insensitive" } } },
          { jobPosition: { name: { contains: query.search, mode: "insensitive" } } },
        ],
      }),
    };

    const [employees, total] = await prisma.$transaction([
      prisma.employee.findMany({
        where,
        include: includeEmployeeRelations,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.limit,
      }),
      prisma.employee.count({ where }),
    ]);

    res.status(200).json({
      data: employees,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const getEmployee: RequestHandler = async (req, res, next) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: includeEmployeeRelations,
    });

    if (!employee) {
      throw httpError("Employee not found", 404);
    }

    res.status(200).json({ data: employee });
  } catch (err) {
    next(err);
  }
};

export const createEmployee: RequestHandler = async (req, res, next) => {
  try {
    const data = createEmployeeSchema.parse(req.body);

    await assertDepartmentExists(data.departmentId);
    await assertPositionExists(data.positionId, data.departmentId);

    const employee = await prisma.employee.create({
      data: toEmployeeCreateInput(data),
      include: includeEmployeeRelations,
    });

    res.status(201).json({ data: employee });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return next(httpError("Employee number or email is already in use", 409));
    }
    return next(handleZodError(err));
  }
};

export const updateEmployee: RequestHandler = async (req, res, next) => {
  try {
    const data = updateEmployeeSchema.parse(req.body);
    const existing = await prisma.employee.findUnique({ where: { id: req.params.id } });

    if (!existing) {
      throw httpError("Employee not found", 404);
    }

    await assertDepartmentExists(data.departmentId);
    await assertPositionExists(data.positionId, data.departmentId ?? existing.departmentId ?? undefined);

    const employee = await prisma.employee.update({
      where: { id: req.params.id },
      data: toEmployeeUpdateInput(data),
      include: includeEmployeeRelations,
    });

    res.status(200).json({ data: employee });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return next(httpError("Employee number or email is already in use", 409));
    }
    return next(handleZodError(err));
  }
};

export const deleteEmployee: RequestHandler = async (req, res, next) => {
  try {
    const existing = await prisma.employee.findUnique({ where: { id: req.params.id } });

    if (!existing) {
      throw httpError("Employee not found", 404);
    }

    if (!existing.isActive) {
      throw httpError("Employee is already deactivated", 409);
    }

    const employee = await prisma.employee.update({
      where: { id: req.params.id },
      data: { isActive: false },
      include: includeEmployeeRelations,
    });

    res.status(200).json({ data: employee });
  } catch (err) {
    next(err);
  }
};

export const listPrefixes: RequestHandler = async (_req, res, next) => {
  try {
    const prefixes = await prisma.employee.findMany({
      select: { prefix: true },
      distinct: ["prefix"],
      orderBy: { prefix: "asc" },
    });

    res.status(200).json({ data: prefixes.map((prefix) => prefix.prefix) });
  } catch (err) {
    next(err);
  }
};
