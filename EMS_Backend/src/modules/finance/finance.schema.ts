import { FinanceAccountCategory, FinanceAccountStatus, FinanceFieldType } from "@prisma/client";
import { z } from "zod";

const uuidSchema = (fieldName: string) => z.string().uuid(`${fieldName} must be a valid UUID`);
const optionalText = (max = 500) => z.string().trim().max(max).optional().or(z.literal("").transform(() => undefined));
const providerSchema = z.string().trim().min(1).max(60).transform((value) => value.toUpperCase());
const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const idParamSchema = z.object({
  id: uuidSchema("id"),
});

export const listFinanceAccountQuerySchema = z.object({
  category: z.nativeEnum(FinanceAccountCategory).optional(),
  provider: z.string().trim().optional(),
  status: z.nativeEnum(FinanceAccountStatus).optional(),
  keyword: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const financeAccountFieldValueSchema = z.object({
  fieldKey: z.string().trim().min(1).max(100),
  labelSnapshot: z.string().trim().min(1).max(160),
  value: z.string().trim().max(5000).default(""),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const createFinanceAccountSchema = z.object({
  category: z.nativeEnum(FinanceAccountCategory),
  provider: providerSchema,
  displayName: z.string().trim().min(1).max(160),
  accountName: optionalText(160),
  accountNumber: optionalText(100),
  status: z.nativeEnum(FinanceAccountStatus).default(FinanceAccountStatus.ACTIVE),
  startDate: dateSchema.optional(),
  expireDate: dateSchema.optional(),
  note: optionalText(1000),
  fields: z.array(financeAccountFieldValueSchema).default([]),
});

export const updateFinanceAccountSchema = createFinanceAccountSchema.partial().extend({
  fields: z.array(financeAccountFieldValueSchema).optional(),
});

export const listTemplateQuerySchema = z.object({
  category: z.nativeEnum(FinanceAccountCategory).optional(),
  provider: z.string().trim().optional(),
  isActive: z.enum(["true", "false"]).optional(),
});

export const createTemplateSchema = z.object({
  category: z.nativeEnum(FinanceAccountCategory),
  provider: providerSchema,
  name: z.string().trim().min(1).max(160),
  isActive: z.boolean().default(true),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export const listDefinitionQuerySchema = z.object({
  templateId: uuidSchema("templateId").optional(),
  category: z.nativeEnum(FinanceAccountCategory).optional(),
  provider: z.string().trim().optional(),
  isActive: z.enum(["true", "false"]).optional(),
});

export const createDefinitionSchema = z.object({
  templateId: uuidSchema("templateId"),
  fieldKey: z.string().trim().min(1).max(100),
  labelTh: z.string().trim().min(1).max(160),
  labelEn: z.string().trim().min(1).max(160),
  fieldType: z.nativeEnum(FinanceFieldType).default(FinanceFieldType.text),
  placeholder: optionalText(160),
  options: z.array(z.string().trim().min(1).max(160)).optional(),
  isRequired: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateDefinitionSchema = createDefinitionSchema.partial().omit({ templateId: true });
