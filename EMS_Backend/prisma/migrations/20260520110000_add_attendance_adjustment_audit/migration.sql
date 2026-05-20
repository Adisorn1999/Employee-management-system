ALTER TABLE "Attendance"
ADD COLUMN "updatedBy" TEXT,
ADD COLUMN "adjustmentReason" TEXT;

CREATE INDEX "Attendance_updatedBy_idx" ON "Attendance"("updatedBy");
