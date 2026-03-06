import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authGuard } from "../../middleware/authGuard.js";
import { roleGuard } from "../../middleware/roleGuard.js";
import * as analyticsService from "./analytics.service.js";

export async function analyticsRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get("/creator", { preHandler: [authGuard, roleGuard("CREATOR")] }, async (request, reply) => {
    const data = await analyticsService.getCreatorAnalytics(request.user!.id);
    return reply.send({ data, message: "OK" });
  });

  app.get("/brand", { preHandler: [authGuard, roleGuard("BRAND", "ORGANISER")] }, async (request, reply) => {
    const data = await analyticsService.getBrandAnalytics(request.user!.id);
    return reply.send({ data, message: "OK" });
  });

  app.get("/admin", { preHandler: [authGuard, roleGuard("ADMIN")] }, async (request, reply) => {
    const data = await analyticsService.getAdminAnalytics();
    return reply.send({ data, message: "OK" });
  });
}
