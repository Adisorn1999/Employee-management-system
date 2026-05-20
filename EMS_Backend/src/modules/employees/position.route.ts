import { Router } from "express";

import {
  createPosition,
  deletePosition,
  getPosition,
  listPositions,
  updatePosition,
} from "./position.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/role.middleware";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission("employee.read"), listPositions);
router.get("/:id", requirePermission("employee.read"), getPosition);
router.post("/", requirePermission("employee.create"), createPosition);
router.patch("/:id", requirePermission("employee.update"), updatePosition);
router.delete("/:id", requirePermission("employee.delete"), deletePosition);

export default router;
