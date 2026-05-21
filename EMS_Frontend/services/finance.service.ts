import { api } from "@/lib/api";
import type { DataResponse } from "@/types/employee";
import type {
  AccountLine,
  FinanceAccount,
  FinanceAccountCategory,
  FinanceAccountFieldValue,
  FinanceAccountListResponse,
  FinanceAccountStatus,
  FinanceChannelType,
  FinanceChannelTypeCode,
  FinanceFieldDefinition,
  FinanceFieldTemplate,
  FinanceFieldType,
  FinanceProvider,
} from "@/types/finance";

const ACCOUNT_LINES_STORAGE_KEY = "ems-account-lines";

export type FinanceAccountListParams = {
  category?: FinanceAccountCategory;
  provider?: string;
  status?: FinanceAccountStatus;
  accountLineId?: string;
  keyword?: string;
  page?: number;
  limit?: number;
};

export type FinanceAccountPayload = {
  category: FinanceAccountCategory;
  provider: string;
  displayName: string;
  accountName?: string;
  accountNumber?: string;
  accountLineId?: string;
  status?: FinanceAccountStatus;
  startDate?: string;
  expireDate?: string;
  note?: string;
  fields: Omit<FinanceAccountFieldValue, "id" | "accountId" | "createdAt">[];
};

export type FinanceTemplatePayload = {
  providerId: string;
  name: string;
  isActive?: boolean;
};

export type FinanceTemplateListParams = {
  category?: FinanceAccountCategory;
  channelTypeId?: string;
  channelType?: FinanceChannelTypeCode;
  providerId?: string;
  provider?: string;
  isActive?: "true" | "false";
};

export type FinanceChannelTypePayload = {
  code: FinanceChannelTypeCode;
  name: string;
  description?: string;
  isActive?: boolean;
};

export type FinanceProviderPayload = {
  channelTypeId: string;
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
};

export type AccountLinePayload = {
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
};

function isAccountLineApiMissing(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "response" in error &&
      (error as { response?: { status?: number } }).response?.status === 404
  );
}

function readStoredAccountLines() {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(ACCOUNT_LINES_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AccountLine[];
  } catch {
    return [];
  }
}

function writeStoredAccountLines(lines: AccountLine[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCOUNT_LINES_STORAGE_KEY, JSON.stringify(lines));
}

function normalizeFinanceDefinition(definition: FinanceFieldDefinition): FinanceFieldDefinition {
  if (definition.fieldKey !== "lp_usage") return definition;
  return {
    ...definition,
    fieldKey: "usage_target",
    labelTh: "ใช้งาน",
    labelEn: "Usage",
  };
}

function normalizeFinanceTemplate(template: FinanceFieldTemplate): FinanceFieldTemplate {
  return {
    ...template,
    fieldDefinitions: template.fieldDefinitions.map(normalizeFinanceDefinition),
  };
}

export type FinanceDefinitionPayload = {
  templateId: string;
  fieldKey: string;
  labelTh: string;
  labelEn: string;
  fieldType: FinanceFieldType;
  placeholder?: string;
  options?: string[];
  isRequired?: boolean;
  sortOrder?: number;
  isActive?: boolean;
};

export async function listFinanceChannelTypes(params: { isActive?: "true" | "false" } = {}) {
  const { data } = await api.get<DataResponse<FinanceChannelType[]>>("/finance/channel-types", { params });
  return data.data;
}

export async function createFinanceChannelType(payload: FinanceChannelTypePayload) {
  const { data } = await api.post<DataResponse<FinanceChannelType>>("/finance/channel-types", payload);
  return data.data;
}

export async function updateFinanceChannelType(id: string, payload: Partial<FinanceChannelTypePayload>) {
  const { data } = await api.patch<DataResponse<FinanceChannelType>>(`/finance/channel-types/${id}`, payload);
  return data.data;
}

export async function deleteFinanceChannelType(id: string) {
  const { data } = await api.delete<DataResponse<FinanceChannelType>>(`/finance/channel-types/${id}`);
  return data.data;
}

export async function listFinanceProviders(params: { channelTypeId?: string; channelType?: FinanceChannelTypeCode; isActive?: "true" | "false" } = {}) {
  const { data } = await api.get<DataResponse<FinanceProvider[]>>("/finance/providers", { params });
  return data.data;
}

export async function createFinanceProvider(payload: FinanceProviderPayload) {
  const { data } = await api.post<DataResponse<FinanceProvider>>("/finance/providers", payload);
  return data.data;
}

export async function updateFinanceProvider(id: string, payload: Partial<Omit<FinanceProviderPayload, "channelTypeId">>) {
  const { data } = await api.patch<DataResponse<FinanceProvider>>(`/finance/providers/${id}`, payload);
  return data.data;
}

export async function deleteFinanceProvider(id: string) {
  const { data } = await api.delete<DataResponse<FinanceProvider>>(`/finance/providers/${id}`);
  return data.data;
}

export async function listFinanceAccounts(params: FinanceAccountListParams = {}) {
  const { data } = await api.get<FinanceAccountListResponse>("/finance/accounts", { params });
  return data;
}

export async function listAccountLines(params: { isActive?: "true" | "false" } = {}) {
  try {
    const { data } = await api.get<DataResponse<AccountLine[]>>("/finance/account-lines", { params });
    return data.data;
  } catch (error) {
    if (!isAccountLineApiMissing(error)) throw error;
    const lines = readStoredAccountLines();
    if (!params.isActive) return lines;
    return lines.filter((line) => line.isActive === (params.isActive === "true"));
  }
}

export async function createAccountLine(payload: AccountLinePayload) {
  try {
    const { data } = await api.post<DataResponse<AccountLine>>("/finance/account-lines", payload);
    return data.data;
  } catch (error) {
    if (!isAccountLineApiMissing(error)) throw error;
    const now = new Date().toISOString();
    const line: AccountLine = {
      id: crypto.randomUUID(),
      name: payload.name,
      code: payload.code,
      description: payload.description,
      isActive: payload.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    writeStoredAccountLines([line, ...readStoredAccountLines()]);
    return line;
  }
}

export async function updateAccountLine(id: string, payload: Partial<AccountLinePayload>) {
  try {
    const { data } = await api.patch<DataResponse<AccountLine>>(`/finance/account-lines/${id}`, payload);
    return data.data;
  } catch (error) {
    if (!isAccountLineApiMissing(error)) throw error;
    const lines = readStoredAccountLines();
    const updatedLines = lines.map((line) =>
      line.id === id ? { ...line, ...payload, updatedAt: new Date().toISOString() } : line
    );
    writeStoredAccountLines(updatedLines);
    return updatedLines.find((line) => line.id === id) ?? ({ id, ...payload } as AccountLine);
  }
}

export async function deleteAccountLine(id: string) {
  try {
    const { data } = await api.delete<DataResponse<AccountLine>>(`/finance/account-lines/${id}`);
    return data.data;
  } catch (error) {
    if (!isAccountLineApiMissing(error)) throw error;
    const lines = readStoredAccountLines();
    const updatedLines = lines.map((line) =>
      line.id === id ? { ...line, isActive: false, updatedAt: new Date().toISOString() } : line
    );
    writeStoredAccountLines(updatedLines);
    return updatedLines.find((line) => line.id === id) ?? null;
  }
}

export async function createFinanceAccount(payload: FinanceAccountPayload) {
  const { data } = await api.post<DataResponse<FinanceAccount>>("/finance/accounts", payload);
  return data.data;
}

export async function updateFinanceAccount(id: string, payload: FinanceAccountPayload) {
  const { data } = await api.patch<DataResponse<FinanceAccount>>(`/finance/accounts/${id}`, payload);
  return data.data;
}

export async function deleteFinanceAccount(id: string) {
  const { data } = await api.delete<DataResponse<FinanceAccount>>(`/finance/accounts/${id}`);
  return data.data;
}

export async function listFinanceTemplates(params: FinanceTemplateListParams = {}) {
  const { data } = await api.get<DataResponse<FinanceFieldTemplate[]>>("/finance/templates", { params });
  return data.data.map(normalizeFinanceTemplate);
}

export async function resolveFinanceTemplate(category: FinanceAccountCategory, provider: string) {
  const { data } = await api.get<DataResponse<FinanceFieldTemplate | null>>("/finance/templates/resolve", {
    params: { category, provider },
  });
  return data.data ? normalizeFinanceTemplate(data.data) : data.data;
}

export async function createFinanceTemplate(payload: FinanceTemplatePayload) {
  const { data } = await api.post<DataResponse<FinanceFieldTemplate>>("/finance/templates", payload);
  return data.data;
}

export async function updateFinanceTemplate(id: string, payload: Partial<FinanceTemplatePayload>) {
  const { data } = await api.patch<DataResponse<FinanceFieldTemplate>>(`/finance/templates/${id}`, payload);
  return data.data;
}

export async function deleteFinanceTemplate(id: string) {
  const { data } = await api.delete<DataResponse<FinanceFieldTemplate>>(`/finance/templates/${id}`);
  return data.data;
}

export async function listFinanceDefinitions(params: { templateId?: string; category?: FinanceAccountCategory; provider?: string; isActive?: "true" | "false" } = {}) {
  const { data } = await api.get<DataResponse<FinanceFieldDefinition[]>>("/finance/field-definitions", { params });
  return data.data.map(normalizeFinanceDefinition);
}

export async function createFinanceDefinition(payload: FinanceDefinitionPayload) {
  const { data } = await api.post<DataResponse<FinanceFieldDefinition>>("/finance/field-definitions", payload);
  return data.data;
}

export async function updateFinanceDefinition(id: string, payload: Partial<FinanceDefinitionPayload>) {
  const { data } = await api.patch<DataResponse<FinanceFieldDefinition>>(`/finance/field-definitions/${id}`, payload);
  return data.data;
}

export async function deleteFinanceDefinition(id: string) {
  const { data } = await api.delete<DataResponse<FinanceFieldDefinition>>(`/finance/field-definitions/${id}`);
  return data.data;
}
