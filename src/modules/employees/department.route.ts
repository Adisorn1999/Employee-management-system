import { Router } from "express";

import {
  createDepartment,
  deleteDepartment,
  getDepartment,
  listDepartments,
  updateDepartment,
} from "./department.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/role.middleware";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission("employee.read"), listDepartments);
router.get("/:id", requirePermission("employee.read"), getDepartment);
router.post("/", requirePermission("employee.create"), createDepartment);
router.patch("/:id", requirePermission("employee.update"), updateDepartment);
router.delete("/:id", requirePermission("employee.delete"), deleteDepartment);

export default router;
