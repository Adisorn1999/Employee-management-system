import { api } from "@/lib/api";
import type { DataResponse, LeaveRequest, LeaveStatus, LeaveType } from "@/types/employee";

export type LeaveListParams = {
  employeeId?: string;
  status?: LeaveStatus;
  leaveType?: LeaveType;
  fromDate?: string;
  toDate?: string;
};

export type LeavePayload = {
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string | null;
};

export async function listLeaves(params: LeaveListParams = {}) {
  const { data } = await api.get<DataResponse<LeaveRequest[]>>("/leaves", { params });
  return data.data;
}

export async function createLeave(payload: LeavePayload) {
  const { data } = await api.post<DataResponse<LeaveRequest>>("/leaves", payload);
  return data.data;
}

export async function updateLeave(id: string, payload: Partial<LeavePayload>) {
  const { data } = await api.patch<DataResponse<LeaveRequest>>(`/leaves/${id}`, payload);
  return data.data;
}

export async function approveLeave(id: string) {
  const { data } = await api.post<DataResponse<LeaveRequest>>(`/leaves/${id}/approve`);
  return data.data;
}

export async function rejectLeave(id: string, rejectReason: string) {
  const { data } = await api.post<DataResponse<LeaveRequest>>(`/leaves/${id}/reject`, { rejectReason });
  return data.data;
}

export async function cancelLeave(id: string) {
  const { data } = await api.post<DataResponse<LeaveRequest>>(`/leaves/${id}/cancel`);
  return data.data;
}
