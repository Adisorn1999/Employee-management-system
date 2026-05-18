import rateLimit from "express-rate-limit";
import Redis from "ioredis";
import { RedisReply, RedisStore } from "rate-limit-redis";

let store: RedisStore | undefined;

if (process.env.REDIS_URL) {
  const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
  });

  store = new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args as [string, ...string[]]) as Promise<RedisReply>,
  });
}

export const loginRateLimit = rateLimit({
  store,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again later." },
});
