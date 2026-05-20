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
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  color?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ShiftSchedule = {
  id: string;
  employeeId: string;
  shiftId: string;
  workDate: string;
  assignedBy?: string;
  note?: string | null;
  createdAt?: string;
  employee?: Employee;
  shift?: Shift;
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
  createdAt?: string;
  updatedAt?: string;
  employee?: Employee;
  shiftSchedule?: ShiftSchedule;
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
