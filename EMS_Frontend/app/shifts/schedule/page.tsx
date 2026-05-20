"use client";

import { AxiosError } from "axios";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useToast } from "@/components/ui/toast";
import {
  checkIn,
  checkOut,
  listAttendance,
} from "@/services/attendance.service";
import { listDepartments } from "@/services/department.service";
import { listEmployees } from "@/services/employee.service";
import {
  changeShift,
  createShiftSchedule,
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
  status: "OFF" | "HOLIDAY" | "LEAVE" | "Not checked in" | "Working" | "Completed";
};

type ShiftChangeForm = {
  employeeId: string;
  employeeLabel: string;
  currentWorkDate: string;
  effectiveDate: string;
  newShiftId: string;
  rotationOffDate: string;
  reason: string;
};

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

function addDays(value: string, days: number) {
  const safeValue = isDateInputValue(value) ? value : getTodayDateInputValue();
  const date = new Date(`${safeValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
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

function getScheduleKey(employeeId: string, workDate: string) {
  return `${employeeId}:${workDate}`;
}

function getScheduleDate(schedule: ShiftSchedule) {
  return schedule.workDate.slice(0, 10);
}

function getAttendanceDate(attendance: AttendanceRecord) {
  return attendance.shiftSchedule?.workDate?.slice(0, 10);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;
    return typeof message === "string" ? message : fallback;
  }

  return fallback;
}

function getEmployeeLabel(employee: Employee) {
  return `${employee.name} (${employee.employeeNo})`;
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

  if (schedule?.dayType === "HOLIDAY") {
    return "HOLIDAY";
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
    HOLIDAY: "bg-sky-100 text-sky-900 hover:bg-sky-100",
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
  const [startDate, setStartDate] = useState(() => getTodayDateInputValue());
  const [departmentId, setDepartmentId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [selectedAttendance, setSelectedAttendance] =
    useState<AttendanceRecord | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [note, setNote] = useState("");
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

  const scheduleStartDate = isDateInputValue(startDate)
    ? startDate
    : getTodayDateInputValue();
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_item, index) =>
        addDays(scheduleStartDate, index),
      ),
    [scheduleStartDate],
  );
  const endDate = days[6];

  const employeesQuery = useQuery({
    queryKey: ["employees", "shift-schedule", { departmentId, search }],
    queryFn: () =>
      listEmployees({
        page: 1,
        limit: 100,
        isActive: "true",
        departmentId: departmentId || undefined,
        search: search.trim() || undefined,
      }),
  });

  const departmentsQuery = useQuery({
    queryKey: ["departments", "shift-schedule-filter"],
    queryFn: () => listDepartments({ page: 1, limit: 100, isActive: "true" }),
  });

  const shiftsQuery = useQuery({
    queryKey: ["shifts", "active"],
    queryFn: () => listShifts({ isActive: "true" }),
  });

  const schedulesQuery = useQuery({
    queryKey: [
      "shift-schedules",
      { fromDate: scheduleStartDate, toDate: endDate },
    ],
    queryFn: () =>
      listShiftSchedules({ fromDate: scheduleStartDate, toDate: endDate }),
  });

  const attendanceQuery = useQuery({
    queryKey: ["attendance", { fromDate: scheduleStartDate, toDate: endDate }],
    queryFn: () =>
      listAttendance({ fromDate: scheduleStartDate, toDate: endDate }),
  });

  const assignMutation = useMutation({
    mutationFn: createShiftSchedule,
    onSuccess: (schedule) => {
      queryClient.invalidateQueries({ queryKey: ["shift-schedules"] });
      toast({
        title: "Shift assigned",
        description: `${schedule.employee?.name ?? "Employee"} is scheduled for ${getScheduleDate(schedule)}.`,
      });
      setSelectedCell(null);
    },
    onError: (error) => {
      toast({
        title:
          error instanceof AxiosError && error.response?.status === 409
            ? "Schedule already exists"
            : "Unable to assign shift",
        description: getErrorMessage(
          error,
          "Check the schedule details and try again.",
        ),
        variant: "destructive",
      });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: checkIn,
    onSuccess: (attendance) => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["shift-schedules"] });
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

  useEffect(() => {
    if (
      employeesQuery.isError ||
      departmentsQuery.isError ||
      shiftsQuery.isError ||
      schedulesQuery.isError ||
      attendanceQuery.isError
    ) {
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
    schedulesQuery.isError,
    shiftsQuery.isError,
    toast,
  ]);

  const employees = employeesQuery.data?.data ?? [];
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

  const rows = useMemo<ScheduleAttendanceRow[]>(() => {
    return employees.flatMap((employee) =>
      days.map((workDate) => {
        const persistedSchedule = schedulesByCell.get(
          getScheduleKey(employee.id, workDate),
        );
        const defaultSchedule = persistedSchedule
          ? undefined
          : createDefaultShiftSchedule(employee, workDate);
        const schedule = persistedSchedule ?? defaultSchedule;
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
  }, [attendanceBySchedule, days, employees, schedulesByCell]);

  const isLoading =
    employeesQuery.isLoading ||
    departmentsQuery.isLoading ||
    shiftsQuery.isLoading ||
    schedulesQuery.isLoading ||
    attendanceQuery.isLoading;

  function openAssignDialog(
    employee: Employee,
    workDate: string,
    schedule?: ShiftSchedule,
    isVirtualDefaultSchedule = false,
  ) {
    setSelectedCell({ employee, workDate, schedule, isVirtualDefaultSchedule });
    setSelectedShiftId(schedule?.shiftId ?? employee.defaultShiftId ?? shifts[0]?.id ?? "");
    setNote(isVirtualDefaultSchedule ? "" : schedule?.note ?? "");
  }

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

  function handleAssign() {
    if (!selectedCell || !selectedShiftId) {
      return;
    }

    assignMutation.mutate({
      employeeId: selectedCell.employee.id,
      shiftId: selectedShiftId,
      workDate: selectedCell.workDate,
      note: note.trim() || undefined,
    });
  }

  function handleCheckIn(row: ScheduleAttendanceRow) {
    checkInMutation.mutate({ employeeId: row.employee.id });
  }

  function handleCheckOut(row: ScheduleAttendanceRow) {
    checkOutMutation.mutate({ employeeId: row.employee.id });
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous 7 days"
            onClick={() => setStartDate(addDays(scheduleStartDate, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next 7 days"
            onClick={() => setStartDate(addDays(scheduleStartDate, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Unified schedule table</CardTitle>
              <CardDescription>
                {formatDay(scheduleStartDate)} - {formatDay(endDate)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>
                {employees.length} employees, {rows.length} schedule rows
              </span>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[180px_220px_minmax(220px,1fr)]">
            <div>
              <Label htmlFor="schedule-start-date">Start date</Label>
              <Input
                id="schedule-start-date"
                className="mt-2"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
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
                  placeholder="Search by name or code"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
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
                {!isLoading && employees.length === 0 && (
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
                  rows.map((row) => {
                    const shift = row.schedule?.shift;
                    const dayType = getDayType(row.schedule);
                    const isPunchDisabledDay = ["ROTATION_OFF", "OFF", "HOLIDAY", "LEAVE"].includes(dayType);
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
                              onClick={() =>
                                openAssignDialog(
                                  row.employee,
                                  row.workDate,
                                  row.schedule,
                                  row.isVirtualDefaultSchedule,
                                )
                              }
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Assign
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
        </CardContent>
      </Card>

      <AssignShiftDialog
        open={Boolean(selectedCell)}
        selectedCell={selectedCell}
        shifts={shifts}
        selectedShiftId={selectedShiftId}
        note={note}
        isSaving={assignMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCell(null);
          }
        }}
        onShiftChange={setSelectedShiftId}
        onNoteChange={setNote}
        onSubmit={handleAssign}
      />

      <ChangeShiftDialog
        open={isChangeDialogOpen}
        shifts={shifts}
        form={shiftChangeForm}
        isSaving={changeShiftMutation.isPending}
        onOpenChange={setIsChangeDialogOpen}
        onFormChange={setShiftChangeForm}
        onSubmit={handleChangeShift}
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

function AssignShiftDialog({
  open,
  selectedCell,
  shifts,
  selectedShiftId,
  note,
  isSaving,
  onOpenChange,
  onShiftChange,
  onNoteChange,
  onSubmit,
}: {
  open: boolean;
  selectedCell: SelectedCell | null;
  shifts: Shift[];
  selectedShiftId: string;
  note: string;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onShiftChange: (shiftId: string) => void;
  onNoteChange: (note: string) => void;
  onSubmit: () => void;
}) {
  const hasExistingSchedule = Boolean(selectedCell?.schedule) && !selectedCell?.isVirtualDefaultSchedule;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign shift</DialogTitle>
          <DialogDescription>
            {selectedCell
              ? `${getEmployeeLabel(selectedCell.employee)} - ${formatDay(selectedCell.workDate)}`
              : "Select a shift."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {hasExistingSchedule && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              This employee already has a schedule for this date. Submitting
              again may be rejected by the backend.
            </div>
          )}
          <div>
            <Label htmlFor="shift-select">Shift</Label>
            <Select
              id="shift-select"
              className="mt-2"
              value={selectedShiftId}
              onChange={(event) => onShiftChange(event.target.value)}
            >
              {shifts.length === 0 && (
                <option value="">No active shifts available</option>
              )}
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.code} - {shift.name} ({shift.startTime}-{shift.endTime}
                  )
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="shift-note">Note</Label>
            <Textarea
              id="shift-note"
              className="mt-2"
              value={note}
              placeholder="Optional note"
              onChange={(event) => onNoteChange(event.target.value)}
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
            disabled={!selectedShiftId || isSaving}
            onClick={onSubmit}
          >
            {isSaving ? "Saving..." : "Save schedule"}
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
          <DetailItem label="Note" value={attendance?.note || "-"} />
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
