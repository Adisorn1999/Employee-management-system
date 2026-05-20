import { Prisma, ShiftScheduleDayType, ShiftScheduleSource } from "@prisma/client";

import prisma from "../../config/prisma";
import { httpError } from "../../common/utils/errors";
import { shiftRepository } from "./shift.repository";
import {
  createScheduleSchema,
  changeShiftSchema,
  createShiftSchema,
  createSwapSchema,
  listScheduleQuerySchema,
  listShiftQuerySchema,
  updateShiftSchema,
} from "./shift.schema";
import { z } from "zod";

type CreateShiftInput = z.infer<typeof createShiftSchema>;
type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
type ChangeShiftInput = z.infer<typeof changeShiftSchema>;
type ListScheduleQuery = z.infer<typeof listScheduleQuerySchema>;
type ListShiftQuery = z.infer<typeof listShiftQuerySchema>;
type CreateSwapInput = z.infer<typeof createSwapSchema>;

async function assertEmployeeExists(employeeId: string): Promise<void> {
  const employee = await shiftRepository.findEmployeeById(employeeId);

  if (!employee) {
    throw httpError("Employee not found", 404);
  }
}

async function assertShiftExists(shiftId: string): Promise<void> {
  const shift = await shiftRepository.findShiftById(shiftId);

  if (!shift) {
    throw httpError("Shift not found", 404);
  }

  if (!shift.isActive) {
    throw httpError("Shift is inactive", 400);
  }
}

export const shiftService = {
  listShifts: (query: ListShiftQuery) =>
    prisma.shift.findMany({
      where: query.isActive === undefined ? undefined : { isActive: query.isActive === "true" },
      orderBy: { createdAt: "desc" },
    }),

  getShift: async (id: string) => {
    const shift = await shiftRepository.findShiftById(id);

    if (!shift) {
      throw httpError("Shift not found", 404);
    }

    return shift;
  },

  createShift: (data: CreateShiftInput) =>
    prisma.shift.create({
      data,
    }),

  updateShift: async (id: string, data: UpdateShiftInput) => {
    await shiftService.getShift(id);

    return prisma.shift.update({
      where: { id },
      data,
    });
  },

  deleteShift: async (id: string) => {
    const shift = await shiftService.getShift(id);

    if (!shift.isActive) {
      throw httpError("Shift is already inactive", 409);
    }

    return prisma.shift.update({
      where: { id },
      data: { isActive: false },
    });
  },

  createSchedule: async (data: CreateScheduleInput, assignedBy: string) => {
    await assertEmployeeExists(data.employeeId);
    await assertShiftExists(data.shiftId);

    const existing = await shiftRepository.findScheduleForEmployeeDate(data.employeeId, data.workDate);

    if (existing) {
      throw httpError("Employee already has a shift schedule for this date", 409);
    }

    return prisma.shiftSchedule.create({
      data: {
        employeeId: data.employeeId,
        shiftId: data.shiftId,
        workDate: data.workDate,
        assignedBy,
        createdBy: assignedBy,
        dayType: ShiftScheduleDayType.WORKDAY,
        source: ShiftScheduleSource.MANUAL,
        note: data.note,
      },
      include: shiftRepository.scheduleInclude,
    });
  },

  changeShift: async (data: ChangeShiftInput, createdBy: string) => {
    await assertEmployeeExists(data.employeeId);
    await assertShiftExists(data.newShiftId);

    const targetDates = [data.effectiveDate];
    if (data.rotationOffDate) {
      targetDates.push(data.rotationOffDate);
    }

    for (const targetDate of targetDates) {
      const existing = await shiftRepository.findScheduleWithAttendanceForEmployeeDate(data.employeeId, targetDate);
      if (existing?.attendances.length) {
        throw httpError("Attendance already exists for the target date", 409);
      }
    }

    return prisma.$transaction(async (tx) => {
      if (data.rotationOffDate) {
        await tx.shiftSchedule.upsert({
          where: {
            employeeId_workDate: {
              employeeId: data.employeeId,
              workDate: data.rotationOffDate,
            },
          },
          update: {
            shiftId: null,
            dayType: ShiftScheduleDayType.ROTATION_OFF,
            source: ShiftScheduleSource.SHIFT_CHANGE,
            reason: data.reason,
            note: data.reason,
            createdBy,
            assignedBy: createdBy,
          },
          create: {
            employeeId: data.employeeId,
            shiftId: null,
            workDate: data.rotationOffDate,
            assignedBy: createdBy,
            createdBy,
            dayType: ShiftScheduleDayType.ROTATION_OFF,
            source: ShiftScheduleSource.SHIFT_CHANGE,
            reason: data.reason,
            note: data.reason,
          },
        });
      }

      return tx.shiftSchedule.upsert({
        where: {
          employeeId_workDate: {
            employeeId: data.employeeId,
            workDate: data.effectiveDate,
          },
        },
        update: {
          shiftId: data.newShiftId,
          dayType: ShiftScheduleDayType.WORKDAY,
          source: ShiftScheduleSource.SHIFT_CHANGE,
          reason: data.reason,
          note: data.reason,
          createdBy,
          assignedBy: createdBy,
        },
        create: {
          employeeId: data.employeeId,
          shiftId: data.newShiftId,
          workDate: data.effectiveDate,
          assignedBy: createdBy,
          createdBy,
          dayType: ShiftScheduleDayType.WORKDAY,
          source: ShiftScheduleSource.SHIFT_CHANGE,
          reason: data.reason,
          note: data.reason,
        },
        include: shiftRepository.scheduleInclude,
      });
    });
  },

  listSchedules: (query: ListScheduleQuery) => {
    const where: Prisma.ShiftScheduleWhereInput = {
      ...(query.employeeId && { employeeId: query.employeeId }),
      ...(query.shiftId && { shiftId: query.shiftId }),
      ...((query.fromDate || query.toDate) && {
        workDate: {
          ...(query.fromDate && { gte: query.fromDate }),
          ...(query.toDate && { lte: query.toDate }),
        },
      }),
    };

    return prisma.shiftSchedule.findMany({
      where,
      include: shiftRepository.scheduleInclude,
      orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
    });
  },

  listEmployeeSchedules: async (employeeId: string) => {
    await assertEmployeeExists(employeeId);

    return prisma.shiftSchedule.findMany({
      where: { employeeId },
      include: shiftRepository.scheduleInclude,
      orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
    });
  },

  createSwap: async (data: CreateSwapInput, approvedBy: string) => {
    if (data.fromEmployeeId === data.toEmployeeId) {
      throw httpError("Swap employees must be different", 400);
    }

    await assertEmployeeExists(data.fromEmployeeId);
    await assertEmployeeExists(data.toEmployeeId);

    const schedule = await shiftRepository.findScheduleById(data.shiftScheduleId);

    if (!schedule) {
      throw httpError("Shift schedule not found", 404);
    }

    if (schedule.employeeId !== data.fromEmployeeId) {
      throw httpError("Schedule does not belong to the from employee", 400);
    }

    const targetConflict = await shiftRepository.findScheduleForEmployeeDate(data.toEmployeeId, schedule.workDate);

    if (targetConflict) {
      throw httpError("Target employee already has a shift schedule for this date", 409);
    }

    return prisma.$transaction(async (tx) => {
      await tx.shiftSchedule.update({
        where: { id: data.shiftScheduleId },
        data: { employeeId: data.toEmployeeId },
      });

      return tx.shiftSwapHistory.create({
        data: {
          fromEmployeeId: data.fromEmployeeId,
          toEmployeeId: data.toEmployeeId,
          shiftScheduleId: data.shiftScheduleId,
          approvedBy,
          reason: data.reason,
        },
        include: shiftRepository.swapInclude,
      });
    });
  },
};
