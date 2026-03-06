import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authGuard } from "../../middleware/authGuard.js";
import * as contractsService from "./contracts.service.js";
import { createContractSchema } from "./contracts.schemas.js";

export async function contractRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.post(
    "/",
    { preHandler: [authGuard] },
    async (request, reply) => {
      const body = createContractSchema.parse(request.body);
      const data = await contractsService.createContract(request.user!.id, body);
      return reply.status(201).send({ data, message: "Contract created" });
    }
  );

  app.get<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [authGuard] },
    async (request, reply) => {
      const data = await contractsService.getContractById(
        request.params.id,
        request.user!.id
      );
      return reply.send({ data, message: "OK" });
    }
  );

  app.post<{ Params: { id: string } }>(
    "/:id/sign",
    { preHandler: [authGuard] },
    async (request, reply) => {
      const data = await contractsService.signContract(
        request.params.id,
        request.user!.id
      );
      return reply.send({ data, message: "Signed" });
    }
  );

  app.get<{ Params: { id: string } }>(
    "/:id/pdf",
    { preHandler: [authGuard] },
    async (request, reply) => {
      const data = await contractsService.getContractPdfUrl(
        request.params.id,
        request.user!.id
      );
      return reply.send({ data, message: "OK" });
    }
  );
}
