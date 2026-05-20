import { Router } from "express";

import {
  createEmployee,
  deleteEmployee,
  getEmployee,
  listEmployees,
  listPrefixes,
  updateEmployee,
} from "./employee.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/role.middleware";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission("employee.read"), listEmployees);
router.get("/prefixes", requirePermission("employee.read"), listPrefixes);
router.get("/:id", requirePermission("employee.read"), getEmployee);
router.post("/", requirePermission("employee.create"), createEmployee);
router.patch("/:id", requirePermission("employee.update"), updateEmployee);
router.delete("/:id", requirePermission("employee.delete"), deleteEmployee);

export default router;
