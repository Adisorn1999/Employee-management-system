import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/role.middleware";
import {
  createFinanceAccount,
  createFinanceDefinition,
  createFinanceTemplate,
  deleteFinanceAccount,
  deleteFinanceDefinition,
  deleteFinanceTemplate,
  getFinanceAccount,
  getFinanceTemplate,
  listFinanceAccounts,
  listFinanceDefinitions,
  listFinanceTemplates,
  resolveFinanceTemplate,
  updateFinanceAccount,
  updateFinanceDefinition,
  updateFinanceTemplate,
} from "./finance.controller";

const router = Router();

router.use(requireAuth);

router.get("/accounts", requirePermission("finance.read"), listFinanceAccounts);
router.post("/accounts", requirePermission("finance.create"), createFinanceAccount);
router.get("/accounts/:id", requirePermission("finance.read"), getFinanceAccount);
router.patch("/accounts/:id", requirePermission("finance.update"), updateFinanceAccount);
router.delete("/accounts/:id", requirePermission("finance.delete"), deleteFinanceAccount);

router.get("/templates/resolve", requirePermission("finance.template.read"), resolveFinanceTemplate);
router.get("/templates", requirePermission("finance.template.read"), listFinanceTemplates);
router.post("/templates", requirePermission("finance.template.update"), createFinanceTemplate);
router.get("/templates/:id", requirePermission("finance.template.read"), getFinanceTemplate);
router.patch("/templates/:id", requirePermission("finance.template.update"), updateFinanceTemplate);
router.delete("/templates/:id", requirePermission("finance.template.update"), deleteFinanceTemplate);

router.get("/field-definitions", requirePermission("finance.template.read"), listFinanceDefinitions);
router.post("/field-definitions", requirePermission("finance.template.update"), createFinanceDefinition);
router.patch("/field-definitions/:id", requirePermission("finance.template.update"), updateFinanceDefinition);
router.delete("/field-definitions/:id", requirePermission("finance.template.update"), deleteFinanceDefinition);

export default router;
