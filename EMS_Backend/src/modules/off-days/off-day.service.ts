import { OffDayStatus, OffDayType, Prisma } from "@prisma/client";
import { z } from "zod";

import prisma from "../../config/prisma";
import { httpError } from "../../common/utils/errors";
import { offDayRepository } from "./off-day.repository";
import { listOffDayQuerySchema, offDayPayloadSchema, rejectOffDaySchema, updateOffDaySchema } from "./off-day.schema";

const MONTHLY_OFF_QUOTA = 6;
const QUOTA_WARNING = "Monthly off quota exceeded";

type OffDayPayload = z.infer<typeof offDayPayloadSchema>;
type UpdateOffDayPayload = z.infer<typeof updateOffDaySchema>;
type RejectOffDayPayload = z.infer<typeof rejectOffDaySchema>;
type ListOffDayQuery = z.infer<typeof listOffDayQuerySchema>;

function monthBounds(date: Date) {
  return {
    start: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)),
    end: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)),
  };
}

function countsTowardQuota(type: OffDayType) {
  return type === OffDayType.MONTHLY_OFF;
}

async function assertEmployeeExists(employeeId: string) {
  const employee = await offDayRepository.findEmployeeById(employeeId);

  if (!employee) {
    throw httpError("Employee not found", 404);
  }
}

async function assertNoApprovedDuplicate(employeeId: string, offDate: Date, excludeId?: string) {
  const duplicate = await offDayRepository.findApprovedDuplicate(employeeId, offDate, excludeId);

  if (duplicate) {
    throw httpError("Employee already has an approved off day on this date", 409);
  }
}

async function approvedMonthlyOffCount(employeeId: string, offDate: Date, excludeId?: string) {
  const { start, end } = monthBounds(offDate);

  return prisma.monthlyOffDay.count({
    where: {
      employeeId,
      type: OffDayType.MONTHLY_OFF,
      status: OffDayStatus.APPROVED,
      offDate: { gte: start, lte: end },
      ...(excludeId && { id: { not: excludeId } }),
    },
  });
}

async function resolveIsOverQuota(employeeId: string, offDate: Date, type: OffDayType, excludeId?: string, includeSelf = false) {
  if (!countsTowardQuota(type)) {
    return false;
  }

  const currentCount = await approvedMonthlyOffCount(employeeId, offDate, excludeId);
  return currentCount + (includeSelf ? 1 : 0) > MONTHLY_OFF_QUOTA;
}

async function getOffDay(id: string) {
  const offDay = await offDayRepository.findById(id);

  if (!offDay) {
    throw httpError("Off day not found", 404);
  }

  return offDay;
}

function withWarning<T extends { isOverQuota: boolean }>(data: T) {
  return {
    data,
    warning: data.isOverQuota ? QUOTA_WARNING : undefined,
  };
}

export const offDayService = {
  quota: MONTHLY_OFF_QUOTA,

  create: async (data: OffDayPayload, createdBy: string) => {
    await assertEmployeeExists(data.employeeId);
    await assertNoApprovedDuplicate(data.employeeId, data.offDate);

    const isOverQuota = await resolveIsOverQuota(data.employeeId, data.offDate, data.type);
    const offDay = await prisma.monthlyOffDay.create({
      data: {
        ...data,
        reason: data.reason || null,
        isOverQuota,
        createdBy,
      },
      include: offDayRepository.offDayInclude,
    });

    return withWarning(offDay);
  },

  list: (query: ListOffDayQuery) => {
    const where: Prisma.MonthlyOffDayWhereInput = {
      ...(query.employeeId && { employeeId: query.employeeId }),
      ...(query.status && { status: query.status }),
      ...(query.type && { type: query.type }),
      ...((query.fromDate || query.toDate) && {
        offDate: {
          ...(query.fromDate && { gte: query.fromDate }),
          ...(query.toDate && { lte: query.toDate }),
        },
      }),
    };

    return prisma.monthlyOffDay.findMany({
      where,
      include: offDayRepository.offDayInclude,
      orderBy: [{ offDate: "desc" }, { createdAt: "desc" }],
    });
  },

  get: getOffDay,

  update: async (id: string, data: UpdateOffDayPayload) => {
    const offDay = await getOffDay(id);

    if (offDay.status !== OffDayStatus.PENDING) {
      throw httpError("Only pending off days can be updated", 400);
    }

    const employeeId = data.employeeId ?? offDay.employeeId;
    const offDate = data.offDate ?? offDay.offDate;
    const type = data.type ?? offDay.type;

    await assertEmployeeExists(employeeId);
    await assertNoApprovedDuplicate(employeeId, offDate, id);

    const isOverQuota = await resolveIsOverQuota(employeeId, offDate, type, id);
    const updatedOffDay = await prisma.monthlyOffDay.update({
      where: { id },
      data: {
        ...data,
        reason: data.reason === undefined ? undefined : data.reason || null,
        isOverQuota,
      },
      include: offDayRepository.offDayInclude,
    });

    return withWarning(updatedOffDay);
  },

  approve: async (id: string, approvedBy: string) => {
    const offDay = await getOffDay(id);

    if (offDay.status !== OffDayStatus.PENDING) {
      throw httpError("Only pending off days can be approved", 400);
    }

    await assertNoApprovedDuplicate(offDay.employeeId, offDay.offDate, id);

    const isOverQuota = await resolveIsOverQuota(offDay.employeeId, offDay.offDate, offDay.type, id, true);
    const approvedOffDay = await prisma.monthlyOffDay.update({
      where: { id },
      data: {
        status: OffDayStatus.APPROVED,
        isOverQuota,
        approvedBy,
        approvedAt: new Date(),
        rejectedBy: null,
        rejectedAt: null,
        rejectReason: null,
      },
      include: offDayRepository.offDayInclude,
    });

    return withWarning(approvedOffDay);
  },

  reject: async (id: string, data: RejectOffDayPayload, rejectedBy: string) => {
    const offDay = await getOffDay(id);

    if (offDay.status !== OffDayStatus.PENDING) {
      throw httpError("Only pending off days can be rejected", 400);
    }

    return prisma.monthlyOffDay.update({
      where: { id },
      data: {
        status: OffDayStatus.REJECTED,
        rejectedBy,
        rejectedAt: new Date(),
        rejectReason: data.rejectReason,
      },
      include: offDayRepository.offDayInclude,
    });
  },

  cancel: async (id: string) => {
    const offDay = await getOffDay(id);

    if (offDay.status === OffDayStatus.CANCELLED) {
      throw httpError("Off day is already cancelled", 409);
    }

    if (offDay.status === OffDayStatus.REJECTED) {
      throw httpError("Rejected off days cannot be cancelled", 400);
    }

    return prisma.monthlyOffDay.update({
      where: { id },
      data: { status: OffDayStatus.CANCELLED },
      include: offDayRepository.offDayInclude,
    });
  },
};
