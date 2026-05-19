import { Router } from "express";
import rateLimit from "express-rate-limit";
import { RedisReply, RedisStore } from "rate-limit-redis";

import { redis } from "../../config/redis";
import { login, logout, logoutAll, me, profile, refresh, register } from "./auth.controller";
import { requireAuth } from "../../middleware/auth.middleware";

const router = Router();

const loginRateLimit = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args as [string, ...string[]]) as Promise<RedisReply>,
  }),
  windowMs: 15 * 60 * 1000,
  limit: 5,
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

export default router;
