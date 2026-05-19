import { Router } from "express";

import { listShifts } from "./shift.controller";

const router = Router();

router.get("/", listShifts);

export default router;
