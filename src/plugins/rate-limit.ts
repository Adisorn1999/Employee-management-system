import rateLimit from "express-rate-limit";
import { RedisReply, RedisStore } from "rate-limit-redis";

import { redis } from "../config/redis";

const store = new RedisStore({
  sendCommand: (...args: string[]) => redis.call(...args as [string, ...string[]]) as Promise<RedisReply>,
});

export const loginRateLimit = rateLimit({
  store,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again later." },
});
