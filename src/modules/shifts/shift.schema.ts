import { z } from "zod";

const timeSchema = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:mm format");
const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const employeeIdParamSchema = z.object({
  employeeId: z.string().uuid(),
});

export const createShiftSchema = z.object({
  code: z.enum(["DAY", "NIGHT"]),
  name: z.string().trim().min(1).max(100),
  startTime: timeSchema,
  endTime: timeSchema,
  color: z.string().trim().max(32).optional(),
  isActive: z.boolean().optional(),
});

export const updateShiftSchema = createShiftSchema.partial();

export const listShiftQuerySchema = z.object({
  isActive: z.enum(["true", "false"]).optional(),
});

export const createScheduleSchema = z.object({
  employeeId: z.string().uuid(),
  shiftId: z.string().uuid(),
  workDate: dateSchema,
  note: z.string().trim().max(500).optional(),
});

export const listScheduleQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  shiftId: z.string().uuid().optional(),
  fromDate: dateSchema.optional(),
  toDate: dateSchema.optional(),
});

export const createSwapSchema = z.object({
  fromEmployeeId: z.string().uuid(),
  toEmployeeId: z.string().uuid(),
  shiftScheduleId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});
