import { AttendanceStatus, Prisma, ShiftScheduleDayType, ShiftScheduleSource } from "@prisma/client";
import { z } from "zod";

import prisma from "../../config/prisma";
import { httpError } from "../../common/utils/errors";
import { attendanceRepository } from "./attendance.repository";
import { checkInSchema, checkOutSchema, listAttendanceQuerySchema, updateAttendanceSchema } from "./attendance.schema";

type CheckInInput = z.infer<typeof checkInSchema>;
type CheckOutInput = z.infer<typeof checkOutSchema>;
type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
type ListAttendanceQuery = z.infer<typeof listAttendanceQuerySchema>;
type ScheduleCandidate = Awaited<ReturnType<typeof attendanceRepository.findSchedulesForEmployeeDates>>[number];
type EmployeeWithDefaultShift = NonNullable<Awaited<ReturnType<typeof attendanceRepository.findEmployeeById>>>;

function dateKeyFromLocalDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateKeyFromDbDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dbDateFromLocalDay(date: Date, dayOffset = 0): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() + dayOffset));
}

function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);

  return hours * 60 + minutes;
}

function combineWorkDateAndTime(workDate: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);

  return new Date(workDate.getUTCFullYear(), workDate.getUTCMonth(), workDate.getUTCDate(), hours, minutes);
}

function getScheduleWindow(schedule: Pick<ScheduleCandidate, "workDate" | "shift">): { start: Date; end: Date } {
  if (!schedule.shift) {
    throw httpError("Workday schedule has no shift assigned", 400);
  }

  const start = combineWorkDateAndTime(schedule.workDate, schedule.shift.startTime);
  const end = combineWorkDateAndTime(schedule.workDate, schedule.shift.endTime);

  if (minutesFromTime(schedule.shift.endTime) <= minutesFromTime(schedule.shift.startTime)) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
}

function minutesBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60000));
}

function selectScheduleForCheckIn(schedules: ScheduleCandidate[], checkInAt: Date): ScheduleCandidate | null {
  const todayKey = dateKeyFromLocalDay(checkInAt);
  const availableSchedules = schedules.filter(
    (schedule) =>
      schedule.attendances.length === 0 &&
      schedule.dayType === ShiftScheduleDayType.WORKDAY &&
      Boolean(schedule.shift),
  );

  const eligible = availableSchedules.filter((schedule) => {
    const { start, end } = getScheduleWindow(schedule);
    const isCurrentNightWindow = checkInAt >= start && checkInAt <= end;
    const isScheduledToday = dateKeyFromDbDate(schedule.workDate) === todayKey;

    return isCurrentNightWindow || isScheduledToday;
  });

  eligible.sort((a, b) => getScheduleWindow(b).start.getTime() - getScheduleWindow(a).start.getTime());

  return eligible[0] ?? null;
}

function hasRelevantCheckedInSchedule(schedules: ScheduleCandidate[], checkInAt: Date): boolean {
  const todayKey = dateKeyFromLocalDay(checkInAt);

  return schedules.some((schedule) => {
    if (schedule.attendances.length === 0) {
      return false;
    }

    const isScheduledToday = dateKeyFromDbDate(schedule.workDate) === todayKey;
    if (isScheduledToday) {
      return true;
    }

    if (schedule.dayType !== ShiftScheduleDayType.WORKDAY || !schedule.shift) {
      return false;
    }

    const { start, end } = getScheduleWindow(schedule);
    return checkInAt >= start && checkInAt <= end;
  });
}

async function assertEmployeeExists(employeeId: string): Promise<EmployeeWithDefaultShift> {
  const employee = await attendanceRepository.findEmployeeById(employeeId);

  if (!employee) {
    throw httpError("Employee not found", 404);
  }

  if (!employee.isActive) {
    throw httpError("Employee is inactive", 400);
  }

  return employee;
}

function nonWorkingDayMessage(dayType: string): string {
  const label = dayType
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");

  return `Cannot check in on ${label}`;
}

function isCheckInBlockedDay(dayType: ShiftScheduleDayType): boolean {
  return (
    dayType === ShiftScheduleDayType.ROTATION_OFF ||
    dayType === ShiftScheduleDayType.OFF ||
    dayType === ShiftScheduleDayType.MONTHLY_OFF ||
    dayType === ShiftScheduleDayType.EXTRA_OFF ||
    dayType === ShiftScheduleDayType.SPECIAL_OFF ||
    dayType === ShiftScheduleDayType.LEAVE
  );
}

function resolveStatus(lateMinutes: number, overtimeMinutes: number, workMinutes: number, scheduledMinutes: number) {
  if (overtimeMinutes > 0) {
    return AttendanceStatus.OVERTIME;
  }

  if (workMinutes > 0 && workMinutes < Math.floor(scheduledMinutes / 2)) {
    return AttendanceStatus.HALF_DAY;
  }

  if (lateMinutes > 0) {
    return AttendanceStatus.LATE;
  }

  return AttendanceStatus.PRESENT;
}

function calculateAttendanceFromTimes(
  schedule: Pick<ScheduleCandidate, "workDate" | "shift">,
  checkInAt: Date,
  checkOutAt: Date | null,
) {
  const { start, end } = getScheduleWindow(schedule);
  const lateMinutes = minutesBetween(start, checkInAt);
  const overtimeMinutes = checkOutAt ? minutesBetween(end, checkOutAt) : 0;
  const workMinutes = checkOutAt ? minutesBetween(checkInAt, checkOutAt) : 0;
  const scheduledMinutes = minutesBetween(start, end);
  const status = checkOutAt
    ? resolveStatus(lateMinutes, overtimeMinutes, workMinutes, scheduledMinutes)
    : lateMinutes > 0
      ? AttendanceStatus.LATE
      : AttendanceStatus.PRESENT;

  return {
    lateMinutes,
    overtimeMinutes,
    workMinutes,
    status,
  };
}

function isAttendanceTimeBlockedDay(dayType: ShiftScheduleDayType): boolean {
  return (
    dayType === ShiftScheduleDayType.ROTATION_OFF ||
    dayType === ShiftScheduleDayType.OFF ||
    dayType === ShiftScheduleDayType.MONTHLY_OFF ||
    dayType === ShiftScheduleDayType.EXTRA_OFF ||
    dayType === ShiftScheduleDayType.SPECIAL_OFF ||
    dayType === ShiftScheduleDayType.LEAVE
  );
}

async function resolveExternalBlockedDay(employeeId: string, workDate: Date): Promise<ShiftScheduleDayType | null> {
  const offDay = await prisma.monthlyOffDay.findFirst({
    where: {
      employeeId,
      status: "APPROVED",
      offDate: workDate,
    },
    select: { type: true },
  });

  if (offDay) {
    return offDay.type as unknown as ShiftScheduleDayType;
  }

  const leave = await prisma.leaveRequest.findFirst({
    where: {
      employeeId,
      status: "APPROVED",
      startDate: { lte: workDate },
      endDate: { gte: workDate },
    },
    select: { id: true },
  });

  if (leave) {
    return ShiftScheduleDayType.LEAVE;
  }

  return null;
}

export const attendanceService = {
  checkIn: async (data: CheckInInput, createdBy: string) => {
    const checkInAt = data.checkInAt ?? new Date();
    const targetWorkDate = data.workDate ?? dbDateFromLocalDay(checkInAt);

    const employee = await assertEmployeeExists(data.employeeId);
    const existingAttendance = await attendanceRepository.findAttendanceForEmployeeWorkDate(
      data.employeeId,
      targetWorkDate,
    );

    if (existingAttendance) {
      throw httpError("Employee has already checked in for the scheduled shift", 409);
    }

    const scheduleDates = data.workDate
      ? [targetWorkDate]
      : [dbDateFromLocalDay(checkInAt, -1), targetWorkDate];
    const schedules = await attendanceRepository.findSchedulesForEmployeeDates(data.employeeId, scheduleDates);
    const targetWorkDateKey = dateKeyFromDbDate(targetWorkDate);
    const todaySchedule = schedules.find((schedule) => dateKeyFromDbDate(schedule.workDate) === targetWorkDateKey);

    if (todaySchedule && isCheckInBlockedDay(todaySchedule.dayType)) {
      throw httpError(nonWorkingDayMessage(todaySchedule.dayType), 400);
    }

    if (todaySchedule?.dayType !== ShiftScheduleDayType.ROTATION_OFF) {
      const externalBlockedDay = await resolveExternalBlockedDay(data.employeeId, targetWorkDate);

      if (externalBlockedDay) {
        throw httpError(nonWorkingDayMessage(externalBlockedDay), 400);
      }
    }

    if (todaySchedule?.dayType === ShiftScheduleDayType.WORKDAY && !todaySchedule.shift) {
      throw httpError("Workday schedule has no shift assigned", 400);
    }

    const schedule = data.workDate
      ? todaySchedule ?? null
      : selectScheduleForCheckIn(schedules, checkInAt);

    if (!schedule) {
      if (!data.workDate && hasRelevantCheckedInSchedule(schedules, checkInAt)) {
        throw httpError("Employee has already checked in for the scheduled shift", 409);
      }

      if (!todaySchedule && employee.defaultShiftId) {
        const defaultSchedule = await prisma.shiftSchedule.create({
          data: {
            employeeId: data.employeeId,
            shiftId: employee.defaultShiftId,
            workDate: targetWorkDate,
            assignedBy: createdBy,
            createdBy,
            dayType: ShiftScheduleDayType.WORKDAY,
            source: ShiftScheduleSource.DEFAULT_SHIFT,
            reason: "Fallback to employee default shift",
            note: "Fallback to employee default shift",
          },
          include: attendanceRepository.scheduleWithAttendanceInclude,
        });

        const { start } = getScheduleWindow(defaultSchedule);
        const lateMinutes = minutesBetween(start, checkInAt);

        return prisma.attendance.create({
          data: {
            employeeId: data.employeeId,
            shiftScheduleId: defaultSchedule.id,
            checkInAt,
            status: lateMinutes > 0 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
            lateMinutes,
            note: data.note,
          },
          include: attendanceRepository.attendanceInclude,
        });
      }

      throw httpError("Employee has no shift assigned", 404);
    }

    const { start } = getScheduleWindow(schedule);
    const lateMinutes = minutesBetween(start, checkInAt);

    return prisma.attendance.create({
      data: {
        employeeId: data.employeeId,
        shiftScheduleId: schedule.id,
        checkInAt,
        status: lateMinutes > 0 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
        lateMinutes,
        note: data.note,
      },
      include: attendanceRepository.attendanceInclude,
    });
  },

  checkOut: async (data: CheckOutInput) => {
    const checkOutAt = data.checkOutAt ?? new Date();

    await assertEmployeeExists(data.employeeId);

    const attendance = await attendanceRepository.findOpenAttendanceByEmployee(data.employeeId);

    if (!attendance) {
      const latestAttendance = await attendanceRepository.findLatestAttendanceByEmployee(data.employeeId);

      if (latestAttendance?.checkOutAt) {
        throw httpError("Employee has already checked out", 409);
      }

      throw httpError("Employee has not checked in", 409);
    }

    if (checkOutAt <= attendance.checkInAt) {
      throw httpError("Check-out time must be after check-in time", 400);
    }

    const { start, end } = getScheduleWindow(attendance.shiftSchedule);
    const workMinutes = minutesBetween(attendance.checkInAt, checkOutAt);
    const overtimeMinutes = minutesBetween(end, checkOutAt);
    const scheduledMinutes = minutesBetween(start, end);
    const status = resolveStatus(attendance.lateMinutes, overtimeMinutes, workMinutes, scheduledMinutes);

    return prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutAt,
        workMinutes,
        overtimeMinutes,
        status,
        note: data.note ?? attendance.note,
      },
      include: attendanceRepository.attendanceInclude,
    });
  },

  update: async (id: string, data: UpdateAttendanceInput, updatedBy: string) => {
    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: attendanceRepository.attendanceInclude,
    });

    if (!attendance) {
      throw httpError("Attendance record not found", 404);
    }

    const nextCheckInAt = data.checkInAt ?? attendance.checkInAt;
    const nextCheckOutAt =
      data.checkOutAt === undefined ? attendance.checkOutAt : data.checkOutAt;

    if (nextCheckOutAt && nextCheckOutAt <= nextCheckInAt) {
      throw httpError("Check-out time must be after check-in time", 400);
    }

    const cannotEditTimes = isAttendanceTimeBlockedDay(attendance.shiftSchedule.dayType);

    if (cannotEditTimes && (data.checkInAt !== undefined || data.checkOutAt !== undefined)) {
      throw httpError("Cannot edit attendance times on non-working days", 400);
    }

    const manualOverride = data.manualOverride ?? false;

    if (manualOverride && !data.adjustmentReason?.trim()) {
      throw httpError("Adjustment reason is required when manual override is enabled", 400);
    }

    const calculatedAttendance = calculateAttendanceFromTimes(
      attendance.shiftSchedule,
      nextCheckInAt,
      nextCheckOutAt,
    );

    const manualAttendance = {
      lateMinutes: data.lateMinutes ?? attendance.lateMinutes,
      overtimeMinutes: data.overtimeMinutes ?? attendance.overtimeMinutes,
      workMinutes: nextCheckOutAt ? minutesBetween(nextCheckInAt, nextCheckOutAt) : 0,
      status: data.status ?? attendance.status,
    };

    if (manualAttendance.workMinutes < 0) {
      throw httpError("Work minutes cannot be negative", 400);
    }

    return prisma.attendance.update({
      where: { id },
      data: {
        ...(data.checkInAt !== undefined && { checkInAt: data.checkInAt }),
        ...(data.checkOutAt !== undefined && { checkOutAt: data.checkOutAt }),
        lateMinutes: manualOverride ? manualAttendance.lateMinutes : calculatedAttendance.lateMinutes,
        overtimeMinutes: manualOverride ? manualAttendance.overtimeMinutes : calculatedAttendance.overtimeMinutes,
        workMinutes: manualOverride ? manualAttendance.workMinutes : calculatedAttendance.workMinutes,
        status: manualOverride ? manualAttendance.status : calculatedAttendance.status,
        manualOverride,
        ...(data.note !== undefined && { note: data.note }),
        ...(data.adjustmentReason !== undefined && { adjustmentReason: data.adjustmentReason }),
        updatedBy,
      },
      include: attendanceRepository.attendanceInclude,
    });
  },

  list: (query: ListAttendanceQuery) => {
    const where: Prisma.AttendanceWhereInput = {
      ...(query.employeeId && { employeeId: query.employeeId }),
      ...(query.status && { status: query.status }),
      ...((query.fromDate || query.toDate) && {
        shiftSchedule: {
          workDate: {
            ...(query.fromDate && { gte: query.fromDate }),
            ...(query.toDate && { lte: query.toDate }),
          },
        },
      }),
    };

    return prisma.attendance.findMany({
      where,
      include: attendanceRepository.attendanceInclude,
      orderBy: [{ checkInAt: "desc" }, { createdAt: "desc" }],
    });
  },

  listByEmployee: async (employeeId: string) => {
    await assertEmployeeExists(employeeId);

    return prisma.attendance.findMany({
      where: { employeeId },
      include: attendanceRepository.attendanceInclude,
      orderBy: [{ checkInAt: "desc" }, { createdAt: "desc" }],
    });
  },

  listToday: () =>
    prisma.attendance.findMany({
      where: {
        shiftSchedule: {
          workDate: dbDateFromLocalDay(new Date()),
        },
      },
      include: attendanceRepository.attendanceInclude,
      orderBy: [{ checkInAt: "desc" }, { createdAt: "desc" }],
    }),
};
