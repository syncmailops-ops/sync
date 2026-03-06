import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authGuard } from "../../middleware/authGuard.js";
import * as referralService from "./referrals.service.js";

export async function referralRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get("/my-code", { preHandler: [authGuard] }, async (request, reply) => {
    const data = await referralService.getMyCode(request.user!.id);
    return reply.send({ data, message: "OK" });
  });

  app.get("/stats", { preHandler: [authGuard] }, async (request, reply) => {
    const data = await referralService.getStats(request.user!.id);
    return reply.send({ data, message: "OK" });
  });
}
