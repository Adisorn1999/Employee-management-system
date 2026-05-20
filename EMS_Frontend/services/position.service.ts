import { api } from "@/lib/api";
import type { DataResponse, JobPosition, PaginatedResponse } from "@/types/employee";

export type PositionListParams = {
  search?: string;
  page?: number;
  limit?: number;
  isActive?: "true" | "false";
  departmentId?: string;
};

export type PositionPayload = {
  name: string;
  departmentId?: string;
  isActive?: boolean;
};

export async function listPositions(params: PositionListParams = {}) {
  const { data } = await api.get<PaginatedResponse<JobPosition>>("/positions", { params });
  return data;
}

export async function createPosition(payload: PositionPayload) {
  const { data } = await api.post<DataResponse<JobPosition>>("/positions", payload);
  return data.data;
}

export async function updatePosition(id: string, payload: PositionPayload) {
  const { data } = await api.patch<DataResponse<JobPosition>>(`/positions/${id}`, payload);
  return data.data;
}

export async function deletePosition(id: string) {
  const { data } = await api.delete<DataResponse<JobPosition>>(`/positions/${id}`);
  return data.data;
}
