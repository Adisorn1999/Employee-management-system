import { Router } from "express";

import { listAuditLogs } from "./audit.controller";

const router = Router();

router.get("/", listAuditLogs);

export default router;
