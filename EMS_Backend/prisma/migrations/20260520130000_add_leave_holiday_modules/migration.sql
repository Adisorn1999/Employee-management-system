CREATE TYPE "HolidayType" AS ENUM ('COMPANY', 'PUBLIC', 'SPECIAL');
CREATE TYPE "LeaveType" AS ENUM ('SICK', 'PERSONAL', 'VACATION', 'UNPAID', 'OTHER');
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

ALTER TABLE "Holiday" DROP CONSTRAINT IF EXISTS "Holiday_date_key";
ALTER TABLE "Holiday" DROP COLUMN IF EXISTS "multiplier";
ALTER TABLE "Holiday" ADD COLUMN "type" "HolidayType" NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "Holiday" ADD COLUMN "isPaid" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Holiday" ADD COLUMN "note" TEXT;

CREATE UNIQUE INDEX "Holiday_date_name_key" ON "Holiday"("date", "name");
CREATE INDEX "Holiday_type_idx" ON "Holiday"("type");

CREATE TABLE "LeaveRequest" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "leaveType" "LeaveType" NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "reason" TEXT,
  "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedBy" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "rejectReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LeaveRequest_employeeId_idx" ON "LeaveRequest"("employeeId");
CREATE INDEX "LeaveRequest_startDate_endDate_idx" ON "LeaveRequest"("startDate", "endDate");
CREATE INDEX "LeaveRequest_status_idx" ON "LeaveRequest"("status");
CREATE INDEX "LeaveRequest_approvedBy_idx" ON "LeaveRequest"("approvedBy");
CREATE INDEX "LeaveRequest_rejectedBy_idx" ON "LeaveRequest"("rejectedBy");

ALTER TABLE "LeaveRequest"
  ADD CONSTRAINT "LeaveRequest_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
