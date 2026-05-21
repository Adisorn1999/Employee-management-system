import { FinanceAccountCategory, FinanceAccountStatus, Prisma } from "@prisma/client";
import { z } from "zod";

import { httpError } from "../../common/utils/errors";
import prisma from "../../config/prisma";
import {
  createDefinitionSchema,
  createFinanceAccountSchema,
  createTemplateSchema,
  listDefinitionQuerySchema,
  listFinanceAccountQuerySchema,
  listTemplateQuerySchema,
  updateDefinitionSchema,
  updateFinanceAccountSchema,
  updateTemplateSchema,
} from "./finance.schema";

type CreateAccountInput = z.infer<typeof createFinanceAccountSchema>;
type UpdateAccountInput = z.infer<typeof updateFinanceAccountSchema>;
type ListAccountQuery = z.infer<typeof listFinanceAccountQuerySchema>;
type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
type ListTemplateQuery = z.infer<typeof listTemplateQuerySchema>;
type CreateDefinitionInput = z.infer<typeof createDefinitionSchema>;
type UpdateDefinitionInput = z.infer<typeof updateDefinitionSchema>;
type ListDefinitionQuery = z.infer<typeof listDefinitionQuerySchema>;

const accountInclude = {
  fieldValues: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.FinanceAccountInclude;

const templateInclude = {
  fieldDefinitions: {
    orderBy: [{ sortOrder: "asc" }, { fieldKey: "asc" }],
  },
} satisfies Prisma.FinanceFieldTemplateInclude;

function normalizeProvider(provider?: string) {
  return provider?.trim().toUpperCase();
}

function accountWhere(query: ListAccountQuery): Prisma.FinanceAccountWhereInput {
  return {
    ...(query.category && { category: query.category }),
    ...(query.provider && { provider: normalizeProvider(query.provider) }),
    ...(query.status && { status: query.status }),
    ...(query.keyword && {
      OR: [
        { displayName: { contains: query.keyword, mode: "insensitive" } },
        { accountName: { contains: query.keyword, mode: "insensitive" } },
        { accountNumber: { contains: query.keyword, mode: "insensitive" } },
        { provider: { contains: query.keyword, mode: "insensitive" } },
        { note: { contains: query.keyword, mode: "insensitive" } },
      ],
    }),
  };
}

function templateWhere(query: ListTemplateQuery): Prisma.FinanceFieldTemplateWhereInput {
  return {
    ...(query.category && { category: query.category }),
    ...(query.provider && { provider: normalizeProvider(query.provider) }),
    ...(query.isActive !== undefined && { isActive: query.isActive === "true" }),
  };
}

function definitionWhere(query: ListDefinitionQuery): Prisma.FinanceFieldDefinitionWhereInput {
  return {
    ...(query.templateId && { templateId: query.templateId }),
    ...(query.isActive !== undefined && { isActive: query.isActive === "true" }),
    ...((query.category || query.provider) && {
      template: {
        ...(query.category && { category: query.category }),
        ...(query.provider && { provider: normalizeProvider(query.provider) }),
      },
    }),
  };
}

async function validateRequiredFields(category: FinanceAccountCategory, provider: string, fields: CreateAccountInput["fields"]) {
  const template = await prisma.financeFieldTemplate.findFirst({
    where: { category, provider, isActive: true },
    include: templateInclude,
    orderBy: { createdAt: "desc" },
  });

  if (!template) {
    return;
  }

  const valuesByKey = new Map(fields.filter((field) => field.isActive).map((field) => [field.fieldKey, field.value]));
  const missing = template.fieldDefinitions
    .filter((definition) => definition.isActive && definition.isRequired)
    .filter((definition) => !valuesByKey.get(definition.fieldKey)?.trim())
    .map((definition) => definition.labelTh || definition.labelEn);

  if (missing.length) {
    throw httpError(`Required finance fields are missing: ${missing.join(", ")}`, 400);
  }
}

export const financeService = {
  accountInclude,
  templateInclude,

  listAccounts: async (query: ListAccountQuery) => {
    const where = accountWhere(query);
    const skip = (query.page - 1) * query.limit;
    const [accounts, total] = await prisma.$transaction([
      prisma.financeAccount.findMany({
        where,
        include: accountInclude,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: query.limit,
      }),
      prisma.financeAccount.count({ where }),
    ]);

    return {
      data: accounts,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },

  getAccount: async (id: string) => {
    const account = await prisma.financeAccount.findUnique({ where: { id }, include: accountInclude });
    if (!account) {
      throw httpError("Finance account not found", 404);
    }
    return account;
  },

  createAccount: async (data: CreateAccountInput) => {
    await validateRequiredFields(data.category, data.provider, data.fields);

    return prisma.$transaction((tx) =>
      tx.financeAccount.create({
        data: {
          category: data.category,
          provider: data.provider,
          displayName: data.displayName,
          accountName: data.accountName,
          accountNumber: data.accountNumber,
          status: data.status,
          startDate: data.startDate,
          expireDate: data.expireDate,
          note: data.note,
          fieldValues: {
            create: data.fields.map((field) => ({
              fieldKey: field.fieldKey,
              labelSnapshot: field.labelSnapshot,
              value: field.value,
              sortOrder: field.sortOrder,
              isActive: field.isActive,
            })),
          },
        },
        include: accountInclude,
      })
    );
  },

  updateAccount: async (id: string, data: UpdateAccountInput) => {
    const existing = await financeService.getAccount(id);
    const category = data.category ?? existing.category;
    const provider = data.provider ?? existing.provider;
    const fields = data.fields;

    if (fields) {
      await validateRequiredFields(category, provider, fields);
    }

    return prisma.$transaction(async (tx) => {
      if (fields) {
        await tx.financeAccountFieldValue.deleteMany({ where: { accountId: id } });
      }

      return tx.financeAccount.update({
        where: { id },
        data: {
          category: data.category,
          provider: data.provider,
          displayName: data.displayName,
          accountName: data.accountName,
          accountNumber: data.accountNumber,
          status: data.status,
          startDate: data.startDate,
          expireDate: data.expireDate,
          note: data.note,
          ...(fields && {
            fieldValues: {
              create: fields.map((field) => ({
                fieldKey: field.fieldKey,
                labelSnapshot: field.labelSnapshot,
                value: field.value,
                sortOrder: field.sortOrder,
                isActive: field.isActive,
              })),
            },
          }),
        },
        include: accountInclude,
      });
    });
  },

  deleteAccount: async (id: string) => {
    await financeService.getAccount(id);
    return prisma.financeAccount.update({
      where: { id },
      data: { status: FinanceAccountStatus.INACTIVE },
      include: accountInclude,
    });
  },

  listTemplates: (query: ListTemplateQuery) =>
    prisma.financeFieldTemplate.findMany({
      where: templateWhere(query),
      include: templateInclude,
      orderBy: [{ category: "asc" }, { provider: "asc" }, { name: "asc" }],
    }),

  getTemplate: async (id: string) => {
    const template = await prisma.financeFieldTemplate.findUnique({ where: { id }, include: templateInclude });
    if (!template) {
      throw httpError("Finance template not found", 404);
    }
    return template;
  },

  resolveTemplate: async (category: FinanceAccountCategory, provider: string) =>
    prisma.financeFieldTemplate.findFirst({
      where: { category, provider: normalizeProvider(provider), isActive: true },
      include: templateInclude,
      orderBy: { createdAt: "desc" },
    }),

  createTemplate: (data: CreateTemplateInput) =>
    prisma.financeFieldTemplate.create({
      data,
      include: templateInclude,
    }),

  updateTemplate: async (id: string, data: UpdateTemplateInput) => {
    await financeService.getTemplate(id);
    return prisma.financeFieldTemplate.update({
      where: { id },
      data,
      include: templateInclude,
    });
  },

  deleteTemplate: async (id: string) => {
    await financeService.getTemplate(id);
    return prisma.financeFieldTemplate.update({
      where: { id },
      data: { isActive: false },
      include: templateInclude,
    });
  },

  listDefinitions: (query: ListDefinitionQuery) =>
    prisma.financeFieldDefinition.findMany({
      where: definitionWhere(query),
      include: { template: true },
      orderBy: [{ sortOrder: "asc" }, { fieldKey: "asc" }],
    }),

  createDefinition: async (data: CreateDefinitionInput) => {
    await financeService.getTemplate(data.templateId);
    return prisma.financeFieldDefinition.create({
      data: {
        ...data,
        options: data.options ?? Prisma.JsonNull,
      },
      include: { template: true },
    });
  },

  updateDefinition: async (id: string, data: UpdateDefinitionInput) => {
    const existing = await prisma.financeFieldDefinition.findUnique({ where: { id } });
    if (!existing) {
      throw httpError("Finance field definition not found", 404);
    }
    return prisma.financeFieldDefinition.update({
      where: { id },
      data: {
        ...data,
        ...(data.options !== undefined && { options: data.options ?? Prisma.JsonNull }),
      },
      include: { template: true },
    });
  },

  deleteDefinition: async (id: string) => {
    const existing = await prisma.financeFieldDefinition.findUnique({ where: { id } });
    if (!existing) {
      throw httpError("Finance field definition not found", 404);
    }
    return prisma.financeFieldDefinition.update({
      where: { id },
      data: { isActive: false },
      include: { template: true },
    });
  },
};
