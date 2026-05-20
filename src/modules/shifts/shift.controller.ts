import { Prisma } from "@prisma/client";
import { RequestHandler } from "express";
import { ZodError } from "zod";

import { httpError, HttpError } from "../../common/utils/errors";
import { shiftService } from "./shift.service";
import {
  createScheduleSchema,
  createShiftSchema,
  createSwapSchema,
  employeeIdParamSchema,
  idParamSchema,
  listScheduleQuerySchema,
  listShiftQuerySchema,
  updateShiftSchema,
} from "./shift.schema";

function handleZodError(err: unknown): HttpError | unknown {
  if (err instanceof ZodError) {
    return httpError(err.issues.map((issue) => issue.message).join(", "), 400);
  }

  return err;
}

function requireCurrentUserId(userId?: string): string {
  if (!userId) {
    throw httpError("Unauthorized", 401);
  }

  return userId;
}

function handleKnownPrismaError(err: unknown): HttpError | unknown {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return httpError("Shift code or schedule already exists", 409);
  }

  return handleZodError(err);
}

export const listShifts: RequestHandler = async (req, res, next) => {
  try {
    const query = listShiftQuerySchema.parse(req.query);
    const shifts = await shiftService.listShifts(query);

    res.status(200).json({ data: shifts });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const getShift: RequestHandler = async (req, res, next) => {
  try {
    const params = idParamSchema.parse(req.params);
    const shift = await shiftService.getShift(params.id);

    res.status(200).json({ data: shift });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const createShift: RequestHandler = async (req, res, next) => {
  try {
    const data = createShiftSchema.parse(req.body);
    const shift = await shiftService.createShift(data);

    res.status(201).json({ data: shift });
  } catch (err) {
    next(handleKnownPrismaError(err));
  }
};

export const updateShift: RequestHandler = async (req, res, next) => {
  try {
    const params = idParamSchema.parse(req.params);
    const data = updateShiftSchema.parse(req.body);
    const shift = await shiftService.updateShift(params.id, data);

    res.status(200).json({ data: shift });
  } catch (err) {
    next(handleKnownPrismaError(err));
  }
};

export const deleteShift: RequestHandler = async (req, res, next) => {
  try {
    const params = idParamSchema.parse(req.params);
    const shift = await shiftService.deleteShift(params.id);

    res.status(200).json({ data: shift });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const createSchedule: RequestHandler = async (req, res, next) => {
  try {
    const data = createScheduleSchema.parse(req.body);
    const schedule = await shiftService.createSchedule(data, requireCurrentUserId(req.user?.id));

    res.status(201).json({ data: schedule });
  } catch (err) {
    next(handleKnownPrismaError(err));
  }
};

export const listSchedules: RequestHandler = async (req, res, next) => {
  try {
    const query = listScheduleQuerySchema.parse(req.query);
    const schedules = await shiftService.listSchedules(query);

    res.status(200).json({ data: schedules });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const listEmployeeSchedules: RequestHandler = async (req, res, next) => {
  try {
    const params = employeeIdParamSchema.parse(req.params);
    const schedules = await shiftService.listEmployeeSchedules(params.employeeId);

    res.status(200).json({ data: schedules });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const createSwap: RequestHandler = async (req, res, next) => {
  try {
    const data = createSwapSchema.parse(req.body);
    const swap = await shiftService.createSwap(data, requireCurrentUserId(req.user?.id));

    res.status(201).json({ data: swap });
  } catch (err) {
    next(handleKnownPrismaError(err));
  }
};
