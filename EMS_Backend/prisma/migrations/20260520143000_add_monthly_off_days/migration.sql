ALTER TYPE "ShiftScheduleDayType" ADD VALUE IF NOT EXISTS 'EXTRA_OFF';
ALTER TYPE "ShiftScheduleDayType" ADD VALUE IF NOT EXISTS 'SPECIAL_OFF';

CREATE TYPE "OffDayType" AS ENUM ('MONTHLY_OFF', 'EXTRA_OFF', 'ROTATION_OFF', 'SPECIAL_OFF');
CREATE TYPE "OffDayStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "MonthlyOffDay" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "offDate" DATE NOT NULL,
  "type" "OffDayType" NOT NULL DEFAULT 'MONTHLY_OFF',
  "reason" TEXT,
  "status" "OffDayStatus" NOT NULL DEFAULT 'PENDING',
  "isOverQuota" BOOLEAN NOT NULL DEFAULT false,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedBy" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "rejectReason" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MonthlyOffDay_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MonthlyOffDay_employeeId_idx" ON "MonthlyOffDay"("employeeId");
CREATE INDEX "MonthlyOffDay_offDate_idx" ON "MonthlyOffDay"("offDate");
CREATE INDEX "MonthlyOffDay_type_idx" ON "MonthlyOffDay"("type");
CREATE INDEX "MonthlyOffDay_status_idx" ON "MonthlyOffDay"("status");
CREATE INDEX "MonthlyOffDay_createdBy_idx" ON "MonthlyOffDay"("createdBy");
CREATE INDEX "MonthlyOffDay_approvedBy_idx" ON "MonthlyOffDay"("approvedBy");

ALTER TABLE "MonthlyOffDay"
  ADD CONSTRAINT "MonthlyOffDay_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
