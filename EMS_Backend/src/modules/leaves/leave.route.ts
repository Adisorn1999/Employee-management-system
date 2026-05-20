import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/role.middleware";
import { approveLeave, cancelLeave, createLeave, getLeave, listLeaves, rejectLeave, updateLeave } from "./leave.controller";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission("leave.read"), listLeaves);
router.post("/", requirePermission("leave.create"), createLeave);
router.get("/:id", requirePermission("leave.read"), getLeave);
router.patch("/:id", requirePermission("leave.update"), updateLeave);
router.post("/:id/approve", requirePermission("leave.approve"), approveLeave);
router.post("/:id/reject", requirePermission("leave.reject"), rejectLeave);
router.post("/:id/cancel", requirePermission("leave.cancel"), cancelLeave);

export default router;
