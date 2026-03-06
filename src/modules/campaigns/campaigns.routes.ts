import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authGuard } from "../../middleware/authGuard.js";
import { roleGuard } from "../../middleware/roleGuard.js";
import * as campaignsService from "./campaigns.service.js";
import { listCampaignsSchema, createCampaignSchema, updateCampaignSchema } from "./campaigns.schemas.js";

export async function campaignRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get("/", async (request, reply) => {
    const query = listCampaignsSchema.parse(request.query);
    const data = await campaignsService.listCampaigns(query);
    return reply.send({ data, message: "OK" });
  });

  app.get("/recommended", { preHandler: [authGuard] }, async (request, reply) => {
    const data = await campaignsService.getRecommendedForCreator(request.user!.id, 10);
    return reply.send({ data, message: "OK" });
  });

  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const data = await campaignsService.getCampaignById(request.params.id);
    return reply.send({ data, message: "OK" });
  });

  app.post(
    "/",
    { preHandler: [authGuard, roleGuard("BRAND", "ORGANISER")] },
    async (request, reply) => {
      const body = createCampaignSchema.parse(request.body);
      const data = await campaignsService.createCampaign(request.user!.id, body);
      return reply.status(201).send({ data, message: "Campaign created" });
    }
  );

  app.put<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [authGuard, roleGuard("BRAND", "ORGANISER")] },
    async (request, reply) => {
      const body = updateCampaignSchema.parse(request.body);
      const data = await campaignsService.updateCampaign(
        request.params.id,
        request.user!.id,
        body
      );
      return reply.send({ data, message: "Updated" });
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [authGuard, roleGuard("BRAND", "ORGANISER")] },
    async (request, reply) => {
      await campaignsService.closeCampaign(request.params.id, request.user!.id);
      return reply.send({ message: "Campaign closed" });
    }
  );
}
