"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  updateDepartment,
  type DepartmentListParams,
  type DepartmentPayload,
} from "@/services/department.service";
import type { Department, PaginatedResponse } from "@/types/employee";

export const departmentKeys = {
  all: ["departments"] as const,
  list: (params: DepartmentListParams) => ["departments", params] as const,
};

function updateDepartmentInCache(
  data: PaginatedResponse<Department> | undefined,
  department: Department
): PaginatedResponse<Department> | undefined {
  if (!data) {
    return data;
  }

  return {
    ...data,
    data: data.data.map((item) => (item.id === department.id ? { ...item, ...department } : item)),
  };
}

export function useDepartments(params: DepartmentListParams) {
  const queryClient = useQueryClient();

  const departmentsQuery = useQuery({
    queryKey: departmentKeys.list(params),
    queryFn: () => listDepartments(params),
  });

  const createMutation = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: departmentKeys.all }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DepartmentPayload }) => updateDepartment(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: departmentKeys.all });
      const previousLists = queryClient.getQueriesData<PaginatedResponse<Department>>({
        queryKey: departmentKeys.all,
      });

      queryClient.setQueriesData<PaginatedResponse<Department>>({ queryKey: departmentKeys.all }, (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          data: current.data.map((department) =>
            department.id === id
              ? {
                  ...department,
                  ...payload,
                  description: payload.description ?? null,
                }
              : department
          ),
        };
      });

      return { previousLists };
    },
    onError: (_error, _variables, context) => {
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: (department) => {
      queryClient.setQueriesData<PaginatedResponse<Department>>({ queryKey: departmentKeys.all }, (current) =>
        updateDepartmentInCache(current, department)
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: departmentKeys.all }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: (department) => {
      queryClient.setQueriesData<PaginatedResponse<Department>>({ queryKey: departmentKeys.all }, (current) =>
        updateDepartmentInCache(current, department)
      );
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
    },
  });

  return {
    departmentsQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
