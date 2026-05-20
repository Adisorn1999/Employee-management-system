import { z } from "zod";

const timeSchema = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:mm format");
const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const uuidSchema = (fieldName: string) => z.string().uuid(`${fieldName} must be a valid UUID`);

export const idParamSchema = z.object({
  id: uuidSchema("id"),
});

export const employeeIdParamSchema = z.object({
  employeeId: uuidSchema("employeeId"),
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
  employeeId: uuidSchema("employeeId"),
  shiftId: uuidSchema("shiftId"),
  workDate: dateSchema,
  note: z.string().trim().max(500).optional(),
});

export const changeShiftSchema = z.object({
  employeeId: uuidSchema("employeeId"),
  effectiveDate: dateSchema,
  newShiftId: uuidSchema("newShiftId"),
  rotationOffDate: dateSchema.optional(),
  reason: z.string().trim().min(1, "Reason is required").max(500),
});

export const listScheduleQuerySchema = z.object({
  employeeId: uuidSchema("employeeId").optional(),
  shiftId: uuidSchema("shiftId").optional(),
  fromDate: dateSchema.optional(),
  toDate: dateSchema.optional(),
});

export const createSwapSchema = z.object({
  fromEmployeeId: uuidSchema("fromEmployeeId"),
  toEmployeeId: uuidSchema("toEmployeeId"),
  shiftScheduleId: uuidSchema("shiftScheduleId"),
  reason: z.string().trim().max(500).optional(),
});
