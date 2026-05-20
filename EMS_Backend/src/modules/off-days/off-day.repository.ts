import { Prisma } from "@prisma/client";

import prisma from "../../config/prisma";

const offDayInclude = {
  employee: true,
} satisfies Prisma.MonthlyOffDayInclude;

export const offDayRepository = {
  offDayInclude,
  findEmployeeById: (id: string) => prisma.employee.findUnique({ where: { id } }),
  findById: (id: string) =>
    prisma.monthlyOffDay.findUnique({
      where: { id },
      include: offDayInclude,
    }),
  findApprovedDuplicate: (employeeId: string, offDate: Date, excludeId?: string) =>
    prisma.monthlyOffDay.findFirst({
      where: {
        employeeId,
        offDate,
        status: "APPROVED",
        ...(excludeId && { id: { not: excludeId } }),
      },
    }),
};
