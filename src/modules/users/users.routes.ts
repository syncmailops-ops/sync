import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authGuard } from "../../middleware/authGuard.js";
import * as usersService from "./users.service.js";
import { updateProfileSchema, avatarSchema, kycSchema } from "./users.schemas.js";

export async function userRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get("/me", { preHandler: [authGuard] }, async (request, reply) => {
    const data = await usersService.getMe(request.user!.id);
    return reply.send({ data, message: "OK" });
  });

  app.put("/me", { preHandler: [authGuard] }, async (request, reply) => {
    const body = updateProfileSchema.parse(request.body);
    const data = await usersService.updateMe(request.user!.id, body);
    return reply.send({ data, message: "Updated" });
  });

  app.post("/me/avatar", { preHandler: [authGuard] }, async (request, reply) => {
    const body = avatarSchema.parse(request.body);
    const data = await usersService.getPresignedAvatarUrl(
      request.user!.id,
      body.contentType,
      body.key
    );
    return reply.send({ data, message: "Use uploadUrl to upload file, then PATCH /me with avatarUrl key" });
  });

  app.post("/me/avatar/confirm", { preHandler: [authGuard] }, async (request, reply) => {
    const body = avatarSchema.parse(request.body);
    const data = await usersService.setAvatarUrl(request.user!.id, body.key);
    return reply.send({ data, message: "Avatar set" });
  });

  app.post("/me/kyc", { preHandler: [authGuard] }, async (request, reply) => {
    const body = kycSchema.parse(request.body);
    const data = await usersService.submitKyc(request.user!.id, body.docKey, body.docType);
    return reply.send({ data, message: data.message });
  });

  app.get<{ Params: { userId: string } }>("/:userId", async (request, reply) => {
    const data = await usersService.getPublicProfile(request.params.userId);
    return reply.send({ data, message: "OK" });
  });
}
