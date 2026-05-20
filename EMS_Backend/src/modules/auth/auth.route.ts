import { Router } from "express";
import rateLimit from "express-rate-limit";
import { RedisReply, RedisStore } from "rate-limit-redis";

import { redis } from "../../config/redis";
import { login, logout, logoutAll, me, profile, refresh, register } from "./auth.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission, requireRole } from "../../middleware/role.middleware";

const router = Router();

const loginRateLimit = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args as [string, ...string[]]) as Promise<RedisReply>,
  }),
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "development" ? 1000 : 5,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again later." },
});

router.post("/register", register);
router.post("/login", loginRateLimit, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/logout-all", requireAuth, logoutAll);
router.get("/me", requireAuth, me);
router.get("/profile", requireAuth, profile);
router.get("/admin-only", requireAuth, requireRole("admin", "super_admin"), (_req, res) => {
  res.status(200).json({ message: "Admin access granted" });
});
router.get("/permission-test", requireAuth, requirePermission("employee.read"), (_req, res) => {
  res.status(200).json({ message: "Permission access granted" });
});

export default router;
