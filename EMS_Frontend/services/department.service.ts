import { api } from "@/lib/api";
import type { DataResponse, Department, PaginatedResponse } from "@/types/employee";

export type DepartmentListParams = {
  search?: string;
  page?: number;
  limit?: number;
  isActive?: "true" | "false";
};

export type DepartmentPayload = {
  name: string;
  description?: string;
  isActive?: boolean;
};

export async function listDepartments(params: DepartmentListParams = {}) {
  const { data } = await api.get<PaginatedResponse<Department>>("/departments", { params });
  return data;
}

export async function createDepartment(payload: DepartmentPayload) {
  const { data } = await api.post<DataResponse<Department>>("/departments", payload);
  return data.data;
}

export async function updateDepartment(id: string, payload: DepartmentPayload) {
  const { data } = await api.patch<DataResponse<Department>>(`/departments/${id}`, payload);
  return data.data;
}

export async function deleteDepartment(id: string) {
  const { data } = await api.delete<DataResponse<Department>>(`/departments/${id}`);
  return data.data;
}
