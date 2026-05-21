import type { PaginatedResponse } from "@/types/employee";

export type FinanceAccountCategory = "PERSONAL_BANK" | "CORPORATE_BANK" | "WALLET" | "GATEWAY";
export type FinanceAccountStatus = "ACTIVE" | "INACTIVE" | "EXPIRED" | "SUSPENDED";
export type FinanceChannelTypeCode = "BANK" | "TRUEWALLET" | "GATEWAY";
export type FinanceFieldType = "text" | "textarea" | "number" | "date" | "select" | "email" | "phone" | "password";

export type FinanceAccountFieldValue = {
  id?: string;
  accountId?: string;
  fieldKey: string;
  labelSnapshot: string;
  value: string;
  sortOrder: number;
  isActive?: boolean;
  createdAt?: string;
};

export type AccountLine = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type FinanceChannelType = {
  id: string;
  code: FinanceChannelTypeCode;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type FinanceProvider = {
  id: string;
  channelTypeId: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  channelType?: FinanceChannelType;
};

export type FinanceAccount = {
  id: string;
  category: FinanceAccountCategory;
  provider: string;
  displayName: string;
  accountName?: string | null;
  accountNumber?: string | null;
  accountLineId?: string | null;
  accountLine?: AccountLine | null;
  status: FinanceAccountStatus;
  startDate?: string | null;
  expireDate?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  fieldValues: FinanceAccountFieldValue[];
};

export type FinanceFieldTemplate = {
  id: string;
  category: FinanceAccountCategory;
  provider: string;
  channelTypeId?: string | null;
  providerId?: string | null;
  channelType?: FinanceChannelType | null;
  providerRecord?: FinanceProvider | null;
  name: string;
  isActive: boolean;
  createdAt: string;
  fieldDefinitions: FinanceFieldDefinition[];
};

export type FinanceFieldDefinition = {
  id: string;
  templateId: string;
  fieldKey: string;
  labelTh: string;
  labelEn: string;
  fieldType: FinanceFieldType;
  placeholder?: string | null;
  options?: string[] | null;
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
  template?: FinanceFieldTemplate;
};

export type FinanceAccountListResponse = PaginatedResponse<FinanceAccount>;
