import Redis from "ioredis";

const redisOptions = {
  maxRetriesPerRequest: 1,
  enableReadyCheck: true,
};

export const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, redisOptions)
  : new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: Number(process.env.REDIS_PORT || 6379),
      ...redisOptions,
    });
