import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authGuard } from "../../middleware/authGuard.js";
import { roleGuard } from "../../middleware/roleGuard.js";
import * as deliverablesService from "./deliverables.service.js";
import { submitDeliverableSchema, updateDeliverableStatusSchema } from "./deliverables.schemas.js";

export async function deliverableRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.post<{ Params: { id: string } }>(
    "/:id/deliverables",
    { preHandler: [authGuard, roleGuard("CREATOR")] },
    async (request, reply) => {
      const body = submitDeliverableSchema.parse(request.body);
      const data = await deliverablesService.submitDeliverable(
        request.params.id,
        request.user!.id,
        body
      );
      return reply.status(201).send({ data, message: "Deliverable submitted" });
    }
  );

  app.get<{ Params: { id: string } }>(
    "/:id/deliverables",
    { preHandler: [authGuard] },
    async (request, reply) => {
      const data = await deliverablesService.listDeliverables(
        request.params.id,
        request.user!.id
      );
      return reply.send({ data, message: "OK" });
    }
  );

  app.put<{ Params: { id: string; dId: string } }>(
    "/:id/deliverables/:dId",
    { preHandler: [authGuard, roleGuard("BRAND", "ORGANISER")] },
    async (request, reply) => {
      const body = updateDeliverableStatusSchema.parse(request.body);
      const data = await deliverablesService.updateDeliverableStatus(
        request.params.id,
        request.params.dId,
        request.user!.id,
        body
      );
      return reply.send({ data, message: "Updated" });
    }
  );
}
