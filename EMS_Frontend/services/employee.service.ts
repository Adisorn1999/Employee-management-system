import { api } from "@/lib/api";
import type { DataResponse, Employee, EmployeePayload, PaginatedResponse } from "@/types/employee";

export type EmployeeListParams = {
  search?: string;
  page?: number;
  limit?: number;
  isActive?: "true" | "false";
};

export async function listEmployees(params: EmployeeListParams = {}) {
  const { data } = await api.get<PaginatedResponse<Employee>>("/employees", { params });
  return data;
}

export async function createEmployee(payload: EmployeePayload) {
  const { data } = await api.post<DataResponse<Employee>>("/employees", payload);
  return data.data;
}

export async function updateEmployee(id: string, payload: EmployeePayload) {
  const { data } = await api.patch<DataResponse<Employee>>(`/employees/${id}`, payload);
  return data.data;
}

export async function deleteEmployee(id: string) {
  const { data } = await api.delete<DataResponse<Employee>>(`/employees/${id}`);
  return data.data;
}
