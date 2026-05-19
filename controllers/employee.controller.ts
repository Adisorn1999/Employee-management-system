import { RequestHandler } from "express";
import { ZodError, z } from "zod";

import prisma from "../lib/prisma";
import { httpError, HttpError } from "../utils/errors";

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createEmployeeSchema = z.object({
  prefix:     z.string().trim().min(1).max(20),
  employeeNo: z.string().trim().min(1).max(50),
  name:       z.string().trim().min(1).max(100),
  email:      z.string().email().max(255).optional(),
  phone:      z.string().trim().max(20).optional(),
  position:   z.string().trim().max(100).optional(),
});

const updateEmployeeSchema = z.object({
  prefix:   z.string().trim().min(1).max(20).optional(),
  name:     z.string().trim().min(1).max(100).optional(),
  email:    z.string().email().max(255).optional(),
  phone:    z.string().trim().max(20).optional(),
  position: z.string().trim().max(100).optional(),
  isActive: z.boolean().optional(),
});

const listQuerySchema = z.object({
  prefix:   z.string().trim().optional(),
  search:   z.string().trim().optional(),
  isActive: z.enum(["true", "false"]).optional(),
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
});

function handleZodError(err: unknown): HttpError | unknown {
  if (err instanceof ZodError) {
    return httpError(err.issues.map((i) => i.message).join(", "), 400);
  }
  return err;
}

// ─── GET /api/employees ───────────────────────────────────────────────────────
// ดูรายการพนักงานทั้งหมด พร้อม filter by prefix, search, isActive

export const listEmployees: RequestHandler = async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;

    const where = {
      ...(query.prefix   && { prefix: query.prefix }),
      ...(query.isActive !== undefined && { isActive: query.isActive === "true" }),
      ...(query.search   && {
        OR: [
          { name:       { contains: query.search, mode: "insensitive" as const } },
          { employeeNo: { contains: query.search, mode: "insensitive" as const } },
          { position:   { contains: query.search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [employees, total] = await prisma.$transaction([
      prisma.employee.findMany({
        where,
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
        page:       query.page,
        limit:      query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (err) {
    next(handleZodError(err));
  }
};

// ─── GET /api/employees/:id ───────────────────────────────────────────────────

export const getEmployee: RequestHandler = async (req, res, next) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
    });

    if (!employee) {
      throw httpError("Employee not found", 404);
    }

    res.status(200).json({ data: employee });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/employees ──────────────────────────────────────────────────────

export const createEmployee: RequestHandler = async (req, res, next) => {
  try {
    const data = createEmployeeSchema.parse(req.body);

    const existing = await prisma.employee.findUnique({
      where: { employeeNo: data.employeeNo },
    });

    if (existing) {
      throw httpError(`Employee number "${data.employeeNo}" is already in use`, 409);
    }

    const employee = await prisma.employee.create({ data });

    res.status(201).json({ data: employee });
  } catch (err) {
    next(handleZodError(err));
  }
};

// ─── PATCH /api/employees/:id ─────────────────────────────────────────────────

export const updateEmployee: RequestHandler = async (req, res, next) => {
  try {
    const data = updateEmployeeSchema.parse(req.body);

    const existing = await prisma.employee.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw httpError("Employee not found", 404);
    }

    const employee = await prisma.employee.update({
      where: { id: req.params.id },
      data,
    });

    res.status(200).json({ data: employee });
  } catch (err) {
    next(handleZodError(err));
  }
};

// ─── DELETE /api/employees/:id (Soft Delete) ──────────────────────────────────

export const deleteEmployee: RequestHandler = async (req, res, next) => {
  try {
    const existing = await prisma.employee.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw httpError("Employee not found", 404);
    }

    if (!existing.isActive) {
      throw httpError("Employee is already deactivated", 409);
    }

    const employee = await prisma.employee.update({
      where: { id: req.params.id },
      data:  { isActive: false },
    });

    res.status(200).json({ data: employee });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/employees/prefixes ─────────────────────────────────────────────
// ดู prefix ที่มีในระบบทั้งหมด

export const listPrefixes: RequestHandler = async (_req, res, next) => {
  try {
    const prefixes = await prisma.employee.findMany({
      select:  { prefix: true },
      distinct: ["prefix"],
      orderBy: { prefix: "asc" },
    });

    res.status(200).json({ data: prefixes.map((p) => p.prefix) });
  } catch (err) {
    next(err);
  }
};