import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/role.middleware";
import {
  checkIn,
  checkOut,
  listAttendance,
  listEmployeeAttendance,
  listTodayAttendance,
} from "./attendance.controller";

const router = Router();

router.use(requireAuth);

router.post("/check-in", requirePermission("attendance.create"), checkIn);
router.post("/check-out", requirePermission("attendance.update"), checkOut);
router.get("/", requirePermission("attendance.read"), listAttendance);
router.get("/today", requirePermission("attendance.read"), listTodayAttendance);
router.get("/:employeeId", requirePermission("attendance.read"), listEmployeeAttendance);

export default router;
