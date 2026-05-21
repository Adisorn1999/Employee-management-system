import { FinanceAccountCategory, FinanceAccountStatus, FinanceChannelTypeCode, Prisma } from "@prisma/client";
import { z } from "zod";

import { httpError } from "../../common/utils/errors";
import prisma from "../../config/prisma";
import {
  createDefinitionSchema,
  createChannelTypeSchema,
  createFinanceAccountSchema,
  createProviderSchema,
  createTemplateSchema,
  listChannelTypeQuerySchema,
  listDefinitionQuerySchema,
  listFinanceAccountQuerySchema,
  listProviderQuerySchema,
  listTemplateQuerySchema,
  updateChannelTypeSchema,
  updateDefinitionSchema,
  updateFinanceAccountSchema,
  updateProviderSchema,
  updateTemplateSchema,
} from "./finance.schema";

type CreateAccountInput = z.infer<typeof createFinanceAccountSchema>;
type UpdateAccountInput = z.infer<typeof updateFinanceAccountSchema>;
type ListAccountQuery = z.infer<typeof listFinanceAccountQuerySchema>;
type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
type ListTemplateQuery = z.infer<typeof listTemplateQuerySchema>;
type CreateChannelTypeInput = z.infer<typeof createChannelTypeSchema>;
type UpdateChannelTypeInput = z.infer<typeof updateChannelTypeSchema>;
type ListChannelTypeQuery = z.infer<typeof listChannelTypeQuerySchema>;
type CreateProviderInput = z.infer<typeof createProviderSchema>;
type UpdateProviderInput = z.infer<typeof updateProviderSchema>;
type ListProviderQuery = z.infer<typeof listProviderQuerySchema>;
type CreateDefinitionInput = z.infer<typeof createDefinitionSchema>;
type UpdateDefinitionInput = z.infer<typeof updateDefinitionSchema>;
type ListDefinitionQuery = z.infer<typeof listDefinitionQuerySchema>;

const accountInclude = {
  fieldValues: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.FinanceAccountInclude;

const templateInclude = {
  channelType: true,
  providerRecord: {
    include: { channelType: true },
  },
  fieldDefinitions: {
    orderBy: [{ sortOrder: "asc" }, { fieldKey: "asc" }],
  },
} satisfies Prisma.FinanceFieldTemplateInclude;

function normalizeProvider(provider?: string) {
  return provider?.trim().toUpperCase();
}

function slugId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function uniqueSuffix() {
  return Date.now().toString(36);
}

function channelTypeIdFromCode(code: FinanceChannelTypeCode) {
  return `finance_channel_${slugId(code)}`;
}

function providerIdFromCode(code: string) {
  return `finance_provider_${slugId(code)}`;
}

function templateIdFromParts(providerCode: string, name: string) {
  return `finance_template_${slugId(providerCode)}_${slugId(name)}`;
}

function definitionIdFromParts(templateId: string, fieldKey: string) {
  return `finance_definition_${slugId(templateId)}_${slugId(fieldKey)}`;
}

function accountIdFromDisplayName(displayName: string) {
  return `finance_account_${slugId(displayName) || "account"}_${uniqueSuffix()}`;
}

function accountFieldValueId(accountId: string, fieldKey: string, index: number) {
  return `finance_account_field_${slugId(accountId)}_${slugId(fieldKey) || index + 1}`;
}

function channelTypeForCategory(category: FinanceAccountCategory) {
  if (category === FinanceAccountCategory.GATEWAY) return FinanceChannelTypeCode.GATEWAY;
  if (category === FinanceAccountCategory.WALLET) return FinanceChannelTypeCode.TRUEWALLET;
  return FinanceChannelTypeCode.BANK;
}

function defaultCategoryForChannelType(code: FinanceChannelTypeCode) {
  if (code === FinanceChannelTypeCode.GATEWAY) return FinanceAccountCategory.GATEWAY;
  if (code === FinanceChannelTypeCode.TRUEWALLET) return FinanceAccountCategory.WALLET;
  return FinanceAccountCategory.CORPORATE_BANK;
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
    ...(query.channelTypeId && { channelTypeId: query.channelTypeId }),
    ...(query.providerId && { providerId: query.providerId }),
    ...(query.provider && { provider: normalizeProvider(query.provider) }),
    ...(query.channelType && { channelType: { code: query.channelType } }),
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
    ...((query.channelTypeId || query.channelType || query.providerId) && {
      template: {
        ...(query.category && { category: query.category }),
        ...(query.provider && { provider: normalizeProvider(query.provider) }),
        ...(query.channelTypeId && { channelTypeId: query.channelTypeId }),
        ...(query.providerId && { providerId: query.providerId }),
        ...(query.channelType && { channelType: { code: query.channelType } }),
      },
    }),
  };
}

function channelTypeWhere(query: ListChannelTypeQuery): Prisma.FinanceChannelTypeWhereInput {
  return {
    ...(query.isActive !== undefined && { isActive: query.isActive === "true" }),
  };
}

function providerWhere(query: ListProviderQuery): Prisma.FinanceProviderWhereInput {
  return {
    ...(query.channelTypeId && { channelTypeId: query.channelTypeId }),
    ...(query.channelType && { channelType: { code: query.channelType } }),
    ...(query.isActive !== undefined && { isActive: query.isActive === "true" }),
  };
}

async function getProviderForTemplate(providerId: string) {
  const provider = await prisma.financeProvider.findUnique({
    where: { id: providerId },
    include: { channelType: true },
  });
  if (!provider) {
    throw httpError("Finance provider not found", 404);
  }
  if (!provider.isActive || !provider.channelType.isActive) {
    throw httpError("Finance provider is inactive", 400);
  }
  return provider;
}

async function validateRequiredFields(category: FinanceAccountCategory, provider: string, fields: CreateAccountInput["fields"]) {
  const channelType = channelTypeForCategory(category);
  const normalizedProvider = normalizeProvider(provider);
  const providerRecord = await prisma.financeProvider.findFirst({
    where: {
      code: normalizedProvider,
      channelType: { code: channelType },
      isActive: true,
    },
    select: { id: true },
  });
  const template =
    (providerRecord &&
      (await prisma.financeFieldTemplate.findFirst({
        where: { category, providerId: providerRecord.id, isActive: true },
        include: templateInclude,
        orderBy: { createdAt: "desc" },
      }))) ||
    (providerRecord &&
      (await prisma.financeFieldTemplate.findFirst({
        where: { providerId: providerRecord.id, isActive: true },
        include: templateInclude,
        orderBy: { createdAt: "desc" },
      }))) ||
    (await prisma.financeFieldTemplate.findFirst({
      where: { category, provider: normalizedProvider, isActive: true },
      include: templateInclude,
      orderBy: { createdAt: "desc" },
    }));

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

  listChannelTypes: (query: ListChannelTypeQuery) =>
    prisma.financeChannelType.findMany({
      where: channelTypeWhere(query),
      orderBy: [{ code: "asc" }],
    }),

  getChannelType: async (id: string) => {
    const channelType = await prisma.financeChannelType.findUnique({ where: { id } });
    if (!channelType) {
      throw httpError("Finance channel type not found", 404);
    }
    return channelType;
  },

  createChannelType: (data: CreateChannelTypeInput) =>
    prisma.financeChannelType.upsert({
      where: { code: data.code },
      update: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
      },
      create: {
        id: channelTypeIdFromCode(data.code),
        ...data,
      },
    }),

  updateChannelType: async (id: string, data: UpdateChannelTypeInput) => {
    await financeService.getChannelType(id);
    return prisma.financeChannelType.update({
      where: { id },
      data,
    });
  },

  deleteChannelType: async (id: string) => {
    await financeService.getChannelType(id);
    return prisma.financeChannelType.update({
      where: { id },
      data: { isActive: false },
    });
  },

  listProviders: (query: ListProviderQuery) =>
    prisma.financeProvider.findMany({
      where: providerWhere(query),
      include: { channelType: true },
      orderBy: [{ channelType: { code: "asc" } }, { name: "asc" }],
    }),

  getProvider: async (id: string) => {
    const provider = await prisma.financeProvider.findUnique({ where: { id }, include: { channelType: true } });
    if (!provider) {
      throw httpError("Finance provider not found", 404);
    }
    return provider;
  },

  createProvider: async (data: CreateProviderInput) => {
    await financeService.getChannelType(data.channelTypeId);
    return prisma.financeProvider.upsert({
      where: {
        channelTypeId_code: {
          channelTypeId: data.channelTypeId,
          code: data.code,
        },
      },
      update: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
      },
      create: {
        id: providerIdFromCode(data.code),
        ...data,
      },
      include: { channelType: true },
    });
  },

  updateProvider: async (id: string, data: UpdateProviderInput) => {
    await financeService.getProvider(id);
    return prisma.financeProvider.update({
      where: { id },
      data,
      include: { channelType: true },
    });
  },

  deleteProvider: async (id: string) => {
    await financeService.getProvider(id);
    return prisma.financeProvider.update({
      where: { id },
      data: { isActive: false },
      include: { channelType: true },
    });
  },

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
    const accountId = accountIdFromDisplayName(data.displayName);

    return prisma.$transaction((tx) =>
      tx.financeAccount.create({
        data: {
          id: accountId,
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
            create: data.fields.map((field, index) => ({
              id: accountFieldValueId(accountId, field.fieldKey, index),
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
              create: fields.map((field, index) => ({
                id: accountFieldValueId(id, field.fieldKey, index),
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

  resolveTemplate: async (category: FinanceAccountCategory, provider: string) => {
    const channelType = channelTypeForCategory(category);
    const normalizedProvider = normalizeProvider(provider);
    const providerRecord = await prisma.financeProvider.findFirst({
      where: {
        code: normalizedProvider,
        channelType: { code: channelType },
        isActive: true,
      },
      select: { id: true },
    });
    return (
      (providerRecord &&
        (await prisma.financeFieldTemplate.findFirst({
          where: { category, providerId: providerRecord.id, isActive: true },
          include: templateInclude,
          orderBy: { createdAt: "desc" },
        }))) ||
      (providerRecord &&
        (await prisma.financeFieldTemplate.findFirst({
          where: { providerId: providerRecord.id, isActive: true },
          include: templateInclude,
          orderBy: { createdAt: "desc" },
        }))) ||
      prisma.financeFieldTemplate.findFirst({
        where: { category, provider: normalizedProvider, isActive: true },
        include: templateInclude,
        orderBy: { createdAt: "desc" },
      })
    );
  },

  createTemplate: async (data: CreateTemplateInput) => {
    const provider = await getProviderForTemplate(data.providerId);
    return prisma.financeFieldTemplate.create({
      data: {
        id: templateIdFromParts(provider.code, data.name),
        category: data.category ?? defaultCategoryForChannelType(provider.channelType.code),
        provider: provider.code,
        channelTypeId: provider.channelTypeId,
        providerId: provider.id,
        name: data.name,
        isActive: data.isActive,
      },
      include: templateInclude,
    });
  },

  updateTemplate: async (id: string, data: UpdateTemplateInput) => {
    await financeService.getTemplate(id);
    const provider = data.providerId ? await getProviderForTemplate(data.providerId) : null;
    return prisma.financeFieldTemplate.update({
      where: { id },
      data: {
        ...(provider && {
          category: data.category ?? defaultCategoryForChannelType(provider.channelType.code),
          provider: provider.code,
          channelTypeId: provider.channelTypeId,
          providerId: provider.id,
        }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
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
        id: definitionIdFromParts(data.templateId, data.fieldKey),
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
