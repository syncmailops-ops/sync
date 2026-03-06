import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authGuard } from "../../middleware/authGuard.js";
import { prisma } from "../../db/client.js";

export async function notificationRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get("/", { preHandler: [authGuard] }, async (request, reply) => {
    const limit = Math.min(Number((request.query as { limit?: string }).limit) || 20, 50);
    const notifications = await prisma.notification.findMany({
      where: { userId: request.user!.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return reply.send({ data: notifications, message: "OK" });
  });

  app.put<{ Params: { id: string } }>("/:id/read", { preHandler: [authGuard] }, async (request, reply) => {
    await prisma.notification.updateMany({
      where: { id: request.params.id, userId: request.user!.id },
      data: { isRead: true },
    });
    return reply.send({ message: "Marked as read" });
  });

  app.put("/read-all", { preHandler: [authGuard] }, async (request, reply) => {
    await prisma.notification.updateMany({
      where: { userId: request.user!.id },
      data: { isRead: true },
    });
    return reply.send({ message: "All marked as read" });
  });
}
