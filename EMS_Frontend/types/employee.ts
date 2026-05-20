export type Department = {
  id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    employees: number;
    positions?: number;
  };
};

export type JobPosition = {
  id: string;
  name: string;
  description?: string | null;
  departmentId?: string | null;
  department?: Department | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    employees: number;
  };
};

export type Employee = {
  id: string;
  prefix: string;
  employeeNo: string;
  name: string;
  email?: string | null;
  telegramUsername?: string | null;
  phone?: string | null;
  position?: string | null;
  departmentId?: string | null;
  positionId?: string | null;
  department?: Department | null;
  jobPosition?: JobPosition | null;
  defaultShiftId?: string | null;
  defaultShift?: Shift | null;
  baseSalary?: number | string | null;
  mealAllowance?: number | string | null;
  allowance?: number | string | null;
  lateRatePerMin?: number | string | null;
  employmentType?: string | null;
  hiredDate?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Shift = {
  id: string;
  code: "DAY" | "NIGHT";
  name: string;
  startTime: string;
  endTime: string;
  color?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ShiftScheduleDayType =
  | "WORKDAY"
  | "OFF"
  | "MONTHLY_OFF"
  | "EXTRA_OFF"
  | "SPECIAL_OFF"
  | "HOLIDAY"
  | "LEAVE"
  | "ROTATION_OFF";

export type ShiftScheduleSource =
  | "DEFAULT_SHIFT"
  | "MANUAL"
  | "MONTHLY_PLAN"
  | "SHIFT_CHANGE"
  | "EMERGENCY_OVERRIDE";

export type ShiftSchedule = {
  id: string;
  employeeId: string;
  shiftId?: string | null;
  workDate: string;
  assignedBy?: string;
  note?: string | null;
  dayType?: ShiftScheduleDayType;
  source?: ShiftScheduleSource;
  reason?: string | null;
  createdBy?: string | null;
  approvedBy?: string | null;
  createdAt?: string;
  employee?: Employee;
  shift?: Shift | null;
};

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  shiftScheduleId: string;
  checkInAt: string;
  checkOutAt?: string | null;
  status: string;
  lateMinutes: number;
  overtimeMinutes: number;
  workMinutes: number;
  note?: string | null;
  manualOverride?: boolean;
  updatedBy?: string | null;
  adjustmentReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  employee?: Employee;
  shiftSchedule?: ShiftSchedule;
};

export type HolidayType = "COMPANY" | "PUBLIC" | "SPECIAL";

export type Holiday = {
  id: string;
  name: string;
  date: string;
  type: HolidayType;
  isPaid: boolean;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type LeaveType = "SICK" | "PERSONAL" | "VACATION" | "UNPAID" | "OTHER";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type LeaveRequest = {
  id: string;
  employeeId: string;
  employee?: Employee;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: LeaveStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  rejectReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type OffDayType = "MONTHLY_OFF" | "EXTRA_OFF" | "ROTATION_OFF" | "SPECIAL_OFF";
export type OffDayStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type MonthlyOffDay = {
  id: string;
  employeeId: string;
  employee?: Employee;
  offDate: string;
  type: OffDayType;
  reason?: string | null;
  status: OffDayStatus;
  isOverQuota: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  rejectReason?: string | null;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EmployeePayload = {
  prefix: string;
  employeeNo: string;
  name: string;
  email?: string;
  telegramUsername?: string;
  phone?: string;
  position?: string;
  departmentId?: string | null;
  positionId?: string | null;
  defaultShiftId?: string | null;
  baseSalary?: number;
  mealAllowance?: number;
  allowance?: number;
  lateRatePerMin?: number;
  isActive?: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type DataResponse<T> = {
  data: T;
};
