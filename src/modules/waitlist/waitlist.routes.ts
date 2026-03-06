import { FastifyInstance, FastifyPluginOptions } from "fastify";
import * as waitlistService from "./waitlist.service.js";
import { joinWaitlistSchema } from "./waitlist.schemas.js";

export async function waitlistRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.post("/", async (request, reply) => {
    const body = joinWaitlistSchema.parse(request.body);
    const data = await waitlistService.join(body);
    return reply.status(201).send({ data, message: data.message });
  });
}
