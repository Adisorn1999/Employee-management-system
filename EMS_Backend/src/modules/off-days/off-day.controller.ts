import { RequestHandler } from "express";
import { ZodError } from "zod";

import { httpError } from "../../common/utils/errors";
import { offDayService } from "./off-day.service";
import { idParamSchema, listOffDayQuerySchema, offDayPayloadSchema, rejectOffDaySchema, updateOffDaySchema } from "./off-day.schema";

function handleZodError(err: unknown) {
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

export const createOffDay: RequestHandler = async (req, res, next) => {
  try {
    const data = offDayPayloadSchema.parse(req.body);
    const result = await offDayService.create(data, requireCurrentUserId(req.user?.id));

    res.status(201).json(result);
  } catch (err) {
    next(handleZodError(err));
  }
};

export const listOffDays: RequestHandler = async (req, res, next) => {
  try {
    const query = listOffDayQuerySchema.parse(req.query);
    const offDays = await offDayService.list(query);

    res.status(200).json({ data: offDays, meta: { quota: offDayService.quota } });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const getOffDay: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const offDay = await offDayService.get(id);

    res.status(200).json({ data: offDay });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const updateOffDay: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = updateOffDaySchema.parse(req.body);
    const result = await offDayService.update(id, data);

    res.status(200).json(result);
  } catch (err) {
    next(handleZodError(err));
  }
};

export const approveOffDay: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await offDayService.approve(id, requireCurrentUserId(req.user?.id));

    res.status(200).json(result);
  } catch (err) {
    next(handleZodError(err));
  }
};

export const rejectOffDay: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = rejectOffDaySchema.parse(req.body);
    const offDay = await offDayService.reject(id, data, requireCurrentUserId(req.user?.id));

    res.status(200).json({ data: offDay });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const cancelOffDay: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const offDay = await offDayService.cancel(id);

    res.status(200).json({ data: offDay });
  } catch (err) {
    next(handleZodError(err));
  }
};
