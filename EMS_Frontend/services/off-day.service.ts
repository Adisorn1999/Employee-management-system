import { api } from "@/lib/api";
import type { DataResponse, MonthlyOffDay, OffDayStatus, OffDayType } from "@/types/employee";

export type OffDayListParams = {
  employeeId?: string;
  status?: OffDayStatus;
  type?: OffDayType;
  fromDate?: string;
  toDate?: string;
};

export type OffDayPayload = {
  employeeId: string;
  offDate: string;
  type: OffDayType;
  reason?: string | null;
};

export type OffDayResponse = DataResponse<MonthlyOffDay> & {
  warning?: string;
};

export type OffDayListResponse = DataResponse<MonthlyOffDay[]> & {
  meta?: { quota: number };
};

export async function listOffDays(params: OffDayListParams = {}) {
  const { data } = await api.get<OffDayListResponse>("/off-days", { params });
  return data;
}

export async function createOffDay(payload: OffDayPayload) {
  const { data } = await api.post<OffDayResponse>("/off-days", payload);
  return data;
}

export async function updateOffDay(id: string, payload: Partial<OffDayPayload>) {
  const { data } = await api.patch<OffDayResponse>(`/off-days/${id}`, payload);
  return data;
}

export async function approveOffDay(id: string) {
  const { data } = await api.post<OffDayResponse>(`/off-days/${id}/approve`);
  return data;
}

export async function rejectOffDay(id: string, rejectReason: string) {
  const { data } = await api.post<DataResponse<MonthlyOffDay>>(`/off-days/${id}/reject`, { rejectReason });
  return data.data;
}

export async function cancelOffDay(id: string) {
  const { data } = await api.post<DataResponse<MonthlyOffDay>>(`/off-days/${id}/cancel`);
  return data.data;
}
