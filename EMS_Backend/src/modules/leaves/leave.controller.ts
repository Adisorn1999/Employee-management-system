import { RequestHandler } from "express";
import { ZodError } from "zod";

import { httpError } from "../../common/utils/errors";
import { leaveService } from "./leave.service";
import { idParamSchema, leavePayloadSchema, listLeaveQuerySchema, rejectLeaveSchema, updateLeaveSchema } from "./leave.schema";

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

export const createLeave: RequestHandler = async (req, res, next) => {
  try {
    const data = leavePayloadSchema.parse(req.body);
    const leave = await leaveService.create(data);

    res.status(201).json({ data: leave });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const listLeaves: RequestHandler = async (req, res, next) => {
  try {
    const query = listLeaveQuerySchema.parse(req.query);
    const leaves = await leaveService.list(query);

    res.status(200).json({ data: leaves });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const getLeave: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const leave = await leaveService.get(id);

    res.status(200).json({ data: leave });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const updateLeave: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = updateLeaveSchema.parse(req.body);
    const leave = await leaveService.update(id, data);

    res.status(200).json({ data: leave });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const approveLeave: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const leave = await leaveService.approve(id, requireCurrentUserId(req.user?.id));

    res.status(200).json({ data: leave });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const rejectLeave: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = rejectLeaveSchema.parse(req.body);
    const leave = await leaveService.reject(id, data, requireCurrentUserId(req.user?.id));

    res.status(200).json({ data: leave });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const cancelLeave: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const leave = await leaveService.cancel(id);

    res.status(200).json({ data: leave });
  } catch (err) {
    next(handleZodError(err));
  }
};
