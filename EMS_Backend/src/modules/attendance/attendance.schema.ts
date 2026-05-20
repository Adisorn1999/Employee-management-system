import { z } from "zod";

const uuidSchema = (fieldName: string) => z.string().uuid(`${fieldName} must be a valid UUID`);
const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const optionalTimestampSchema = z
  .string()
  .datetime("Timestamp must be a valid ISO datetime")
  .transform((value) => new Date(value))
  .optional();

export const employeeIdParamSchema = z.object({
  employeeId: uuidSchema("employeeId"),
});

export const checkInSchema = z.object({
  employeeId: uuidSchema("employeeId"),
  checkInAt: optionalTimestampSchema,
  note: z.string().trim().max(500).optional(),
});

export const checkOutSchema = z.object({
  employeeId: uuidSchema("employeeId"),
  checkOutAt: optionalTimestampSchema,
  note: z.string().trim().max(500).optional(),
});

export const listAttendanceQuerySchema = z.object({
  employeeId: uuidSchema("employeeId").optional(),
  status: z.enum(["PRESENT", "LATE", "ABSENT", "HALF_DAY", "OVERTIME"]).optional(),
  fromDate: dateSchema.optional(),
  toDate: dateSchema.optional(),
});
