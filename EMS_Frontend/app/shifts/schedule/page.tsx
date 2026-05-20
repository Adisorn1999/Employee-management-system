"use client";

import { AxiosError } from "axios";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  LogIn,
  LogOut,
  Pencil,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/lib/auth-store";
import { useToast } from "@/components/ui/toast";
import {
  checkIn,
  checkOut,
  listAttendance,
  updateAttendance,
} from "@/services/attendance.service";
import { listDepartments } from "@/services/department.service";
import { listEmployees } from "@/services/employee.service";
import { listLeaves } from "@/services/leave.service";
import { listOffDays } from "@/services/off-day.service";
import {
  changeShift,
  listShiftSchedules,
  listShifts,
} from "@/services/shift.service";
import type {
  AttendanceRecord,
  Employee,
  Shift,
  ShiftScheduleDayType,
  ShiftScheduleSource,
  ShiftSchedule,
} from "@/types/employee";

type SelectedCell = {
  employee: Employee;
  workDate: string;
  schedule?: ShiftSchedule;
  isVirtualDefaultSchedule?: boolean;
};

type ScheduleAttendanceRow = SelectedCell & {
  attendance?: AttendanceRecord;
  status: "OFF" | "MONTHLY_OFF" | "EXTRA_OFF" | "SPECIAL_OFF" | "LEAVE" | "Not checked in" | "Working" | "Completed";
};

type StoredAttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "HALF_DAY" | "OVERTIME";
type EditAttendanceStatus = StoredAttendanceStatus | "WORKING" | "COMPLETED";

type ShiftChangeForm = {
  employeeId: string;
  employeeLabel: string;
  currentWorkDate: string;
  effectiveDate: string;
  newShiftId: string;
  rotationOffDate: string;
  reason: string;
};

type AttendanceEditForm = {
  checkInAt: string;
  checkOutAt: string;
  lateMinutes: string;
  overtimeMinutes: string;
  workMinutes: string;
  attendanceStatus: EditAttendanceStatus;
  manualOverride: boolean;
  note: string;
  adjustmentReason: string;
};

const EMPLOYEE_FETCH_PAGE_SIZE = 100;
const ROWS_PER_PAGE_OPTIONS = [20, 50, 100] as const;
const STORED_ATTENDANCE_STATUSES: StoredAttendanceStatus[] = [
  "PRESENT",
  "LATE",
  "ABSENT",
  "HALF_DAY",
  "OVERTIME",
];

function toDateInputValue(date?: Date | string | null) {
  const parsedDate = date instanceof Date ? date : new Date(date ?? "");

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const localDate = new Date(
    parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60_000,
  );

  return localDate.toISOString().slice(0, 10);
}

function getTodayDateInputValue() {
  return toDateInputValue(new Date());
}

function isDateInputValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

function getDaysInclusive(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const days: string[] = [];

  for (
    const date = new Date(start);
    date.getTime() <= end.getTime();
    date.setDate(date.getDate() + 1)
  ) {
    days.push(toDateInputValue(date));
  }

  return days;
}

function isDateBefore(value: string, compareTo: string) {
  return new Date(`${value}T00:00:00`).getTime() < new Date(`${compareTo}T00:00:00`).getTime();
}

function formatDay(value: string) {
  if (!isDateInputValue(value)) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toDateTimeInputValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  return new Date(value).toISOString();
}

function minutesFromClock(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function combineDateAndClock(workDate: string, time: string) {
  return new Date(`${workDate}T${time}`);
}

function minutesBetweenDates(from: Date, to: Date) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60_000));
}

function getShiftWindow(workDate: string, shift?: Shift | null) {
  if (!shift) {
    return null;
  }

  const start = combineDateAndClock(workDate, shift.startTime);
  const end = combineDateAndClock(workDate, shift.endTime);

  if (minutesFromClock(shift.endTime) <= minutesFromClock(shift.startTime)) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
}

function calculateAttendanceEditValues(
  row: ScheduleAttendanceRow | null,
  checkInAtValue: string,
  checkOutAtValue: string,
) {
  const checkInAt = checkInAtValue ? new Date(checkInAtValue) : null;
  const checkOutAt = checkOutAtValue ? new Date(checkOutAtValue) : null;
  const shiftWindow = row ? getShiftWindow(row.workDate, row.schedule?.shift) : null;

  if (!checkInAt || Number.isNaN(checkInAt.getTime()) || !shiftWindow) {
    return {
      lateMinutes: "0",
      overtimeMinutes: "0",
      workMinutes: "0",
      attendanceStatus: "WORKING" as EditAttendanceStatus,
    };
  }

  const lateMinutes = minutesBetweenDates(shiftWindow.start, checkInAt);
  const overtimeMinutes =
    checkOutAt && !Number.isNaN(checkOutAt.getTime())
      ? minutesBetweenDates(shiftWindow.end, checkOutAt)
      : 0;
  const workMinutes =
    checkOutAt && !Number.isNaN(checkOutAt.getTime())
      ? minutesBetweenDates(checkInAt, checkOutAt)
      : 0;
  const attendanceStatus: EditAttendanceStatus = !checkOutAt
    ? "WORKING"
    : overtimeMinutes > 0
      ? "OVERTIME"
      : "COMPLETED";

  return {
    lateMinutes: String(lateMinutes),
    overtimeMinutes: String(overtimeMinutes),
    workMinutes: String(workMinutes),
    attendanceStatus,
  };
}

function toStoredAttendanceStatus(status: EditAttendanceStatus): StoredAttendanceStatus {
  if (status === "WORKING" || status === "COMPLETED") {
    return "PRESENT";
  }

  return status;
}

function getScheduleKey(employeeId: string, workDate: string) {
  return `${employeeId}:${workDate}`;
}

function getScheduleDate(schedule: ShiftSchedule) {
  return schedule.workDate.slice(0, 10);
}

function getAttendanceDate(attendance: AttendanceRecord) {
  return attendance.shiftSchedule?.workDate?.slice(0, 10);
}

function getDateKey(value: string) {
  return value.slice(0, 10);
}

function dayAfter(value: string) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return toDateInputValue(date);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;
    return typeof message === "string" ? message : fallback;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  return fallback;
}

function getEmployeeLabel(employee: Employee) {
  return `${employee.name} (${employee.prefix}-${employee.employeeNo})`;
}

function createDefaultShiftSchedule(employee: Employee, workDate: string): ShiftSchedule | undefined {
  if (!employee.defaultShift) {
    return undefined;
  }

  return {
    id: `default:${employee.id}:${workDate}`,
    employeeId: employee.id,
    shiftId: employee.defaultShift.id,
    workDate,
    dayType: "WORKDAY",
    source: "DEFAULT_SHIFT",
    employee,
    shift: employee.defaultShift,
  };
}

function getUnifiedStatus(
  schedule?: ShiftSchedule,
  attendance?: AttendanceRecord,
): ScheduleAttendanceRow["status"] {
  if (schedule?.dayType === "ROTATION_OFF") {
    return "OFF";
  }

  if (schedule?.dayType === "MONTHLY_OFF") {
    return "MONTHLY_OFF";
  }

  if (schedule?.dayType === "EXTRA_OFF") {
    return "EXTRA_OFF";
  }

  if (schedule?.dayType === "SPECIAL_OFF") {
    return "SPECIAL_OFF";
  }

  if (schedule?.dayType === "LEAVE") {
    return "LEAVE";
  }

  if (!schedule?.shift) {
    return "OFF";
  }

  if (!attendance?.checkInAt) {
    return "Not checked in";
  }

  if (!attendance.checkOutAt) {
    return "Working";
  }

  return "Completed";
}

function getDayType(schedule?: ShiftSchedule): ShiftScheduleDayType {
  return schedule?.dayType ?? (schedule?.shift ? "WORKDAY" : "OFF");
}

function getDayTypeLabel(dayType: ShiftScheduleDayType) {
  const labels: Record<ShiftScheduleDayType, string> = {
    WORKDAY: "WORKDAY",
    OFF: "OFF",
    MONTHLY_OFF: "MONTHLY_OFF",
    EXTRA_OFF: "EXTRA_OFF",
    SPECIAL_OFF: "SPECIAL_OFF",
    HOLIDAY: "HOLIDAY",
    LEAVE: "LEAVE",
    ROTATION_OFF: "ROTATION_OFF",
  };

  return labels[dayType];
}

function getSourceLabel(source?: ShiftScheduleSource) {
  const labels: Record<ShiftScheduleSource, string> = {
    DEFAULT_SHIFT: "Default",
    MANUAL: "Manual",
    MONTHLY_PLAN: "Monthly Plan",
    SHIFT_CHANGE: "Shift Change",
    EMERGENCY_OVERRIDE: "Emergency",
  };

  return source ? labels[source] : "Manual";
}

function DayTypeBadge({ dayType }: { dayType: ShiftScheduleDayType }) {
  const classNameByDayType: Record<ShiftScheduleDayType, string> = {
    WORKDAY: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
    OFF: "bg-slate-100 text-slate-700 hover:bg-slate-100",
    MONTHLY_OFF: "bg-slate-200 text-slate-800 hover:bg-slate-200",
    EXTRA_OFF: "bg-amber-100 text-amber-900 hover:bg-amber-100",
    SPECIAL_OFF: "bg-cyan-100 text-cyan-900 hover:bg-cyan-100",
    HOLIDAY: "bg-sky-100 text-sky-900 hover:bg-sky-100",
    LEAVE: "bg-violet-100 text-violet-900 hover:bg-violet-100",
    ROTATION_OFF: "bg-orange-100 text-orange-900 hover:bg-orange-100",
  };

  return (
    <Badge variant="secondary" className={classNameByDayType[dayType]}>
      {getDayTypeLabel(dayType)}
    </Badge>
  );
}

function SourceBadge({ source }: { source?: ShiftScheduleSource }) {
  return (
    <Badge variant="outline" className="bg-background">
      {getSourceLabel(source)}
    </Badge>
  );
}

function StatusBadge({ status }: { status: ScheduleAttendanceRow["status"] }) {
  const classNameByStatus = {
    OFF: "bg-slate-100 text-slate-700 hover:bg-slate-100",
    MONTHLY_OFF: "bg-slate-200 text-slate-800 hover:bg-slate-200",
    EXTRA_OFF: "bg-amber-100 text-amber-900 hover:bg-amber-100",
    SPECIAL_OFF: "bg-cyan-100 text-cyan-900 hover:bg-cyan-100",
    LEAVE: "bg-violet-100 text-violet-900 hover:bg-violet-100",
    "Not checked in": "bg-amber-100 text-amber-900 hover:bg-amber-100",
    Working: "bg-blue-100 text-blue-900 hover:bg-blue-100",
    Completed: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
  };

  return (
    <Badge variant="secondary" className={classNameByStatus[status]}>
      {status}
    </Badge>
  );
}

export default function ShiftSchedulePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const canLoadScheduleData = hasHydrated && Boolean(accessToken);
  const today = getTodayDateInputValue();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [appliedDateRange, setAppliedDateRange] = useState({
    startDate: today,
    endDate: today,
  });
  const [departmentId, setDepartmentId] = useState("");
  const [search, setSearch] = useState("");
  const [shiftFilterId, setShiftFilterId] = useState("");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] =
    useState<(typeof ROWS_PER_PAGE_OPTIONS)[number]>(20);
  const [selectedAttendance, setSelectedAttendance] =
    useState<AttendanceRecord | null>(null);
  const [selectedAttendanceRow, setSelectedAttendanceRow] =
    useState<ScheduleAttendanceRow | null>(null);
  const [attendanceEditForm, setAttendanceEditForm] = useState<AttendanceEditForm>({
    checkInAt: "",
    checkOutAt: "",
    lateMinutes: "0",
    overtimeMinutes: "0",
    workMinutes: "0",
    attendanceStatus: "WORKING",
    manualOverride: false,
    note: "",
    adjustmentReason: "",
  });
  const [isChangeDialogOpen, setIsChangeDialogOpen] = useState(false);
  const [shiftChangeForm, setShiftChangeForm] = useState<ShiftChangeForm>({
    employeeId: "",
    employeeLabel: "",
    currentWorkDate: getTodayDateInputValue(),
    effectiveDate: getTodayDateInputValue(),
    newShiftId: "",
    rotationOffDate: "",
    reason: "",
  });
  const scheduleLoadErrorToastRef = useRef("");
  const offDayOverlayErrorToastRef = useRef("");

  const scheduleStartDate = appliedDateRange.startDate;
  const scheduleEndDate = appliedDateRange.endDate;
  const dateRangeError = useMemo(() => {
    if (!startDate) {
      return "Start date is required.";
    }

    if (!endDate) {
      return "End date is required.";
    }

    if (!isDateInputValue(startDate)) {
      return "Start date is invalid.";
    }

    if (!isDateInputValue(endDate)) {
      return "End date is invalid.";
    }

    if (isDateBefore(endDate, startDate)) {
      return "End date cannot be before start date.";
    }

    return "";
  }, [endDate, startDate]);
  const days = useMemo(
    () => getDaysInclusive(scheduleStartDate, scheduleEndDate),
    [scheduleEndDate, scheduleStartDate],
  );

  const employeesQuery = useQuery({
    queryKey: ["employees", "shift-schedule", { departmentId, search }],
    enabled: canLoadScheduleData,
    queryFn: () =>
      listEmployees({
        page: 1,
        limit: EMPLOYEE_FETCH_PAGE_SIZE,
        isActive: "true",
        departmentId: departmentId || undefined,
        search: search.trim() || undefined,
      }),
  });
  const employeeTotalPages = employeesQuery.data?.meta.totalPages ?? 1;
  const remainingEmployeePages = useMemo(
    () =>
      Array.from(
        { length: Math.max(0, employeeTotalPages - 1) },
        (_, index) => index + 2,
      ),
    [employeeTotalPages],
  );
  const additionalEmployeesQueries = useQueries({
    queries: remainingEmployeePages.map((page) => ({
      queryKey: ["employees", "shift-schedule", { departmentId, search, page }],
      enabled: canLoadScheduleData && Boolean(employeesQuery.data),
      queryFn: () =>
        listEmployees({
          page,
          limit: EMPLOYEE_FETCH_PAGE_SIZE,
          isActive: "true" as const,
          departmentId: departmentId || undefined,
          search: search.trim() || undefined,
        }),
    })),
  });

  const departmentsQuery = useQuery({
    queryKey: ["departments", "shift-schedule-filter"],
    enabled: canLoadScheduleData,
    queryFn: () => listDepartments({ page: 1, limit: 100, isActive: "true" }),
  });

  const shiftsQuery = useQuery({
    queryKey: ["shifts", "active"],
    enabled: canLoadScheduleData,
    queryFn: () => listShifts({ isActive: "true" }),
  });

  const schedulesQuery = useQuery({
    queryKey: [
      "shift-schedules",
      { fromDate: scheduleStartDate, toDate: scheduleEndDate },
    ],
    enabled: canLoadScheduleData,
    queryFn: () =>
      listShiftSchedules({ fromDate: scheduleStartDate, toDate: scheduleEndDate }),
  });

  const attendanceQuery = useQuery({
    queryKey: ["attendance", { fromDate: scheduleStartDate, toDate: scheduleEndDate }],
    enabled: canLoadScheduleData,
    queryFn: () =>
      listAttendance({ fromDate: scheduleStartDate, toDate: scheduleEndDate }),
  });

  const offDaysQuery = useQuery({
    queryKey: ["off-days", "schedule", { fromDate: scheduleStartDate, toDate: scheduleEndDate }],
    enabled: canLoadScheduleData,
    queryFn: () =>
      listOffDays({
        status: "APPROVED",
        fromDate: scheduleStartDate,
        toDate: scheduleEndDate,
      }),
    retry: false,
  });

  const leavesQuery = useQuery({
    queryKey: ["leaves", "schedule", { fromDate: scheduleStartDate, toDate: scheduleEndDate }],
    enabled: canLoadScheduleData,
    queryFn: () =>
      listLeaves({
        status: "APPROVED",
        fromDate: scheduleStartDate,
        toDate: scheduleEndDate,
      }),
    retry: false,
  });

  const checkInMutation = useMutation({
    mutationFn: checkIn,
    onSuccess: (attendance) => {
      queryClient.setQueriesData<AttendanceRecord[]>(
        { queryKey: ["attendance"] },
        (existingAttendances) => {
          if (!existingAttendances) {
            return existingAttendances;
          }

          const attendanceDate = getAttendanceDate(attendance);
          const updatedAttendances = existingAttendances.filter((existingAttendance) => {
            const existingAttendanceDate = getAttendanceDate(existingAttendance);

            return (
              existingAttendance.id !== attendance.id &&
              existingAttendance.shiftScheduleId !== attendance.shiftScheduleId &&
              !(
                attendanceDate &&
                existingAttendanceDate === attendanceDate &&
                existingAttendance.employeeId === attendance.employeeId
              )
            );
          });

          return [attendance, ...updatedAttendances];
        },
      );
      toast({
        title: "Checked in",
        description: `${attendance.employee?.name ?? "Employee"} is now working.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Unable to check in",
        description: getErrorMessage(error, "Check the schedule and try again."),
        variant: "destructive",
      });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: checkOut,
    onSuccess: (attendance) => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast({
        title: "Checked out",
        description: `${attendance.employee?.name ?? "Employee"} attendance is completed.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Unable to check out",
        description: getErrorMessage(error, "Check the attendance and try again."),
        variant: "destructive",
      });
    },
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateAttendance>[1] }) =>
      updateAttendance(id, payload),
    onSuccess: (attendance) => {
      queryClient.setQueriesData<AttendanceRecord[]>(
        { queryKey: ["attendance"] },
        (existingAttendances) => {
          if (!existingAttendances) {
            return existingAttendances;
          }

          return existingAttendances.map((existingAttendance) =>
            existingAttendance.id === attendance.id ? attendance : existingAttendance,
          );
        },
      );
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast({
        title: "Attendance updated",
        description: `${attendance.employee?.name ?? "Employee"} attendance was saved.`,
      });
      setSelectedAttendanceRow(null);
    },
    onError: (error) => {
      toast({
        title: "Unable to update attendance",
        description: getErrorMessage(error, "Check the attendance details and try again."),
        variant: "destructive",
      });
    },
  });

  const changeShiftMutation = useMutation({
    mutationFn: changeShift,
    onSuccess: (schedule) => {
      queryClient.invalidateQueries({ queryKey: ["shift-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast({
        title: "Shift changed",
        description: `${schedule.employee?.name ?? "Employee"} now has a shift change on ${getScheduleDate(schedule)}.`,
      });
      setIsChangeDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title:
          error instanceof AxiosError && error.response?.status === 409
            ? "Attendance conflict"
            : "Unable to change shift",
        description: getErrorMessage(
          error,
          "Check the shift change details and try again.",
        ),
        variant: "destructive",
      });
    },
  });

  const hasAdditionalEmployeesError = additionalEmployeesQueries.some(
    (query) => query.isError,
  );
  const isLoadingAdditionalEmployees = additionalEmployeesQueries.some(
    (query) => query.isLoading,
  );

  useEffect(() => {
    if (
      employeesQuery.isError ||
      hasAdditionalEmployeesError ||
      departmentsQuery.isError ||
      shiftsQuery.isError ||
      schedulesQuery.isError ||
      attendanceQuery.isError
    ) {
      const signature = [
        employeesQuery.isError ? "employees" : "",
        hasAdditionalEmployeesError ? "employees-extra" : "",
        departmentsQuery.isError ? "departments" : "",
        shiftsQuery.isError ? "shifts" : "",
        schedulesQuery.isError ? "schedules" : "",
        attendanceQuery.isError ? "attendance" : "",
      ].join("|");

      if (scheduleLoadErrorToastRef.current === signature) {
        return;
      }

      scheduleLoadErrorToastRef.current = signature;
      toast({
        title: "Unable to load schedule and attendance",
        description: "Check your session and backend API.",
        variant: "destructive",
      });
    }
  }, [
    attendanceQuery.isError,
    departmentsQuery.isError,
    employeesQuery.isError,
    hasAdditionalEmployeesError,
    schedulesQuery.isError,
    shiftsQuery.isError,
    toast,
  ]);

  useEffect(() => {
    if (!offDaysQuery.isError && !leavesQuery.isError) {
      return;
    }

    const signature = [
      offDaysQuery.isError ? "off-days" : "",
      leavesQuery.isError ? "leaves" : "",
      scheduleStartDate,
      scheduleEndDate,
    ].join("|");

    if (offDayOverlayErrorToastRef.current === signature) {
      return;
    }

    offDayOverlayErrorToastRef.current = signature;
    toast({
      title: "Off day and leave overlay unavailable",
      description: getErrorMessage(
        offDaysQuery.error ?? leavesQuery.error,
        "Run the latest migration and seed, then refresh this page.",
      ),
    });
  }, [
    offDaysQuery.error,
    offDaysQuery.isError,
    leavesQuery.error,
    leavesQuery.isError,
    scheduleEndDate,
    scheduleStartDate,
    toast,
  ]);

  const employees = useMemo(
    () => [
      ...(employeesQuery.data?.data ?? []),
      ...additionalEmployeesQueries.flatMap((query) => query.data?.data ?? []),
    ],
    [additionalEmployeesQueries, employeesQuery.data],
  );
  const departments = departmentsQuery.data?.data ?? [];
  const shifts = shiftsQuery.data ?? [];

  const schedulesByCell = useMemo(() => {
    const map = new Map<string, ShiftSchedule>();

    for (const schedule of schedulesQuery.data ?? []) {
      map.set(
        getScheduleKey(schedule.employeeId, getScheduleDate(schedule)),
        schedule,
      );
    }

    return map;
  }, [schedulesQuery.data]);

  const attendanceBySchedule = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();

    for (const attendance of attendanceQuery.data ?? []) {
      map.set(attendance.shiftScheduleId, attendance);

      const attendanceDate = getAttendanceDate(attendance);
      if (attendanceDate) {
        map.set(getScheduleKey(attendance.employeeId, attendanceDate), attendance);
      }
    }

    return map;
  }, [attendanceQuery.data]);

  const offDayTypesByEmployee = useMemo(() => {
    const map = new Map<string, Map<string, ShiftScheduleDayType>>();

    for (const offDay of offDaysQuery.data?.data ?? []) {
      const employeeDates = map.get(offDay.employeeId) ?? new Map<string, ShiftScheduleDayType>();
      employeeDates.set(getDateKey(offDay.offDate), offDay.type as ShiftScheduleDayType);
      map.set(offDay.employeeId, employeeDates);
    }

    return map;
  }, [offDaysQuery.data]);

  const leaveDatesByEmployee = useMemo(() => {
    const map = new Map<string, Set<string>>();

    for (const leave of leavesQuery.data ?? []) {
      const dates = map.get(leave.employeeId) ?? new Set<string>();
      for (let date = getDateKey(leave.startDate); date <= getDateKey(leave.endDate); date = dayAfter(date)) {
        dates.add(date);
      }
      map.set(leave.employeeId, dates);
    }

    return map;
  }, [leavesQuery.data]);

  function resolveRowSchedule(schedule: ShiftSchedule | undefined, employeeId: string, workDate: string) {
    if (!schedule || schedule.dayType === "ROTATION_OFF") {
      return schedule;
    }

    const offDayType = offDayTypesByEmployee.get(employeeId)?.get(workDate);

    if (offDayType) {
      return { ...schedule, dayType: offDayType };
    }

    if (leaveDatesByEmployee.get(employeeId)?.has(workDate)) {
      return { ...schedule, dayType: "LEAVE" as ShiftScheduleDayType };
    }

    return schedule;
  }

  const rows = useMemo<ScheduleAttendanceRow[]>(() => {
    const allRows = employees.flatMap((employee) =>
      days.map((workDate) => {
        const persistedSchedule = schedulesByCell.get(
          getScheduleKey(employee.id, workDate),
        );
        const defaultSchedule = persistedSchedule
          ? undefined
          : createDefaultShiftSchedule(employee, workDate);
        const schedule = resolveRowSchedule(
          persistedSchedule ?? defaultSchedule,
          employee.id,
          workDate,
        );
        const attendance = schedule
          ? attendanceBySchedule.get(schedule.id) ?? attendanceBySchedule.get(getScheduleKey(employee.id, workDate))
          : attendanceBySchedule.get(getScheduleKey(employee.id, workDate));

        return {
          employee,
          workDate,
          schedule,
          isVirtualDefaultSchedule: Boolean(defaultSchedule),
          attendance,
          status: getUnifiedStatus(schedule, attendance),
        };
      }),
    );

    return allRows.filter((row) => {
      if (shiftFilterId && row.schedule?.shiftId !== shiftFilterId) {
        return false;
      }

      if (attendanceStatusFilter && row.status !== attendanceStatusFilter) {
        return false;
      }

      return true;
    });
  }, [
    attendanceBySchedule,
    attendanceStatusFilter,
    days,
    employees,
    leaveDatesByEmployee,
    offDayTypesByEmployee,
    schedulesByCell,
    shiftFilterId,
  ]);
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const effectiveCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = totalRows === 0 ? 0 : (effectiveCurrentPage - 1) * rowsPerPage;
  const pageEndIndex = Math.min(pageStartIndex + rowsPerPage, totalRows);
  const visibleRows = useMemo(
    () => rows.slice(pageStartIndex, pageEndIndex),
    [pageEndIndex, pageStartIndex, rows],
  );
  const canGoToPreviousPage = effectiveCurrentPage > 1;
  const canGoToNextPage = effectiveCurrentPage < totalPages;

  useEffect(() => {
    setCurrentPage(1);
  }, [
    attendanceStatusFilter,
    departmentId,
    rowsPerPage,
    scheduleEndDate,
    scheduleStartDate,
    search,
    shiftFilterId,
  ]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const isLoading =
    employeesQuery.isLoading ||
    isLoadingAdditionalEmployees ||
    departmentsQuery.isLoading ||
    shiftsQuery.isLoading ||
    schedulesQuery.isLoading ||
    attendanceQuery.isLoading ||
    offDaysQuery.isLoading ||
    leavesQuery.isLoading;
  function openChangeShiftDialog(row: ScheduleAttendanceRow) {
    setShiftChangeForm({
      employeeId: row.employee.id,
      employeeLabel: getEmployeeLabel(row.employee),
      currentWorkDate: row.workDate,
      effectiveDate: row.workDate,
      newShiftId: row?.schedule?.shiftId ?? shifts[0]?.id ?? "",
      rotationOffDate: "",
      reason: row?.schedule?.reason ?? "",
    });
    setIsChangeDialogOpen(true);
  }

  function openEditAttendanceDialog(row: ScheduleAttendanceRow) {
    if (!row.attendance) {
      return;
    }

    const checkInAt = toDateTimeInputValue(row.attendance.checkInAt);
    const checkOutAt = toDateTimeInputValue(row.attendance.checkOutAt);
    const calculatedValues = calculateAttendanceEditValues(row, checkInAt, checkOutAt);

    setSelectedAttendanceRow(row);
    setAttendanceEditForm({
      checkInAt,
      checkOutAt,
      lateMinutes: row.attendance.manualOverride
        ? String(row.attendance.lateMinutes ?? 0)
        : calculatedValues.lateMinutes,
      overtimeMinutes: row.attendance.manualOverride
        ? String(row.attendance.overtimeMinutes ?? 0)
        : calculatedValues.overtimeMinutes,
      workMinutes: String(row.attendance.workMinutes ?? calculatedValues.workMinutes),
      attendanceStatus: row.attendance.manualOverride
        ? (row.attendance.status as StoredAttendanceStatus)
        : calculatedValues.attendanceStatus,
      manualOverride: Boolean(row.attendance.manualOverride),
      note: row.attendance.note ?? "",
      adjustmentReason: row.attendance.adjustmentReason ?? "",
    });
  }

  function handleCheckIn(row: ScheduleAttendanceRow) {
    checkInMutation.mutate({ employeeId: row.employee.id, workDate: row.workDate });
  }

  function handleCheckOut(row: ScheduleAttendanceRow) {
    checkOutMutation.mutate({ employeeId: row.employee.id });
  }

  function goToPreviousPage() {
    setCurrentPage((page) => Math.max(1, page - 1));
  }

  function goToNextPage() {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  }

  function handleRowsPerPageChange(value: string) {
    setRowsPerPage(Number(value) as (typeof ROWS_PER_PAGE_OPTIONS)[number]);
  }

  function applyDateSearch() {
    if (dateRangeError) {
      toast({
        title: "Invalid date range",
        description: dateRangeError,
        variant: "destructive",
      });
      return;
    }

    setAppliedDateRange({ startDate, endDate });
  }

  function clearDateSearch() {
    const todayValue = getTodayDateInputValue();
    setStartDate(todayValue);
    setEndDate(todayValue);
    setAppliedDateRange({ startDate: todayValue, endDate: todayValue });
  }

  function handleChangeShift() {
    if (
      !shiftChangeForm.employeeId ||
      !shiftChangeForm.effectiveDate ||
      !shiftChangeForm.newShiftId ||
      !shiftChangeForm.reason.trim()
    ) {
      return;
    }

    changeShiftMutation.mutate({
      employeeId: shiftChangeForm.employeeId,
      effectiveDate: shiftChangeForm.effectiveDate,
      newShiftId: shiftChangeForm.newShiftId,
      rotationOffDate: shiftChangeForm.rotationOffDate || undefined,
      reason: shiftChangeForm.reason.trim(),
    });
  }

  function handleUpdateAttendance() {
    const row = selectedAttendanceRow;
    const attendance = row?.attendance;
    if (!attendance) {
      return;
    }

    const dayType = getDayType(row.schedule);
    const cannotEditTimes = ["OFF", "ROTATION_OFF", "MONTHLY_OFF", "EXTRA_OFF", "SPECIAL_OFF", "LEAVE"].includes(dayType);
    const payload = {
      checkInAt: !cannotEditTimes && attendanceEditForm.checkInAt
        ? toIsoDateTime(attendanceEditForm.checkInAt)
        : undefined,
      checkOutAt: !cannotEditTimes && attendanceEditForm.checkOutAt
        ? toIsoDateTime(attendanceEditForm.checkOutAt)
        : cannotEditTimes
          ? undefined
          : null,
      manualOverride: attendanceEditForm.manualOverride,
      lateMinutes: attendanceEditForm.manualOverride
        ? Number(attendanceEditForm.lateMinutes || 0)
        : undefined,
      overtimeMinutes: attendanceEditForm.manualOverride
        ? Number(attendanceEditForm.overtimeMinutes || 0)
        : undefined,
      status: attendanceEditForm.manualOverride
        ? toStoredAttendanceStatus(attendanceEditForm.attendanceStatus)
        : undefined,
      note: attendanceEditForm.note.trim() || null,
      adjustmentReason: attendanceEditForm.adjustmentReason.trim() || null,
    };

    updateAttendanceMutation.mutate({ id: attendance.id, payload });
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">
            Schedule & Attendance
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review scheduled shifts and attendance status in one operational
            view.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Unified schedule table</CardTitle>
              <CardDescription>
                {formatDay(scheduleStartDate)} - {formatDay(scheduleEndDate)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>
                {employees.length} employees, {totalRows} schedule rows
              </span>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[180px_180px_auto]">
            <div>
              <Label htmlFor="schedule-start-date">Start date</Label>
              <Input
                id="schedule-start-date"
                className="mt-2"
                type="date"
                value={startDate}
                required
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="schedule-end-date">End date</Label>
              <Input
                id="schedule-end-date"
                className="mt-2"
                type="date"
                value={endDate}
                required
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                type="button"
                className="mt-2"
                disabled={Boolean(dateRangeError)}
                onClick={applyDateSearch}
              >
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                onClick={clearDateSearch}
              >
                Clear
              </Button>
            </div>
            {dateRangeError && (
              <p className="text-sm text-destructive md:col-span-3">
                {dateRangeError}
              </p>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-[220px_minmax(220px,1fr)_180px_220px]">
            <div>
              <Label htmlFor="department-filter">Department</Label>
              <Select
                id="department-filter"
                className="mt-2"
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
              >
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="employee-search">Employee</Label>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="employee-search"
                  className="pl-9"
                  placeholder="ค้นหา Prefix, รหัสพนักงาน หรือชื่อ"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="shift-filter">Shift</Label>
              <Select
                id="shift-filter"
                className="mt-2"
                value={shiftFilterId}
                onChange={(event) => setShiftFilterId(event.target.value)}
              >
                <option value="">All shifts</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.code} - {shift.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="attendance-status-filter">Attendance status</Label>
              <Select
                id="attendance-status-filter"
                className="mt-2"
                value={attendanceStatusFilter}
                onChange={(event) => setAttendanceStatusFilter(event.target.value)}
              >
                <option value="">All statuses</option>
                <option value="Not checked in">Not checked in</option>
                <option value="Working">Working</option>
                <option value="Completed">Completed</option>
                <option value="OFF">OFF</option>
                <option value="MONTHLY_OFF">MONTHLY_OFF</option>
                <option value="EXTRA_OFF">EXTRA_OFF</option>
                <option value="SPECIAL_OFF">SPECIAL_OFF</option>
                <option value="LEAVE">LEAVE</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-56">Employee</TableHead>
                  <TableHead className="min-w-32">Work date</TableHead>
                  <TableHead className="min-w-40">Shift name</TableHead>
                  <TableHead className="min-w-36">Day type</TableHead>
                  <TableHead className="min-w-32">Source</TableHead>
                  <TableHead className="min-w-32">Shift time</TableHead>
                  <TableHead className="min-w-36">Check in</TableHead>
                  <TableHead className="min-w-36">Check out</TableHead>
                  <TableHead className="min-w-36">Attendance status</TableHead>
                  <TableHead className="min-w-28 text-right">Late</TableHead>
                  <TableHead className="min-w-28 text-right">Overtime</TableHead>
                  <TableHead className="min-w-72 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={12}
                      className="h-28 text-center text-muted-foreground"
                    >
                      Loading schedule and attendance...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={12}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No employees found for the selected filters.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  visibleRows.map((row) => {
                    const shift = row.schedule?.shift;
                    const dayType = getDayType(row.schedule);
                    const isPunchDisabledDay = ["ROTATION_OFF", "OFF", "MONTHLY_OFF", "EXTRA_OFF", "SPECIAL_OFF", "LEAVE"].includes(dayType);
                    const canCheckIn = Boolean(shift) && !row.attendance && !isPunchDisabledDay;
                    const canCheckOut = Boolean(
                      row.attendance?.checkInAt && !row.attendance?.checkOutAt && !isPunchDisabledDay,
                    );

                    return (
                      <TableRow
                        key={getScheduleKey(row.employee.id, row.workDate)}
                      >
                        <TableCell>
                          <div className="font-medium">{row.employee.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.employee.employeeNo}
                            {row.employee.department?.name
                              ? ` - ${row.employee.department.name}`
                              : ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatDay(row.workDate)}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.workDate}
                          </div>
                        </TableCell>
                        <TableCell>
                          {dayType === "ROTATION_OFF" ? (
                            <div className="space-y-1">
                              <div className="font-medium text-orange-900">
                                Rotation Off
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Free day
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Not counted as monthly off
                              </div>
                            </div>
                          ) : shift ? (
                            <div className="space-y-1">
                              <Badge
                                variant="secondary"
                                className="bg-slate-100 text-slate-800 hover:bg-slate-100"
                              >
                                {shift.code}
                              </Badge>
                              <div className="text-sm">{shift.name}</div>
                            </div>
                          ) : (
                            <span className="font-medium text-muted-foreground">
                              OFF
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DayTypeBadge dayType={dayType} />
                        </TableCell>
                        <TableCell>
                          {row.schedule ? (
                            <SourceBadge source={row.schedule.source} />
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {shift ? `${shift.startTime}-${shift.endTime}` : "-"}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(row.attendance?.checkInAt)}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(row.attendance?.checkOutAt)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          {row.attendance?.lateMinutes ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.attendance?.overtimeMinutes ?? 0}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openChangeShiftDialog(row)}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Change
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!row.attendance}
                              onClick={() => openEditAttendanceDialog(row)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Attendance
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!canCheckIn || checkInMutation.isPending}
                              onClick={() => handleCheckIn(row)}
                            >
                              <LogIn className="mr-2 h-4 w-4" />
                              Check in
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!canCheckOut || checkOutMutation.isPending}
                              onClick={() => handleCheckOut(row)}
                            >
                              <LogOut className="mr-2 h-4 w-4" />
                              Check out
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              aria-label="View attendance"
                              disabled={!row.attendance}
                              onClick={() =>
                                setSelectedAttendance(row.attendance ?? null)
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 border-t px-1 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {totalRows === 0 ? "0-0" : `${pageStartIndex + 1}-${pageEndIndex}`} of {totalRows}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="schedule-rows-per-page"
                  className="whitespace-nowrap text-sm font-normal text-muted-foreground"
                >
                  Rows per page
                </Label>
                <Select
                  id="schedule-rows-per-page"
                  className="h-9 w-24"
                  value={String(rowsPerPage)}
                  onChange={(event) => handleRowsPerPageChange(event.target.value)}
                >
                  {ROWS_PER_PAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Previous page"
                  disabled={!canGoToPreviousPage}
                  onClick={goToPreviousPage}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Next page"
                  disabled={!canGoToNextPage}
                  onClick={goToNextPage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ChangeShiftDialog
        open={isChangeDialogOpen}
        shifts={shifts}
        form={shiftChangeForm}
        isSaving={changeShiftMutation.isPending}
        onOpenChange={setIsChangeDialogOpen}
        onFormChange={setShiftChangeForm}
        onSubmit={handleChangeShift}
      />

      <AttendanceEditDialog
        row={selectedAttendanceRow}
        form={attendanceEditForm}
        isSaving={updateAttendanceMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAttendanceRow(null);
          }
        }}
        onFormChange={setAttendanceEditForm}
        onSubmit={handleUpdateAttendance}
      />

      <AttendanceDialog
        attendance={selectedAttendance}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAttendance(null);
          }
        }}
      />
    </DashboardShell>
  );
}

function ChangeShiftDialog({
  open,
  shifts,
  form,
  isSaving,
  onOpenChange,
  onFormChange,
  onSubmit,
}: {
  open: boolean;
  shifts: Shift[];
  form: ShiftChangeForm;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: ShiftChangeForm) => void;
  onSubmit: () => void;
}) {
  const canSubmit =
    Boolean(form.employeeId) &&
    Boolean(form.effectiveDate) &&
    Boolean(form.newShiftId) &&
    Boolean(form.reason.trim());

  function updateField<Key extends keyof ShiftChangeForm>(
    key: Key,
    value: ShiftChangeForm[Key],
  ) {
    onFormChange({ ...form, [key]: value });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Shift</DialogTitle>
          <DialogDescription>
            Create a shift-change schedule and optional rotation off day.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="change-employee">Employee</Label>
              <Input
                id="change-employee"
                className="mt-2"
                value={form.employeeLabel || "No employee selected"}
                readOnly
              />
            </div>
            <div>
              <Label htmlFor="change-current-work-date">Current work date</Label>
              <Input
                id="change-current-work-date"
                className="mt-2"
                value={form.currentWorkDate}
                readOnly
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="change-effective-date">Effective date</Label>
              <Input
                id="change-effective-date"
                className="mt-2"
                type="date"
                value={form.effectiveDate}
                onChange={(event) =>
                  updateField("effectiveDate", event.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="change-rotation-off-date">Rotation off date</Label>
              <Input
                id="change-rotation-off-date"
                className="mt-2"
                type="date"
                value={form.rotationOffDate}
                onChange={(event) =>
                  updateField("rotationOffDate", event.target.value)
                }
              />
            </div>
          </div>
          <div>
            <Label htmlFor="change-new-shift">New shift</Label>
            <Select
              id="change-new-shift"
              className="mt-2"
              value={form.newShiftId}
              onChange={(event) => updateField("newShiftId", event.target.value)}
            >
              {shifts.length === 0 && <option value="">No active shifts available</option>}
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.code} - {shift.name} ({shift.startTime}-{shift.endTime})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="change-reason">Reason</Label>
            <Textarea
              id="change-reason"
              className="mt-2"
              value={form.reason}
              placeholder="Reason for this shift change"
              onChange={(event) => updateField("reason", event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit || isSaving} onClick={onSubmit}>
            {isSaving ? "Saving..." : "Save change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AttendanceEditDialog({
  row,
  form,
  isSaving,
  onOpenChange,
  onFormChange,
  onSubmit,
}: {
  row: ScheduleAttendanceRow | null;
  form: AttendanceEditForm;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: AttendanceEditForm) => void;
  onSubmit: () => void;
}) {
  const dayType = getDayType(row?.schedule);
  const cannotEditTimes = ["OFF", "ROTATION_OFF", "MONTHLY_OFF", "EXTRA_OFF", "SPECIAL_OFF", "LEAVE"].includes(dayType);
  const checkInTime = form.checkInAt ? new Date(form.checkInAt).getTime() : null;
  const checkOutTime = form.checkOutAt ? new Date(form.checkOutAt).getTime() : null;
  const hasInvalidTimeRange =
    checkInTime !== null &&
    checkOutTime !== null &&
    !Number.isNaN(checkInTime) &&
    !Number.isNaN(checkOutTime) &&
    checkOutTime <= checkInTime;
  const hasInvalidMinutes =
    Number(form.lateMinutes) < 0 ||
    Number(form.overtimeMinutes) < 0 ||
    Number(form.workMinutes) < 0 ||
    !Number.isInteger(Number(form.lateMinutes)) ||
    !Number.isInteger(Number(form.overtimeMinutes)) ||
    !Number.isInteger(Number(form.workMinutes));
  const isAdjustmentReasonMissing =
    form.manualOverride && !form.adjustmentReason.trim();
  const canSubmit =
    Boolean(row?.attendance) &&
    Boolean(form.attendanceStatus) &&
    !hasInvalidTimeRange &&
    !hasInvalidMinutes &&
    !isAdjustmentReasonMissing;

  function updateField<Key extends keyof AttendanceEditForm>(
    key: Key,
    value: AttendanceEditForm[Key],
  ) {
    const nextForm = { ...form, [key]: value };

    if (key === "manualOverride" && value === false) {
      onFormChange({
        ...nextForm,
        ...calculateAttendanceEditValues(row, nextForm.checkInAt, nextForm.checkOutAt),
      });
      return;
    }

    if (key === "manualOverride" && value === true) {
      onFormChange({
        ...nextForm,
        attendanceStatus: STORED_ATTENDANCE_STATUSES.includes(
          nextForm.attendanceStatus as StoredAttendanceStatus,
        )
          ? nextForm.attendanceStatus
          : "PRESENT",
      });
      return;
    }

    if (
      !nextForm.manualOverride &&
      (key === "checkInAt" || key === "checkOutAt")
    ) {
      onFormChange({
        ...nextForm,
        ...calculateAttendanceEditValues(row, nextForm.checkInAt, nextForm.checkOutAt),
      });
      return;
    }

    if (nextForm.manualOverride && (key === "checkInAt" || key === "checkOutAt")) {
      onFormChange({
        ...nextForm,
        workMinutes: calculateAttendanceEditValues(
          row,
          nextForm.checkInAt,
          nextForm.checkOutAt,
        ).workMinutes,
      });
      return;
    }

    onFormChange(nextForm);
  }

  return (
    <Dialog open={Boolean(row)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Attendance</DialogTitle>
          <DialogDescription>
            {row
              ? `${getEmployeeLabel(row.employee)} - ${formatDay(row.workDate)}`
              : "Attendance record"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {cannotEditTimes && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Times are locked for {dayType} days. Status, minutes, and notes can still be adjusted with manual override.
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="attendance-check-in">Check in at</Label>
              <Input
                id="attendance-check-in"
                className="mt-2"
                type="datetime-local"
                value={form.checkInAt}
                disabled={cannotEditTimes}
                onChange={(event) => updateField("checkInAt", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="attendance-check-out">Check out at</Label>
              <Input
                id="attendance-check-out"
                className="mt-2"
                type="datetime-local"
                value={form.checkOutAt}
                disabled={cannotEditTimes}
                onChange={(event) => updateField("checkOutAt", event.target.value)}
              />
            </div>
          </div>
          {hasInvalidTimeRange && (
            <p className="text-sm text-destructive">
              Check-out time must be after check-in time.
            </p>
          )}
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={form.manualOverride}
              onChange={(event) => updateField("manualOverride", event.target.checked)}
            />
            Manual override
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="attendance-late-minutes">Late minutes</Label>
              <Input
                id="attendance-late-minutes"
                className="mt-2"
                type="number"
                min={0}
                step={1}
                value={form.lateMinutes}
                disabled={!form.manualOverride}
                onChange={(event) => updateField("lateMinutes", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="attendance-overtime-minutes">Overtime minutes</Label>
              <Input
                id="attendance-overtime-minutes"
                className="mt-2"
                type="number"
                min={0}
                step={1}
                value={form.overtimeMinutes}
                disabled={!form.manualOverride}
                onChange={(event) => updateField("overtimeMinutes", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="attendance-work-minutes">Work minutes</Label>
              <Input
                id="attendance-work-minutes"
                className="mt-2"
                type="number"
                min={0}
                step={1}
                value={form.workMinutes}
                readOnly
              />
            </div>
          </div>
          <div>
            <Label htmlFor="attendance-status">Attendance status</Label>
            <Select
              id="attendance-status"
              className="mt-2"
              value={form.attendanceStatus}
              disabled={!form.manualOverride}
              onChange={(event) =>
                updateField("attendanceStatus", event.target.value as EditAttendanceStatus)
              }
            >
              {!form.manualOverride && (
                <>
                  <option value="WORKING">WORKING</option>
                  <option value="COMPLETED">COMPLETED</option>
                </>
              )}
              {STORED_ATTENDANCE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
          {hasInvalidMinutes && (
            <p className="text-sm text-destructive">
              Late, overtime, and work minutes must be whole numbers of 0 or more.
            </p>
          )}
          {isAdjustmentReasonMissing && (
            <p className="text-sm text-destructive">
              Adjustment reason is required when manual override is enabled.
            </p>
          )}
          <div>
            <Label htmlFor="attendance-note">Note</Label>
            <Textarea
              id="attendance-note"
              className="mt-2"
              value={form.note}
              placeholder="Optional note"
              onChange={(event) => updateField("note", event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="attendance-adjustment-reason">Adjustment reason</Label>
            <Textarea
              id="attendance-adjustment-reason"
              className="mt-2"
              value={form.adjustmentReason}
              placeholder="Optional reason for audit"
              onChange={(event) => updateField("adjustmentReason", event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || isSaving}
            onClick={onSubmit}
          >
            {isSaving ? "Saving..." : "Save attendance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AttendanceDialog({
  attendance,
  onOpenChange,
}: {
  attendance: AttendanceRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  const schedule = attendance?.shiftSchedule;
  const shift = schedule?.shift;

  return (
    <Dialog open={Boolean(attendance)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attendance details</DialogTitle>
          <DialogDescription>
            {attendance?.employee
              ? getEmployeeLabel(attendance.employee)
              : "Attendance record"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <DetailItem label="Work date" value={schedule ? getScheduleDate(schedule) : "-"} />
          <DetailItem label="Shift" value={shift ? `${shift.name} (${shift.code})` : "-"} />
          <DetailItem label="Shift time" value={shift ? `${shift.startTime}-${shift.endTime}` : "-"} />
          <DetailItem label="Backend status" value={attendance?.status ?? "-"} />
          <DetailItem label="Check in" value={formatDateTime(attendance?.checkInAt)} />
          <DetailItem label="Check out" value={formatDateTime(attendance?.checkOutAt)} />
          <DetailItem label="Late minutes" value={String(attendance?.lateMinutes ?? 0)} />
          <DetailItem label="Overtime minutes" value={String(attendance?.overtimeMinutes ?? 0)} />
          <DetailItem label="Work minutes" value={String(attendance?.workMinutes ?? 0)} />
          <DetailItem label="Manual override" value={attendance?.manualOverride ? "Yes" : "No"} />
          <DetailItem label="Note" value={attendance?.note || "-"} />
          <DetailItem label="Adjustment reason" value={attendance?.adjustmentReason || "-"} />
          <DetailItem label="Updated by" value={attendance?.updatedBy || "-"} />
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
