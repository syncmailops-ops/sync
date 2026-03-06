import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getRedis } from "../redis.js";

const WINDOW_MS = 60 * 1000; // 1 min
const MAX_REQUESTS = 100;
const KEY_PREFIX = "ratelimit:";

export async function rateLimiter(
  app: FastifyInstance,
  _opts: { redisUrl: string }
): Promise<void> {
  const redis = getRedis();
  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const ip = request.ip ?? (Array.isArray(request.headers["x-forwarded-for"]) ? request.headers["x-forwarded-for"][0] : request.headers["x-forwarded-for"]) ?? "unknown";
    const key = `${KEY_PREFIX}${String(ip)}`;
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    try {
      await redis.zremrangebyscore(key, 0, windowStart);
      const count = await redis.zcard(key);
      if (count >= MAX_REQUESTS) {
        await reply.status(429).send({
          error: "TooManyRequests",
          message: "Rate limit exceeded. Try again later.",
          statusCode: 429,
        });
        return;
      }
      await redis.zadd(key, now, `${now}-${Math.random()}`);
      await redis.pexpire(key, WINDOW_MS);
    } catch (err) {
      request.log.warn({ err }, "Rate limiter Redis error, allowing request");
    }
  });
}
