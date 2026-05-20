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

export const attendanceIdParamSchema = z.object({
  id: uuidSchema("id"),
});

export const checkInSchema = z.object({
  employeeId: uuidSchema("employeeId"),
  workDate: dateSchema.optional(),
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

export const updateAttendanceSchema = z
  .object({
    checkInAt: optionalTimestampSchema,
    checkOutAt: optionalTimestampSchema.nullable(),
    lateMinutes: z.coerce.number().int().min(0).optional(),
    overtimeMinutes: z.coerce.number().int().min(0).optional(),
    status: z.enum(["PRESENT", "LATE", "ABSENT", "HALF_DAY", "OVERTIME"]).optional(),
    note: z.string().trim().max(500).nullable().optional(),
    adjustmentReason: z.string().trim().max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one attendance field is required",
  });
