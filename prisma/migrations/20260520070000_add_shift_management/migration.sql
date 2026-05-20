-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shift_code_key" ON "Shift"("code");
CREATE INDEX "Shift_isActive_idx" ON "Shift"("isActive");

-- Seed default shifts for existing databases.
INSERT INTO "Shift" ("id", "code", "name", "startTime", "endTime", "color", "isActive", "createdAt", "updatedAt")
VALUES
    ('11111111-1111-4111-8111-111111111111', 'DAY', 'Day Shift', '08:00', '20:00', '#2563eb', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('22222222-2222-4222-8222-222222222222', 'NIGHT', 'Night Shift', '20:00', '08:00', '#7c3aed', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- Rebuild swap history because the previous shape did not reference a schedule row.
DROP TABLE IF EXISTS "ShiftSwapHistory";

-- Update ShiftSchedule to the new model while preserving employee/date/user assignments.
ALTER TABLE "ShiftSchedule" DROP CONSTRAINT IF EXISTS "ShiftSchedule_createdBy_fkey";
ALTER TABLE "ShiftSchedule" DROP CONSTRAINT IF EXISTS "ShiftSchedule_employeeId_fkey";
DROP INDEX IF EXISTS "ShiftSchedule_employeeId_shiftDate_key";
DROP INDEX IF EXISTS "ShiftSchedule_shiftDate_idx";

ALTER TABLE "ShiftSchedule" ADD COLUMN "shiftId" TEXT;
ALTER TABLE "ShiftSchedule" ADD COLUMN "workDate" DATE;
ALTER TABLE "ShiftSchedule" ADD COLUMN "assignedBy" TEXT;
ALTER TABLE "ShiftSchedule" ADD COLUMN "note" TEXT;

UPDATE "ShiftSchedule"
SET
    "shiftId" = CASE
        WHEN "shiftType"::text = 'NIGHT' THEN '22222222-2222-4222-8222-222222222222'
        ELSE '11111111-1111-4111-8111-111111111111'
    END,
    "workDate" = "shiftDate",
    "assignedBy" = "createdBy";

ALTER TABLE "ShiftSchedule" ALTER COLUMN "shiftId" SET NOT NULL;
ALTER TABLE "ShiftSchedule" ALTER COLUMN "workDate" SET NOT NULL;
ALTER TABLE "ShiftSchedule" ALTER COLUMN "assignedBy" SET NOT NULL;

ALTER TABLE "ShiftSchedule" DROP COLUMN "shiftDate";
ALTER TABLE "ShiftSchedule" DROP COLUMN "shiftType";
ALTER TABLE "ShiftSchedule" DROP COLUMN "createdBy";
ALTER TABLE "ShiftSchedule" DROP COLUMN "updatedAt";

CREATE UNIQUE INDEX "ShiftSchedule_employeeId_workDate_key" ON "ShiftSchedule"("employeeId", "workDate");
CREATE INDEX "ShiftSchedule_workDate_idx" ON "ShiftSchedule"("workDate");
CREATE INDEX "ShiftSchedule_shiftId_idx" ON "ShiftSchedule"("shiftId");
CREATE INDEX "ShiftSchedule_assignedBy_idx" ON "ShiftSchedule"("assignedBy");

ALTER TABLE "ShiftSchedule" ADD CONSTRAINT "ShiftSchedule_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShiftSchedule" ADD CONSTRAINT "ShiftSchedule_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShiftSchedule" ADD CONSTRAINT "ShiftSchedule_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ShiftSwapHistory" (
    "id" TEXT NOT NULL,
    "fromEmployeeId" TEXT NOT NULL,
    "toEmployeeId" TEXT NOT NULL,
    "shiftScheduleId" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftSwapHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftSwapHistory_fromEmployeeId_idx" ON "ShiftSwapHistory"("fromEmployeeId");
CREATE INDEX "ShiftSwapHistory_toEmployeeId_idx" ON "ShiftSwapHistory"("toEmployeeId");
CREATE INDEX "ShiftSwapHistory_shiftScheduleId_idx" ON "ShiftSwapHistory"("shiftScheduleId");
CREATE INDEX "ShiftSwapHistory_approvedBy_idx" ON "ShiftSwapHistory"("approvedBy");

-- AddForeignKey
ALTER TABLE "ShiftSwapHistory" ADD CONSTRAINT "ShiftSwapHistory_fromEmployeeId_fkey" FOREIGN KEY ("fromEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShiftSwapHistory" ADD CONSTRAINT "ShiftSwapHistory_toEmployeeId_fkey" FOREIGN KEY ("toEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShiftSwapHistory" ADD CONSTRAINT "ShiftSwapHistory_shiftScheduleId_fkey" FOREIGN KEY ("shiftScheduleId") REFERENCES "ShiftSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShiftSwapHistory" ADD CONSTRAINT "ShiftSwapHistory_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
