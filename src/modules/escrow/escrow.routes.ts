import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authGuard } from "../../middleware/authGuard.js";
import { roleGuard } from "../../middleware/roleGuard.js";
import * as escrowService from "./escrow.service.js";

export async function escrowRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.post(
    "/create",
    { preHandler: [authGuard, roleGuard("BRAND", "ORGANISER")] },
    async (request, reply) => {
      const body = (request.body as { contractId: string });
      if (!body?.contractId || typeof body.contractId !== "string") {
        return reply.status(400).send({ error: "contractId required" });
      }
      const data = await escrowService.createRazorpayOrder(body.contractId, request.user!.id);
      return reply.send({ data, message: "Order created" });
    }
  );

  app.post(
    "/webhook",
    async (request, reply) => {
      const signature = request.headers["x-razorpay-signature"] as string | undefined;
      if (!signature) {
        return reply.status(400).send({ error: "Missing signature" });
      }
      const rawBody = (request as unknown as { rawBody?: string }).rawBody ?? JSON.stringify(request.body);
      if (!escrowService.verifyWebhookSignature(rawBody, signature)) {
        return reply.status(400).send({ error: "Invalid signature" });
      }
      const body = request.body as { event: string; payload?: { payment?: { entity?: { id: string; order_id: string } } } };
      if (body.event === "payment.captured" && body.payload?.payment?.entity) {
        const payment = body.payload.payment.entity;
        await escrowService.handlePaymentCaptured(payment.id, payment.order_id);
      }
      return reply.send({ received: true });
    }
  );

  app.post<{ Params: { id: string } }>(
    "/:id/release",
    { preHandler: [authGuard] },
    async (request, reply) => {
      const data = await escrowService.releaseEscrow(request.params.id, request.user!.id);
      return reply.send({ data, message: "Released" });
    }
  );

  app.post<{ Params: { id: string } }>(
    "/:id/refund",
    { preHandler: [authGuard, roleGuard("ADMIN")] },
    async (request, reply) => {
      const data = await escrowService.refundEscrow(request.params.id, request.user!.id);
      return reply.send({ data, message: "Refunded" });
    }
  );
}
