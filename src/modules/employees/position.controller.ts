import { Prisma } from "@prisma/client";
import { RequestHandler } from "express";
import { ZodError, z } from "zod";

import { httpError, HttpError } from "../../common/utils/errors";
import prisma from "../../config/prisma";

const positionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  departmentId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

const updatePositionSchema = positionSchema.partial();

const listPositionQuerySchema = z.object({
  departmentId: z.string().uuid().optional(),
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

function positionInclude(): Prisma.PositionInclude {
  return {
    department: true,
    _count: {
      select: {
        employees: true,
      },
    },
  };
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

function toPositionCreateInput(data: z.infer<typeof positionSchema>): Prisma.PositionCreateInput {
  return {
    name: data.name,
    description: data.description,
    isActive: data.isActive,
    department: data.departmentId ? { connect: { id: data.departmentId } } : undefined,
  };
}

function toPositionUpdateInput(data: z.infer<typeof updatePositionSchema>): Prisma.PositionUpdateInput {
  return {
    name: data.name,
    description: data.description,
    isActive: data.isActive,
    department:
      data.departmentId === undefined
        ? undefined
        : data.departmentId
          ? { connect: { id: data.departmentId } }
          : { disconnect: true },
  };
}

export const listPositions: RequestHandler = async (req, res, next) => {
  try {
    const query = listPositionQuerySchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;
    const where: Prisma.PositionWhereInput = {
      ...(query.departmentId && { departmentId: query.departmentId }),
      ...(query.isActive !== undefined && { isActive: query.isActive === "true" }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { description: { contains: query.search, mode: "insensitive" } },
          { department: { name: { contains: query.search, mode: "insensitive" } } },
        ],
      }),
    };

    const [positions, total] = await prisma.$transaction([
      prisma.position.findMany({
        where,
        include: positionInclude(),
        orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
        skip,
        take: query.limit,
      }),
      prisma.position.count({ where }),
    ]);

    res.status(200).json({
      data: positions,
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

export const getPosition: RequestHandler = async (req, res, next) => {
  try {
    const position = await prisma.position.findUnique({
      where: { id: req.params.id },
      include: positionInclude(),
    });

    if (!position) {
      throw httpError("Position not found", 404);
    }

    res.status(200).json({ data: position });
  } catch (err) {
    next(err);
  }
};

export const createPosition: RequestHandler = async (req, res, next) => {
  try {
    const data = positionSchema.parse(req.body);
    await assertDepartmentExists(data.departmentId);

    const position = await prisma.position.create({
      data: toPositionCreateInput(data),
      include: positionInclude(),
    });

    res.status(201).json({ data: position });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return next(httpError("Position name is already in use for this department", 409));
    }
    return next(handleZodError(err));
  }
};

export const updatePosition: RequestHandler = async (req, res, next) => {
  try {
    const data = updatePositionSchema.parse(req.body);
    const existing = await prisma.position.findUnique({ where: { id: req.params.id } });

    if (!existing) {
      throw httpError("Position not found", 404);
    }

    await assertDepartmentExists(data.departmentId);

    const position = await prisma.position.update({
      where: { id: req.params.id },
      data: toPositionUpdateInput(data),
      include: positionInclude(),
    });

    res.status(200).json({ data: position });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return next(httpError("Position name is already in use for this department", 409));
    }
    return next(handleZodError(err));
  }
};

export const deletePosition: RequestHandler = async (req, res, next) => {
  try {
    const existing = await prisma.position.findUnique({ where: { id: req.params.id } });

    if (!existing) {
      throw httpError("Position not found", 404);
    }

    if (!existing.isActive) {
      throw httpError("Position is already deactivated", 409);
    }

    const position = await prisma.position.update({
      where: { id: req.params.id },
      data: { isActive: false },
      include: positionInclude(),
    });

    res.status(200).json({ data: position });
  } catch (err) {
    next(err);
  }
};
