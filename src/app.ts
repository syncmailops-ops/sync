import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { getEnv } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { userRoutes } from "./modules/users/users.routes.js";
import { campaignRoutes } from "./modules/campaigns/campaigns.routes.js";
import { applicationRoutes } from "./modules/applications/applications.routes.js";
import { contractRoutes } from "./modules/contracts/contracts.routes.js";
import { deliverableRoutes } from "./modules/deliverables/deliverables.routes.js";
import { escrowRoutes } from "./modules/escrow/escrow.routes.js";
import { referralRoutes } from "./modules/referrals/referrals.routes.js";
import { notificationRoutes } from "./modules/notifications/notifications.routes.js";
import { analyticsRoutes } from "./modules/analytics/analytics.routes.js";
import { adminRoutes } from "./modules/admin/admin.routes.js";
import { waitlistRoutes } from "./modules/waitlist/waitlist.routes.js";

export async function buildApp() {
  const env = getEnv();
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      transport:
        env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      const allowed = env.FRONTEND_URL;
      if (!origin || origin === allowed || env.NODE_ENV === "development") {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
    credentials: true,
  });
  await app.register(cookie, { secret: env.JWT_REFRESH_SECRET });

  app.setErrorHandler(errorHandler);
  await app.register(rateLimiter, { redisUrl: env.REDIS_URL });

  app.get("/health", async (_request, reply) => {
    return reply.send({ ok: true, service: "sync-api" });
  });

  // Public
  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(waitlistRoutes, { prefix: "/api/waitlist" });

  // Protected (authGuard/roleGuard applied per route)
  app.register(userRoutes, { prefix: "/api/profile" });
  app.register(applicationRoutes, { prefix: "/api/campaigns" });
  app.register(campaignRoutes, { prefix: "/api/campaigns" });
  app.register(contractRoutes, { prefix: "/api/contracts" });
  app.register(deliverableRoutes, { prefix: "/api/contracts" });
  app.register(escrowRoutes, { prefix: "/api/escrow" });
  app.register(referralRoutes, { prefix: "/api/referrals" });
  app.register(notificationRoutes, { prefix: "/api/notifications" });
  app.register(analyticsRoutes, { prefix: "/api/analytics" });
  app.register(adminRoutes, { prefix: "/api/admin" });

  return app;
}
