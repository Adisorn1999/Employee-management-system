import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/role.middleware";
import { approveOffDay, cancelOffDay, createOffDay, getOffDay, listOffDays, rejectOffDay, updateOffDay } from "./off-day.controller";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission("offday.read"), listOffDays);
router.post("/", requirePermission("offday.create"), createOffDay);
router.get("/:id", requirePermission("offday.read"), getOffDay);
router.patch("/:id", requirePermission("offday.update"), updateOffDay);
router.post("/:id/approve", requirePermission("offday.approve"), approveOffDay);
router.post("/:id/reject", requirePermission("offday.reject"), rejectOffDay);
router.post("/:id/cancel", requirePermission("offday.cancel"), cancelOffDay);

export default router;
