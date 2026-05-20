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

const dateRangeSchema = z
  .object({
    startDate: dateSchema,
    endDate: dateSchema,
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "Start date must be before or equal to end date",
    path: ["endDate"],
  });

export const leavePayloadSchema = z
  .object({
    employeeId: uuidSchema("employeeId"),
    leaveType: z.enum(["SICK", "PERSONAL", "VACATION", "UNPAID", "OTHER"]),
    reason: z.string().trim().max(500).optional().nullable(),
  })
  .and(dateRangeSchema);

export const updateLeaveSchema = z
  .object({
    employeeId: uuidSchema("employeeId").optional(),
    leaveType: z.enum(["SICK", "PERSONAL", "VACATION", "UNPAID", "OTHER"]).optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    reason: z.string().trim().max(500).optional().nullable(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.startDate <= data.endDate, {
    message: "Start date must be before or equal to end date",
    path: ["endDate"],
  });

export const rejectLeaveSchema = z.object({
  rejectReason: z.string().trim().min(1, "Reject reason is required").max(500),
});

export const listLeaveQuerySchema = z.object({
  employeeId: uuidSchema("employeeId").optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
  leaveType: z.enum(["SICK", "PERSONAL", "VACATION", "UNPAID", "OTHER"]).optional(),
  fromDate: dateSchema.optional(),
  toDate: dateSchema.optional(),
});
