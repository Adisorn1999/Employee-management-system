import { Prisma } from "@prisma/client";
import { RequestHandler } from "express";
import { ZodError } from "zod";

import { httpError, HttpError } from "../../common/utils/errors";
import { attendanceService } from "./attendance.service";
import {
  checkInSchema,
  checkOutSchema,
  employeeIdParamSchema,
  listAttendanceQuerySchema,
} from "./attendance.schema";

function handleZodError(err: unknown): HttpError | unknown {
  if (err instanceof ZodError) {
    return httpError(err.issues.map((issue) => issue.message).join(", "), 400);
  }

  return err;
}

function handleKnownPrismaError(err: unknown): HttpError | unknown {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return httpError("Employee has already checked in for the scheduled shift", 409);
  }

  return handleZodError(err);
}

export const checkIn: RequestHandler = async (req, res, next) => {
  try {
    const data = checkInSchema.parse(req.body);
    const attendance = await attendanceService.checkIn(data);

    res.status(201).json({ data: attendance });
  } catch (err) {
    next(handleKnownPrismaError(err));
  }
};

export const checkOut: RequestHandler = async (req, res, next) => {
  try {
    const data = checkOutSchema.parse(req.body);
    const attendance = await attendanceService.checkOut(data);

    res.status(200).json({ data: attendance });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const listAttendance: RequestHandler = async (req, res, next) => {
  try {
    const query = listAttendanceQuerySchema.parse(req.query);
    const attendances = await attendanceService.list(query);

    res.status(200).json({ data: attendances });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const listEmployeeAttendance: RequestHandler = async (req, res, next) => {
  try {
    const params = employeeIdParamSchema.parse(req.params);
    const attendances = await attendanceService.listByEmployee(params.employeeId);

    res.status(200).json({ data: attendances });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const listTodayAttendance: RequestHandler = async (_req, res, next) => {
  try {
    const attendances = await attendanceService.listToday();

    res.status(200).json({ data: attendances });
  } catch (err) {
    next(err);
  }
};
