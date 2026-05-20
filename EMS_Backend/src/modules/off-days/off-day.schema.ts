import { z } from "zod";

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const uuidSchema = (fieldName: string) => z.string().uuid(`${fieldName} must be a valid UUID`);

export const idParamSchema = z.object({
  id: uuidSchema("id"),
});

export const offDayPayloadSchema = z.object({
  employeeId: uuidSchema("employeeId"),
  offDate: dateSchema,
  type: z.enum(["MONTHLY_OFF", "EXTRA_OFF", "ROTATION_OFF", "SPECIAL_OFF"]).default("MONTHLY_OFF"),
  reason: z.string().trim().max(500).optional().nullable(),
});

export const updateOffDaySchema = offDayPayloadSchema.partial();

export const rejectOffDaySchema = z.object({
  rejectReason: z.string().trim().min(1, "Reject reason is required").max(500),
});

export const listOffDayQuerySchema = z.object({
  employeeId: uuidSchema("employeeId").optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
  type: z.enum(["MONTHLY_OFF", "EXTRA_OFF", "ROTATION_OFF", "SPECIAL_OFF"]).optional(),
  fromDate: dateSchema.optional(),
  toDate: dateSchema.optional(),
});
