import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authGuard } from "../../middleware/authGuard.js";
import { roleGuard } from "../../middleware/roleGuard.js";
import * as adminService from "./admin.service.js";
import { listUsersSchema, updateUserStatusSchema, resolveDisputeSchema } from "./admin.schemas.js";

export async function adminRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get(
    "/users",
    { preHandler: [authGuard, roleGuard("ADMIN")] },
    async (request, reply) => {
      const query = listUsersSchema.parse(request.query);
      const data = await adminService.listUsers(query);
      return reply.send({ data, message: "OK" });
    }
  );

  app.put<{ Params: { id: string } }>(
    "/users/:id/status",
    { preHandler: [authGuard, roleGuard("ADMIN")] },
    async (request, reply) => {
      const body = updateUserStatusSchema.parse(request.body);
      const data = await adminService.updateUserStatus(request.params.id, body);
      return reply.send({ data, message: "Updated" });
    }
  );

  app.get(
    "/disputes",
    { preHandler: [authGuard, roleGuard("ADMIN")] },
    async (request, reply) => {
      const data = await adminService.listDisputes();
      return reply.send({ data, message: "OK" });
    }
  );

  app.put<{ Params: { id: string } }>(
    "/disputes/:id",
    { preHandler: [authGuard, roleGuard("ADMIN")] },
    async (request, reply) => {
      const body = resolveDisputeSchema.parse(request.body);
      const data = await adminService.resolveDispute(
        request.params.id,
        request.user!.id,
        body
      );
      return reply.send({ data, message: "Resolved" });
    }
  );

  app.get(
    "/waitlist",
    { preHandler: [authGuard, roleGuard("ADMIN")] },
    async (request, reply) => {
      const csv = await adminService.exportWaitlistCsv();
      reply.header("Content-Type", "text/csv");
      reply.header("Content-Disposition", "attachment; filename=waitlist.csv");
      return reply.send(csv);
    }
  );
}
