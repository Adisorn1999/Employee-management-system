import { api } from "@/lib/api";
import type { AttendanceRecord, DataResponse } from "@/types/employee";

export type AttendanceListParams = {
  employeeId?: string;
  status?: "PRESENT" | "LATE" | "ABSENT" | "HALF_DAY" | "OVERTIME";
  fromDate?: string;
  toDate?: string;
};

export type AttendancePunchPayload = {
  employeeId: string;
  note?: string;
};

export async function listAttendance(params: AttendanceListParams = {}) {
  const { data } = await api.get<DataResponse<AttendanceRecord[]>>(
    "/attendance",
    { params },
  );
  return data.data;
}

export async function checkIn(payload: AttendancePunchPayload) {
  const { data } = await api.post<DataResponse<AttendanceRecord>>(
    "/attendance/check-in",
    payload,
  );
  return data.data;
}

export async function checkOut(payload: AttendancePunchPayload) {
  const { data } = await api.post<DataResponse<AttendanceRecord>>(
    "/attendance/check-out",
    payload,
  );
  return data.data;
}
