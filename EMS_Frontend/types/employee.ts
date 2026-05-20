export type Department = {
  id: string;
  name: string;
};

export type JobPosition = {
  id: string;
  name: string;
};

export type Employee = {
  id: string;
  prefix: string;
  employeeNo: string;
  name: string;
  email?: string | null;
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
  phone?: string;
  position?: string;
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
