import { Router } from "express";

import { login, logout, profile, refresh, register } from "./auth.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { loginRateLimit } from "../../plugins/rate-limit";

const router = Router();

router.post("/register", register);
router.post("/login", loginRateLimit, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/profile", requireAuth, profile);

export default router;
