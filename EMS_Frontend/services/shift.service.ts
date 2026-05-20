import { api } from "@/lib/api";
import type { DataResponse, Shift, ShiftSchedule } from "@/types/employee";

export type ShiftListParams = {
  isActive?: "true" | "false";
};

export type ShiftPayload = {
  code: "DAY" | "NIGHT";
  name: string;
  startTime: string;
  endTime: string;
  color?: string;
  isActive?: boolean;
};

export type ScheduleListParams = {
  employeeId?: string;
  shiftId?: string;
  fromDate?: string;
  toDate?: string;
};

export type ShiftSchedulePayload = {
  employeeId: string;
  shiftId: string;
  workDate: string;
  note?: string;
};

export type ShiftChangePayload = {
  employeeId: string;
  effectiveDate: string;
  newShiftId: string;
  rotationOffDate?: string;
  reason: string;
};

export async function listShifts(params: ShiftListParams = {}) {
  const { data } = await api.get<DataResponse<Shift[]>>("/shifts", { params });
  return data.data;
}

export async function createShift(payload: ShiftPayload) {
  const { data } = await api.post<DataResponse<Shift>>("/shifts", payload);
  return data.data;
}

export async function updateShift(id: string, payload: Partial<ShiftPayload>) {
  const { data } = await api.patch<DataResponse<Shift>>(`/shifts/${id}`, payload);
  return data.data;
}

export async function deleteShift(id: string) {
  const { data } = await api.delete<DataResponse<Shift>>(`/shifts/${id}`);
  return data.data;
}

export async function listShiftSchedules(params: ScheduleListParams = {}) {
  const { data } = await api.get<DataResponse<ShiftSchedule[]>>("/shifts/schedules", { params });
  return data.data;
}

export async function createShiftSchedule(payload: ShiftSchedulePayload) {
  const { data } = await api.post<DataResponse<ShiftSchedule>>("/shifts/schedules", payload);
  return data.data;
}

export async function changeShift(payload: ShiftChangePayload) {
  const { data } = await api.post<DataResponse<ShiftSchedule>>("/shifts/change", payload);
  return data.data;
}
