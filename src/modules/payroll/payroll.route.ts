import { Router } from "express";

import { listPayroll } from "./payroll.controller";

const router = Router();

router.get("/", listPayroll);

export default router;
