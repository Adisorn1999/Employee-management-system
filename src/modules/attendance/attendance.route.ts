import { Router } from "express";

import { listAttendance } from "./attendance.controller";

const router = Router();

router.get("/", listAttendance);

export default router;
