import { api } from "@/lib/api";
import type {
  DataResponse,
  Department,
  Employee,
  EmployeePayload,
  JobPosition,
  PaginatedResponse,
} from "@/types/employee";

export type EmployeeListParams = {
  search?: string;
  page?: number;
  limit?: number;
  isActive?: "true" | "false";
};

type ReferenceListParams = {
  search?: string;
  page?: number;
  limit?: number;
  isActive?: "true" | "false";
};

type PositionListParams = ReferenceListParams & {
  departmentId?: string;
};

export async function listEmployees(params: EmployeeListParams = {}) {
  const { data } = await api.get<PaginatedResponse<Employee>>("/employees", { params });
  return data;
}

export async function listDepartments(params: ReferenceListParams = {}) {
  const { data } = await api.get<PaginatedResponse<Department>>("/departments", { params });
  return data;
}

export async function listPositions(params: PositionListParams = {}) {
  const { data } = await api.get<PaginatedResponse<JobPosition>>("/positions", { params });
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
