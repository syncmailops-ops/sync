import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authGuard } from "../../middleware/authGuard.js";
import { roleGuard } from "../../middleware/roleGuard.js";
import * as applicationsService from "./applications.service.js";
import { applySchema, updateStatusSchema } from "./applications.schemas.js";

export async function applicationRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get("/applications/mine", { preHandler: [authGuard, roleGuard("CREATOR")] }, async (request, reply) => {
    const data = await applicationsService.listMyApplications(request.user!.id);
    return reply.send({ data, message: "OK" });
  });

  app.post<{ Params: { id: string } }>(
    "/:id/applications",
    { preHandler: [authGuard, roleGuard("CREATOR")] },
    async (request, reply) => {
      const body = applySchema.parse(request.body);
      const data = await applicationsService.apply(
        request.params.id,
        request.user!.id,
        body
      );
      return reply.status(201).send({ data, message: "Applied" });
    }
  );

  app.get<{ Params: { id: string } }>(
    "/:id/applications",
    { preHandler: [authGuard, roleGuard("BRAND", "ORGANISER")] },
    async (request, reply) => {
      const data = await applicationsService.listByCampaign(
        request.params.id,
        request.user!.id
      );
      return reply.send({ data, message: "OK" });
    }
  );

  app.get<{ Params: { id: string } }>(
    "/:id/applications/mine",
    { preHandler: [authGuard, roleGuard("CREATOR")] },
    async (request, reply) => {
      const data = await applicationsService.getMyApplication(
        request.params.id,
        request.user!.id
      );
      return reply.send({ data, message: "OK" });
    }
  );

  app.put<{ Params: { id: string; appId: string } }>(
    "/:id/applications/:appId",
    { preHandler: [authGuard, roleGuard("BRAND", "ORGANISER")] },
    async (request, reply) => {
      const body = updateStatusSchema.parse(request.body);
      const data = await applicationsService.updateStatus(
        request.params.id,
        request.params.appId,
        request.user!.id,
        body
      );
      return reply.send({ data, message: "Updated" });
    }
  );
}
