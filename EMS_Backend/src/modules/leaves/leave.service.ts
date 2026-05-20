import { LeaveStatus, Prisma } from "@prisma/client";
import { z } from "zod";

import prisma from "../../config/prisma";
import { httpError } from "../../common/utils/errors";
import { leaveRepository } from "./leave.repository";
import { leavePayloadSchema, listLeaveQuerySchema, rejectLeaveSchema, updateLeaveSchema } from "./leave.schema";

type LeavePayload = z.infer<typeof leavePayloadSchema>;
type UpdateLeavePayload = z.infer<typeof updateLeaveSchema>;
type RejectLeavePayload = z.infer<typeof rejectLeaveSchema>;
type ListLeaveQuery = z.infer<typeof listLeaveQuerySchema>;

async function assertEmployeeExists(employeeId: string) {
  const employee = await leaveRepository.findEmployeeById(employeeId);

  if (!employee) {
    throw httpError("Employee not found", 404);
  }
}

async function assertNoOverlap(employeeId: string, startDate: Date, endDate: Date, excludeId?: string) {
  const overlappingLeave = await leaveRepository.findOverlap(employeeId, startDate, endDate, excludeId);

  if (overlappingLeave) {
    throw httpError("Employee already has overlapping pending or approved leave", 409);
  }
}

async function getLeave(id: string) {
  const leave = await leaveRepository.findById(id);

  if (!leave) {
    throw httpError("Leave request not found", 404);
  }

  return leave;
}

export const leaveService = {
  create: async (data: LeavePayload) => {
    await assertEmployeeExists(data.employeeId);
    await assertNoOverlap(data.employeeId, data.startDate, data.endDate);

    return prisma.leaveRequest.create({
      data,
      include: leaveRepository.leaveInclude,
    });
  },

  list: (query: ListLeaveQuery) => {
    const where: Prisma.LeaveRequestWhereInput = {
      ...(query.employeeId && { employeeId: query.employeeId }),
      ...(query.status && { status: query.status }),
      ...(query.leaveType && { leaveType: query.leaveType }),
      ...((query.fromDate || query.toDate) && {
        startDate: { ...(query.toDate && { lte: query.toDate }) },
        endDate: { ...(query.fromDate && { gte: query.fromDate }) },
      }),
    };

    return prisma.leaveRequest.findMany({
      where,
      include: leaveRepository.leaveInclude,
      orderBy: [{ createdAt: "desc" }],
    });
  },

  get: getLeave,

  update: async (id: string, data: UpdateLeavePayload) => {
    const leave = await getLeave(id);

    if (leave.status !== LeaveStatus.PENDING) {
      throw httpError("Only pending leave requests can be updated", 400);
    }

    const employeeId = data.employeeId ?? leave.employeeId;
    const startDate = data.startDate ?? leave.startDate;
    const endDate = data.endDate ?? leave.endDate;

    if (startDate > endDate) {
      throw httpError("Start date must be before or equal to end date", 400);
    }

    await assertEmployeeExists(employeeId);
    await assertNoOverlap(employeeId, startDate, endDate, id);

    return prisma.leaveRequest.update({
      where: { id },
      data,
      include: leaveRepository.leaveInclude,
    });
  },

  approve: async (id: string, approvedBy: string) => {
    const leave = await getLeave(id);

    if (leave.status !== LeaveStatus.PENDING) {
      throw httpError("Only pending leave requests can be approved", 400);
    }

    await assertNoOverlap(leave.employeeId, leave.startDate, leave.endDate, id);

    return prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.APPROVED,
        approvedBy,
        approvedAt: new Date(),
        rejectedBy: null,
        rejectedAt: null,
        rejectReason: null,
      },
      include: leaveRepository.leaveInclude,
    });
  },

  reject: async (id: string, data: RejectLeavePayload, rejectedBy: string) => {
    const leave = await getLeave(id);

    if (leave.status !== LeaveStatus.PENDING) {
      throw httpError("Only pending leave requests can be rejected", 400);
    }

    return prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.REJECTED,
        rejectedBy,
        rejectedAt: new Date(),
        rejectReason: data.rejectReason,
      },
      include: leaveRepository.leaveInclude,
    });
  },

  cancel: async (id: string) => {
    const leave = await getLeave(id);

    if (leave.status === LeaveStatus.CANCELLED) {
      throw httpError("Leave request is already cancelled", 409);
    }

    if (leave.status === LeaveStatus.REJECTED) {
      throw httpError("Rejected leave requests cannot be cancelled", 400);
    }

    return prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveStatus.CANCELLED },
      include: leaveRepository.leaveInclude,
    });
  },
};
