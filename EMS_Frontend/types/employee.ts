export type Department = {
  id: string;
  name: string;
  isActive?: boolean;
};

export type JobPosition = {
  id: string;
  name: string;
  departmentId?: string | null;
  department?: Department | null;
  isActive?: boolean;
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
