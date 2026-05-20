import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/role.middleware";
import {
  createSchedule,
  createShift,
  createSwap,
  deleteShift,
  getShift,
  listEmployeeSchedules,
  listSchedules,
  listShifts,
  updateShift,
} from "./shift.controller";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission("shift.read"), listShifts);
router.post("/", requirePermission("shift.create"), createShift);

router.get("/schedules", requirePermission("shift.read"), listSchedules);
router.post("/schedules", requirePermission("shift.create"), createSchedule);
router.get("/schedules/:employeeId", requirePermission("shift.read"), listEmployeeSchedules);

router.post("/swap", requirePermission("shift.update"), createSwap);

router.get("/:id", requirePermission("shift.read"), getShift);
router.patch("/:id", requirePermission("shift.update"), updateShift);
router.delete("/:id", requirePermission("shift.delete"), deleteShift);

export default router;
