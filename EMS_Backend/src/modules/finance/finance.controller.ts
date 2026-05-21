import { Prisma } from "@prisma/client";
import { RequestHandler } from "express";
import { ZodError } from "zod";

import { httpError, HttpError } from "../../common/utils/errors";
import { financeService } from "./finance.service";
import {
  createChannelTypeSchema,
  createDefinitionSchema,
  createFinanceAccountSchema,
  createProviderSchema,
  createTemplateSchema,
  idParamSchema,
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

function handleZodError(err: unknown): HttpError | unknown {
  if (err instanceof ZodError) {
    return httpError(err.issues.map((issue) => issue.message).join(", "), 400);
  }
  return err;
}

function handleKnownError(err: unknown): HttpError | unknown {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return httpError("Finance record already exists", 409);
  }
  return handleZodError(err);
}

export const listFinanceAccounts: RequestHandler = async (req, res, next) => {
  try {
    const query = listFinanceAccountQuerySchema.parse(req.query);
    const result = await financeService.listAccounts(query);
    res.status(200).json(result);
  } catch (err) {
    next(handleZodError(err));
  }
};

export const getFinanceAccount: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const account = await financeService.getAccount(id);
    res.status(200).json({ data: account });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const createFinanceAccount: RequestHandler = async (req, res, next) => {
  try {
    const data = createFinanceAccountSchema.parse(req.body);
    const account = await financeService.createAccount(data);
    res.status(201).json({ data: account });
  } catch (err) {
    next(handleKnownError(err));
  }
};

export const updateFinanceAccount: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = updateFinanceAccountSchema.parse(req.body);
    const account = await financeService.updateAccount(id, data);
    res.status(200).json({ data: account });
  } catch (err) {
    next(handleKnownError(err));
  }
};

export const deleteFinanceAccount: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const account = await financeService.deleteAccount(id);
    res.status(200).json({ data: account });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const listFinanceChannelTypes: RequestHandler = async (req, res, next) => {
  try {
    const query = listChannelTypeQuerySchema.parse(req.query);
    const channelTypes = await financeService.listChannelTypes(query);
    res.status(200).json({ data: channelTypes });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const createFinanceChannelType: RequestHandler = async (req, res, next) => {
  try {
    const data = createChannelTypeSchema.parse(req.body);
    const channelType = await financeService.createChannelType(data);
    res.status(201).json({ data: channelType });
  } catch (err) {
    next(handleKnownError(err));
  }
};

export const updateFinanceChannelType: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = updateChannelTypeSchema.parse(req.body);
    const channelType = await financeService.updateChannelType(id, data);
    res.status(200).json({ data: channelType });
  } catch (err) {
    next(handleKnownError(err));
  }
};

export const deleteFinanceChannelType: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const channelType = await financeService.deleteChannelType(id);
    res.status(200).json({ data: channelType });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const listFinanceProviders: RequestHandler = async (req, res, next) => {
  try {
    const query = listProviderQuerySchema.parse(req.query);
    const providers = await financeService.listProviders(query);
    res.status(200).json({ data: providers });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const createFinanceProvider: RequestHandler = async (req, res, next) => {
  try {
    const data = createProviderSchema.parse(req.body);
    const provider = await financeService.createProvider(data);
    res.status(201).json({ data: provider });
  } catch (err) {
    next(handleKnownError(err));
  }
};

export const updateFinanceProvider: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = updateProviderSchema.parse(req.body);
    const provider = await financeService.updateProvider(id, data);
    res.status(200).json({ data: provider });
  } catch (err) {
    next(handleKnownError(err));
  }
};

export const deleteFinanceProvider: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const provider = await financeService.deleteProvider(id);
    res.status(200).json({ data: provider });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const listFinanceTemplates: RequestHandler = async (req, res, next) => {
  try {
    const query = listTemplateQuerySchema.parse(req.query);
    const templates = await financeService.listTemplates(query);
    res.status(200).json({ data: templates });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const getFinanceTemplate: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const template = await financeService.getTemplate(id);
    res.status(200).json({ data: template });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const resolveFinanceTemplate: RequestHandler = async (req, res, next) => {
  try {
    const query = listTemplateQuerySchema.required({ category: true, provider: true }).parse(req.query);
    const template = await financeService.resolveTemplate(query.category, query.provider);
    res.status(200).json({ data: template });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const createFinanceTemplate: RequestHandler = async (req, res, next) => {
  try {
    const data = createTemplateSchema.parse(req.body);
    const template = await financeService.createTemplate(data);
    res.status(201).json({ data: template });
  } catch (err) {
    next(handleKnownError(err));
  }
};

export const updateFinanceTemplate: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = updateTemplateSchema.parse(req.body);
    const template = await financeService.updateTemplate(id, data);
    res.status(200).json({ data: template });
  } catch (err) {
    next(handleKnownError(err));
  }
};

export const deleteFinanceTemplate: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const template = await financeService.deleteTemplate(id);
    res.status(200).json({ data: template });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const listFinanceDefinitions: RequestHandler = async (req, res, next) => {
  try {
    const query = listDefinitionQuerySchema.parse(req.query);
    const definitions = await financeService.listDefinitions(query);
    res.status(200).json({ data: definitions });
  } catch (err) {
    next(handleZodError(err));
  }
};

export const createFinanceDefinition: RequestHandler = async (req, res, next) => {
  try {
    const data = createDefinitionSchema.parse(req.body);
    const definition = await financeService.createDefinition(data);
    res.status(201).json({ data: definition });
  } catch (err) {
    next(handleKnownError(err));
  }
};

export const updateFinanceDefinition: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = updateDefinitionSchema.parse(req.body);
    const definition = await financeService.updateDefinition(id, data);
    res.status(200).json({ data: definition });
  } catch (err) {
    next(handleKnownError(err));
  }
};

export const deleteFinanceDefinition: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const definition = await financeService.deleteDefinition(id);
    res.status(200).json({ data: definition });
  } catch (err) {
    next(handleZodError(err));
  }
};
