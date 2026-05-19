import { Router } from "express";

import { listHolidays } from "./holiday.controller";

const router = Router();

router.get("/", listHolidays);

export default router;
