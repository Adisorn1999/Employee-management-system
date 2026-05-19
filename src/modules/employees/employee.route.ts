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
import { requireRole } from "../../middleware/role.middleware";

const router = Router();

// ทุก route ต้อง login และเป็น ADMIN เท่านั้น
router.use(requireAuth, requireRole("ADMIN"));

router.get("/",          listEmployees);   // GET    /api/employees
router.get("/prefixes",  listPrefixes);    // GET    /api/employees/prefixes
router.get("/:id",       getEmployee);     // GET    /api/employees/:id
router.post("/",         createEmployee);  // POST   /api/employees
router.patch("/:id",     updateEmployee);  // PATCH  /api/employees/:id
router.delete("/:id",    deleteEmployee);  // DELETE /api/employees/:id

export default router;
