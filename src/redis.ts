import Redis from "ioredis";
import { getEnv } from "./config/env.js";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(getEnv().REDIS_URL);
  }
  return redis;
}
