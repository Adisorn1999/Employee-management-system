CREATE TYPE "ShiftScheduleDayType" AS ENUM ('WORKDAY', 'OFF', 'MONTHLY_OFF', 'HOLIDAY', 'LEAVE', 'ROTATION_OFF');
CREATE TYPE "ShiftScheduleSource" AS ENUM ('DEFAULT_SHIFT', 'MANUAL', 'MONTHLY_PLAN', 'SHIFT_CHANGE', 'EMERGENCY_OVERRIDE');

ALTER TABLE "Employee" ADD COLUMN "defaultShiftId" TEXT;

ALTER TABLE "ShiftSchedule" ALTER COLUMN "shiftId" DROP NOT NULL;
ALTER TABLE "ShiftSchedule" ADD COLUMN "dayType" "ShiftScheduleDayType" NOT NULL DEFAULT 'WORKDAY';
ALTER TABLE "ShiftSchedule" ADD COLUMN "source" "ShiftScheduleSource" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "ShiftSchedule" ADD COLUMN "reason" TEXT;
ALTER TABLE "ShiftSchedule" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "ShiftSchedule" ADD COLUMN "approvedBy" TEXT;

UPDATE "ShiftSchedule"
SET "createdBy" = "assignedBy"
WHERE "createdBy" IS NULL;

CREATE INDEX "Employee_defaultShiftId_idx" ON "Employee"("defaultShiftId");
CREATE INDEX "ShiftSchedule_dayType_idx" ON "ShiftSchedule"("dayType");
CREATE INDEX "ShiftSchedule_source_idx" ON "ShiftSchedule"("source");
CREATE INDEX "ShiftSchedule_createdBy_idx" ON "ShiftSchedule"("createdBy");
CREATE INDEX "ShiftSchedule_approvedBy_idx" ON "ShiftSchedule"("approvedBy");

ALTER TABLE "Employee" ADD CONSTRAINT "Employee_defaultShiftId_fkey" FOREIGN KEY ("defaultShiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "name", "description", "created_at", "updated_at")
VALUES ('permission_shift_change', 'shift.change', 'Change employee shift schedules', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description", "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT roles."id", permissions."id"
FROM "roles"
JOIN "permissions" ON permissions."name" = 'shift.change'
WHERE roles."name" IN ('super_admin', 'admin')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
