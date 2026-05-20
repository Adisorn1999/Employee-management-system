import { Prisma } from "@prisma/client";

import prisma from "../../config/prisma";

const leaveInclude = {
  employee: true,
} satisfies Prisma.LeaveRequestInclude;

export const leaveRepository = {
  leaveInclude,
  findById: (id: string) =>
    prisma.leaveRequest.findUnique({
      where: { id },
      include: leaveInclude,
    }),
  findEmployeeById: (id: string) => prisma.employee.findUnique({ where: { id } }),
  findOverlap: (employeeId: string, startDate: Date, endDate: Date, excludeId?: string) =>
    prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        ...(excludeId && { id: { not: excludeId } }),
      },
    }),
};
