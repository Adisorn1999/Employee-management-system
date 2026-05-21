"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAccountLine,
  createFinanceAccount,
  createFinanceChannelType,
  createFinanceDefinition,
  createFinanceProvider,
  createFinanceTemplate,
  deleteAccountLine,
  deleteFinanceAccount,
  deleteFinanceChannelType,
  deleteFinanceDefinition,
  deleteFinanceProvider,
  deleteFinanceTemplate,
  listAccountLines,
  listFinanceAccounts,
  listFinanceChannelTypes,
  listFinanceDefinitions,
  listFinanceProviders,
  listFinanceTemplates,
  resolveFinanceTemplate,
  updateAccountLine,
  updateFinanceAccount,
  updateFinanceChannelType,
  updateFinanceDefinition,
  updateFinanceProvider,
  updateFinanceTemplate,
  type AccountLinePayload,
  type FinanceAccountPayload,
  type FinanceAccountListParams,
  type FinanceChannelTypePayload,
  type FinanceProviderPayload,
} from "@/services/finance.service";
import type { FinanceAccountCategory } from "@/types/finance";

export const financeKeys = {
  all: ["finance"] as const,
  accounts: (params: FinanceAccountListParams) => ["finance", "accounts", params] as const,
  accountLines: (params: object = {}) => ["finance", "account-lines", params] as const,
  channelTypes: (params: object = {}) => ["finance", "channel-types", params] as const,
  providers: (params: object = {}) => ["finance", "providers", params] as const,
  templates: (params: object = {}) => ["finance", "templates", params] as const,
  definitions: (params: object = {}) => ["finance", "definitions", params] as const,
  resolvedTemplate: (category?: FinanceAccountCategory, provider?: string) =>
    ["finance", "templates", "resolve", category, provider] as const,
};

export function useFinanceAccounts(params: FinanceAccountListParams) {
  const queryClient = useQueryClient();
  const accountsQuery = useQuery({
    queryKey: financeKeys.accounts(params),
    queryFn: () => listFinanceAccounts(params),
  });

  const createMutation = useMutation({
    mutationFn: createFinanceAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FinanceAccountPayload }) => updateFinanceAccount(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteFinanceAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });

  return { accountsQuery, createMutation, updateMutation, deleteMutation };
}

export function useAccountLines(params: Parameters<typeof listAccountLines>[0] = {}) {
  const queryClient = useQueryClient();
  const accountLinesQuery = useQuery({
    queryKey: financeKeys.accountLines(params),
    queryFn: () => listAccountLines(params),
  });
  const createMutation = useMutation({
    mutationFn: createAccountLine,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AccountLinePayload> }) => updateAccountLine(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteAccountLine,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
  return { accountLinesQuery, createMutation, updateMutation, deleteMutation };
}

export function useFinanceChannelTypes(params: Parameters<typeof listFinanceChannelTypes>[0] = {}) {
  const queryClient = useQueryClient();
  const channelTypesQuery = useQuery({
    queryKey: financeKeys.channelTypes(params),
    queryFn: () => listFinanceChannelTypes(params),
  });
  const createMutation = useMutation({
    mutationFn: createFinanceChannelType,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<FinanceChannelTypePayload> }) =>
      updateFinanceChannelType(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteFinanceChannelType,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
  return { channelTypesQuery, createMutation, updateMutation, deleteMutation };
}

export function useFinanceProviders(params: Parameters<typeof listFinanceProviders>[0] = {}) {
  const queryClient = useQueryClient();
  const providersQuery = useQuery({
    queryKey: financeKeys.providers(params),
    queryFn: () => listFinanceProviders(params),
  });
  const createMutation = useMutation({
    mutationFn: createFinanceProvider,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateFinanceProvider>[1] }) =>
      updateFinanceProvider(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteFinanceProvider,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
  return { providersQuery, createMutation, updateMutation, deleteMutation };
}

export function useFinanceTemplates(params: object = {}) {
  const queryClient = useQueryClient();
  const templatesQuery = useQuery({
    queryKey: financeKeys.templates(params),
    queryFn: () => listFinanceTemplates(params),
  });
  const createMutation = useMutation({
    mutationFn: createFinanceTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateFinanceTemplate>[1] }) =>
      updateFinanceTemplate(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteFinanceTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
  return { templatesQuery, createMutation, updateMutation, deleteMutation };
}

export function useResolvedFinanceTemplate(category?: FinanceAccountCategory, provider?: string) {
  return useQuery({
    queryKey: financeKeys.resolvedTemplate(category, provider),
    queryFn: () => resolveFinanceTemplate(category as FinanceAccountCategory, provider as string),
    enabled: Boolean(category && provider),
  });
}

export function useFinanceDefinitions(params: object = {}) {
  const queryClient = useQueryClient();
  const definitionsQuery = useQuery({
    queryKey: financeKeys.definitions(params),
    queryFn: () => listFinanceDefinitions(params),
  });
  const createMutation = useMutation({
    mutationFn: createFinanceDefinition,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateFinanceDefinition>[1] }) =>
      updateFinanceDefinition(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteFinanceDefinition,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
  return { definitionsQuery, createMutation, updateMutation, deleteMutation };
}
