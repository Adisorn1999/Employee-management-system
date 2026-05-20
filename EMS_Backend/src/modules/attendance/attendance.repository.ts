import { Prisma } from "@prisma/client";

import prisma from "../../config/prisma";

const attendanceInclude = {
  employee: true,
  shiftSchedule: {
    include: {
      shift: true,
    },
  },
} satisfies Prisma.AttendanceInclude;

const scheduleWithAttendanceInclude = {
  shift: true,
  attendances: true,
} satisfies Prisma.ShiftScheduleInclude;

export const attendanceRepository = {
  attendanceInclude,
  scheduleWithAttendanceInclude,

  findEmployeeById: (id: string) =>
    prisma.employee.findUnique({
      where: { id },
      include: {
        defaultShift: true,
      },
    }),

  findSchedulesForEmployeeDates: (employeeId: string, dates: Date[]) =>
    prisma.shiftSchedule.findMany({
      where: {
        employeeId,
        workDate: { in: dates },
      },
      include: scheduleWithAttendanceInclude,
      orderBy: { workDate: "desc" },
    }),

  findAttendanceForEmployeeWorkDate: (employeeId: string, workDate: Date) =>
    prisma.attendance.findFirst({
      where: {
        employeeId,
        shiftSchedule: {
          workDate,
        },
      },
      include: attendanceInclude,
    }),

  findOpenAttendanceByEmployee: (employeeId: string) =>
    prisma.attendance.findFirst({
      where: {
        employeeId,
        checkOutAt: null,
      },
      include: attendanceInclude,
      orderBy: { checkInAt: "desc" },
    }),

  findLatestAttendanceByEmployee: (employeeId: string) =>
    prisma.attendance.findFirst({
      where: { employeeId },
      include: attendanceInclude,
      orderBy: { checkInAt: "desc" },
    }),
};
