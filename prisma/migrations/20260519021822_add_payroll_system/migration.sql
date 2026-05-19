-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('MORNING', 'NIGHT');

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "employeeNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "baseSalary" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "mealAllowance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "allowance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lateRatePerMin" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftSchedule" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "shiftDate" DATE NOT NULL,
    "shiftType" "ShiftType" NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftSwapHistory" (
    "id" TEXT NOT NULL,
    "fromEmployee" TEXT NOT NULL,
    "toEmployee" TEXT NOT NULL,
    "shiftDate" DATE NOT NULL,
    "fromShift" "ShiftType" NOT NULL,
    "toShift" "ShiftType" NOT NULL,
    "managedBy" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftSwapHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "isPresent" BOOLEAN NOT NULL DEFAULT true,
    "isAbsent" BOOLEAN NOT NULL DEFAULT false,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "markedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "multiplier" DECIMAL(4,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "baseSalary" DECIMAL(10,2) NOT NULL,
    "mealAllowance" DECIMAL(10,2) NOT NULL,
    "allowance" DECIMAL(10,2) NOT NULL,
    "holidayBonus" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lateDeduction" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "absentDeduction" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalDeduction" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netSalary" DECIMAL(10,2) NOT NULL,
    "totalAbsent" INTEGER NOT NULL DEFAULT 0,
    "totalLateMin" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "processedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeNo_key" ON "Employee"("employeeNo");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_prefix_idx" ON "Employee"("prefix");

-- CreateIndex
CREATE INDEX "ShiftSchedule_shiftDate_idx" ON "ShiftSchedule"("shiftDate");

-- CreateIndex
CREATE INDEX "ShiftSchedule_employeeId_idx" ON "ShiftSchedule"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftSchedule_employeeId_shiftDate_key" ON "ShiftSchedule"("employeeId", "shiftDate");

-- CreateIndex
CREATE INDEX "ShiftSwapHistory_shiftDate_idx" ON "ShiftSwapHistory"("shiftDate");

-- CreateIndex
CREATE INDEX "ShiftSwapHistory_fromEmployee_idx" ON "ShiftSwapHistory"("fromEmployee");

-- CreateIndex
CREATE INDEX "ShiftSwapHistory_toEmployee_idx" ON "ShiftSwapHistory"("toEmployee");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE INDEX "Attendance_employeeId_idx" ON "Attendance"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");

-- CreateIndex
CREATE INDEX "Holiday_date_idx" ON "Holiday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_date_key" ON "Holiday"("date");

-- CreateIndex
CREATE INDEX "Payroll_employeeId_idx" ON "Payroll"("employeeId");

-- CreateIndex
CREATE INDEX "Payroll_month_year_idx" ON "Payroll"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_employeeId_month_year_key" ON "Payroll"("employeeId", "month", "year");

-- AddForeignKey
ALTER TABLE "ShiftSchedule" ADD CONSTRAINT "ShiftSchedule_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSchedule" ADD CONSTRAINT "ShiftSchedule_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwapHistory" ADD CONSTRAINT "ShiftSwapHistory_fromEmployee_fkey" FOREIGN KEY ("fromEmployee") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwapHistory" ADD CONSTRAINT "ShiftSwapHistory_toEmployee_fkey" FOREIGN KEY ("toEmployee") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwapHistory" ADD CONSTRAINT "ShiftSwapHistory_managedBy_fkey" FOREIGN KEY ("managedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_markedBy_fkey" FOREIGN KEY ("markedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
