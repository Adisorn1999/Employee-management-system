import { Prisma } from "@prisma/client";
import { RequestHandler } from "express";
import { ZodError, z } from "zod";

import { httpError, HttpError } from "../../common/utils/errors";
import prisma from "../../config/prisma";

const departmentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});

const updateDepartmentSchema = departmentSchema.partial();

const listDepartmentQuerySchema = z.object({
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

function departmentInclude(): Prisma.DepartmentInclude {
  return {
    _count: {
      select: {
        employees: true,
        positions: true,
      },
    },
  };
}

export const listDepartments: RequestHandler = async (req, res, next) => {
  try {
    const query = listDepartmentQuerySchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;
    const where: Prisma.DepartmentWhereInput = {
      ...(query.isActive !== undefined && { isActive: query.isActive === "true" }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { description: { contains: query.search, mode: "insensitive" } },
        ],
      }),
    };

    const [departments, total] = await prisma.$transaction([
      prisma.department.findMany({
        where,
        include: departmentInclude(),
        orderBy: { name: "asc" },
        skip,
        take: query.limit,
      }),
      prisma.department.count({ where }),
    ]);

    res.status(200).json({
      data: departments,
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

export const getDepartment: RequestHandler = async (req, res, next) => {
  try {
    const department = await prisma.department.findUnique({
      where: { id: req.params.id },
      include: departmentInclude(),
    });

    if (!department) {
      throw httpError("Department not found", 404);
    }

    res.status(200).json({ data: department });
  } catch (err) {
    next(err);
  }
};

export const createDepartment: RequestHandler = async (req, res, next) => {
  try {
    const data = departmentSchema.parse(req.body);
    const department = await prisma.department.create({
      data,
      include: departmentInclude(),
    });

    res.status(201).json({ data: department });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return next(httpError("Department name is already in use", 409));
    }
    return next(handleZodError(err));
  }
};

export const updateDepartment: RequestHandler = async (req, res, next) => {
  try {
    const data = updateDepartmentSchema.parse(req.body);
    const existing = await prisma.department.findUnique({ where: { id: req.params.id } });

    if (!existing) {
      throw httpError("Department not found", 404);
    }

    const department = await prisma.department.update({
      where: { id: req.params.id },
      data,
      include: departmentInclude(),
    });

    res.status(200).json({ data: department });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return next(httpError("Department name is already in use", 409));
    }
    return next(handleZodError(err));
  }
};

export const deleteDepartment: RequestHandler = async (req, res, next) => {
  try {
    const existing = await prisma.department.findUnique({ where: { id: req.params.id } });

    if (!existing) {
      throw httpError("Department not found", 404);
    }

    if (!existing.isActive) {
      throw httpError("Department is already deactivated", 409);
    }

    const department = await prisma.department.update({
      where: { id: req.params.id },
      data: { isActive: false },
      include: departmentInclude(),
    });

    res.status(200).json({ data: department });
  } catch (err) {
    next(err);
  }
};
