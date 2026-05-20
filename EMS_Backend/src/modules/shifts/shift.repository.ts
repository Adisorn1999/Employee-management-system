import { Prisma } from "@prisma/client";

import prisma from "../../config/prisma";

const scheduleInclude = {
  employee: true,
  shift: true,
  assigner: {
    select: {
      id: true,
      username: true,
      name: true,
    },
  },
} satisfies Prisma.ShiftScheduleInclude;

const swapInclude = {
  fromEmployee: true,
  toEmployee: true,
  schedule: {
    include: scheduleInclude,
  },
  approver: {
    select: {
      id: true,
      username: true,
      name: true,
    },
  },
} satisfies Prisma.ShiftSwapHistoryInclude;

export const shiftRepository = {
  scheduleInclude,
  swapInclude,

  findShiftById: (id: string) => prisma.shift.findUnique({ where: { id } }),
  findEmployeeById: (id: string) => prisma.employee.findUnique({ where: { id } }),
  findScheduleById: (id: string) =>
    prisma.shiftSchedule.findUnique({
      where: { id },
      include: scheduleInclude,
    }),
  findScheduleForEmployeeDate: (employeeId: string, workDate: Date) =>
    prisma.shiftSchedule.findUnique({
      where: {
        employeeId_workDate: {
          employeeId,
          workDate,
        },
      },
    }),
};
